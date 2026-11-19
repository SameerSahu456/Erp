import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface UseUnsavedChangesGuardArgs {
  /** True when the form has unsaved edits. */
  isDirty: boolean
  /**
   * Optional cleanup that runs when the user confirms "Discard changes".
   * Use for clearing local validation state or pending uploads.
   */
  onDiscard?: () => void
}

export interface UnsavedChangesGuard {
  /** Bound to the dialog's `open` state. */
  dialogOpen: boolean
  /** Bound to the dialog's `onOpenChange` — closes cleanly when the user picks "Stay". */
  onDialogOpenChange: (open: boolean) => void
  /** "Discard changes" button handler. Runs the pending action and the onDiscard cleanup. */
  onConfirmDiscard: () => void
  /**
   * Wrap any in-app navigation action (Cancel button, manual `navigate(-1)`, etc.).
   * If the form is clean, the action runs immediately. If dirty, the dialog is shown
   * and the action is queued to run only if the user picks "Discard changes".
   */
  attempt: (action: () => void) => void
  /**
   * Synchronously flip the guard's internal `isDirty` view to `false`, with no
   * dialog and no extra navigation step. Call this BEFORE a programmatic
   * navigate-away that follows a successful save — the popstate listener
   * triggered by `navigate(-1)` fires synchronously in Chromium and would
   * otherwise see the stale ref (still `true`) because the React state
   * update from `form.reset()` only updates the ref on the next render.
   *
   * The flip is one-shot: the very next render rehydrates `isDirtyRef` from
   * the prop's value, so future edits restore guarding automatically.
   */
  bypassOnce: () => void
  /**
   * Pop the sentinel history entry the guard pushed while dirty, if it's
   * still on top. Resolves after the browser fires `popstate`, so the
   * caller's next `navigate(url, { replace: true })` swaps the form's own
   * URL (not the sentinel) — without this, the form URL stays in history
   * and Back from the success page lands on the (now-empty) form.
   *
   * Safe to call when there's no sentinel: it resolves immediately. Pair
   * with `bypassOnce()` to suppress the dialog while popping.
   */
  popSentinelIfPresent: () => Promise<void>
}

const SENTINEL_STATE = { __unsavedGuardSentinel: true } as const

function isSentinel(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as { __unsavedGuardSentinel?: boolean }).__unsavedGuardSentinel === true
  )
}

/**
 * Guard against losing unsaved form edits across:
 *   - browser refresh / tab-close / external navigation  → native `beforeunload` prompt
 *   - browser back / forward                              → custom dialog via popstate sentinel
 *   - in-app `<Link>` clicks (sidebar, breadcrumb, etc.)  → captured-phase click listener
 *   - Cancel button or any other in-app action passed to `attempt()`
 *
 * `useBlocker` isn't available here (the app uses component-mode `<BrowserRouter>`),
 * so we intercept link clicks at the DOM level and re-fire the navigation through
 * `useNavigate` after the user confirms. New-tab modifier-clicks, external URLs,
 * `target="_blank"`, and `download` links are deliberately allowed through.
 */
export function useUnsavedChangesGuard({
  isDirty,
  onDiscard,
}: UseUnsavedChangesGuardArgs): UnsavedChangesGuard {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)
  // True when the queued intent is "the browser Back the user just pressed"
  // rather than a callable action. Kept separate from `pendingActionRef`
  // because that case needs a single combined history traversal, not a
  // function call — see `onConfirmDiscard`.
  const pendingHistoryExitRef = useRef(false)
  const isDirtyRef = useRef(isDirty)
  // Sync the ref via effect, NOT inline on every render. `onConfirmDiscard`
  // flips this ref to false manually to suppress the popstate handler during
  // the navigation it kicks off; if we re-synced inline, the very next
  // render (caused by `setDialogOpen(false)`) would clobber it back to true
  // and the dialog would loop.
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // beforeunload: covers refresh, tab close, and any non-SPA navigation.
  // The text is browser-controlled per spec — we can only trigger the prompt.
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // SPA click interceptor — `<Link>` and any plain `<a href="/...">` inside
  // the app: when dirty, swallow the click and show the dialog instead. The
  // pending action runs `navigate(href)` so the SPA router takes over after
  // confirm. Skipped for new-tab, modified-key, and external links.
  useEffect(() => {
    if (!isDirty) return
    const onClick = (event: MouseEvent) => {
      // Only plain left-click without modifiers — let cmd/ctrl/shift/alt
      // + click pass through (open in new tab/window).
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as Element | null)?.closest?.('a[href]')
      if (!anchor) return
      // Respect target="_blank" / download attributes — those aren't
      // navigations away from the form in the same tab.
      if (anchor.getAttribute('target') === '_blank') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href') ?? ''
      // Internal SPA route only: starts with `/` and not a protocol-relative
      // URL (`//`). External absolute URLs, mailto:, tel:, #anchor are out.
      if (!href.startsWith('/') || href.startsWith('//')) return

      // No-op if the link points to the page we're already on.
      const targetPath = href.split('#')[0]
      if (targetPath === window.location.pathname) return

      event.preventDefault()
      event.stopPropagation()
      pendingActionRef.current = () => navigate(href)
      pendingHistoryExitRef.current = false
      setDialogOpen(true)
    }
    // Capture phase so we run before any descendant click handlers
    // (e.g. React Router's <Link> internal handler).
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [isDirty, navigate])

  // DetailTabs interceptor — switching tabs unmounts the inactive panel
  // and would silently lose typed-but-unsaved text in inline forms
  // (NotesSection, CommentSection, etc.). The tab buttons render with the
  // class `cpt-tab`, so intercept those when dirty and re-fire the click
  // after the user confirms discard. `replayingTabClickRef` short-circuits
  // the listener while we're dispatching the replayed click so it isn't
  // intercepted a second time.
  const replayingTabClickRef = useRef(false)
  useEffect(() => {
    if (!isDirty) return
    const onClick = (event: MouseEvent) => {
      if (replayingTabClickRef.current) return
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const tabBtn = (event.target as Element | null)?.closest?.(
        'button.cpt-tab',
      ) as HTMLButtonElement | null
      if (!tabBtn) return
      // Clicking the already-active tab is a no-op — let it through.
      if (tabBtn.classList.contains('active')) return

      event.preventDefault()
      event.stopPropagation()
      pendingHistoryExitRef.current = false
      pendingActionRef.current = () => {
        replayingTabClickRef.current = true
        tabBtn.click()
        queueMicrotask(() => {
          replayingTabClickRef.current = false
        })
      }
      setDialogOpen(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [isDirty])

  // popstate sentinel: when dirty, push a no-op entry on top so the next
  // browser-back pops that entry first and lands us back at the form. We
  // then show the dialog.
  //
  // Reload survives the sentinel: if the user reloads with a sentinel on top
  // and dismisses the native prompt with "Leave", the new document mounts
  // AT the sentinel (browsers restore the history state). Pushing another
  // sentinel in that case stacks two — Discard would only pop one, leaving
  // a second sentinel above the form and creating the "click discard twice"
  // bug. So skip the push when we're already at a sentinel, and remember
  // whether the cleanup is responsible for popping it.
  const ownSentinelRef = useRef(false)
  useEffect(() => {
    if (!isDirty) return

    if (!isSentinel(window.history.state)) {
      window.history.pushState(SENTINEL_STATE, '', window.location.href)
      ownSentinelRef.current = true
    } else {
      ownSentinelRef.current = false
    }

    const onPopState = () => {
      if (!isDirtyRef.current) return
      // The sentinel was just popped. Re-push it so the form URL still sits
      // on top, and record that the pending action is a HISTORY EXIT — the
      // browser-back the user originally asked for.
      //
      // Deliberately NOT a `() => history.back()` action: confirming would
      // then run two traversals back-to-back (one here to drop the sentinel,
      // one for the action), and the second is issued from inside a popstate
      // handler, which Chrome drops. The visible bug was Discard closing the
      // dialog and leaving you on the form. `onConfirmDiscard` now does the
      // whole thing in one `go(-2)` instead.
      window.history.pushState(SENTINEL_STATE, '', window.location.href)
      ownSentinelRef.current = true
      pendingActionRef.current = null
      pendingHistoryExitRef.current = true
      setDialogOpen(true)
    }

    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      // Only pop the sentinel if WE pushed it. A reload-survived sentinel
      // that we found here is not ours to clean up — popping it would walk
      // the user back to F-1 silently.
      if (ownSentinelRef.current && isSentinel(window.history.state)) {
        ownSentinelRef.current = false
        window.history.back()
      }
    }
  }, [isDirty])

  const onConfirmDiscard = useCallback(() => {
    const action = pendingActionRef.current
    const historyExit = pendingHistoryExitRef.current
    pendingActionRef.current = null
    pendingHistoryExitRef.current = false
    setDialogOpen(false)
    onDiscard?.()
    // Suppress the popstate handler for the upcoming navigation: the listener
    // is still attached because the React effect cleanup hasn't run yet, and
    // without this it would re-show the dialog after the user just confirmed.
    isDirtyRef.current = false

    // Browser-back case: ONE traversal that clears the sentinel AND the form
    // entry together. Two chained `history.back()` calls do not work — the
    // second one is issued from a popstate handler and Chrome ignores it, so
    // the user stayed on the form with the dialog dismissed and nothing to
    // show for it. `go(-2)` lands on the entry before the form, which is
    // exactly where Back was headed.
    if (historyExit) {
      ownSentinelRef.current = false
      if (isSentinel(window.history.state)) {
        window.history.go(-2)
      } else {
        // Sentinel already gone (e.g. popped by a cleanup): a single step is
        // all that's left to do.
        window.history.back()
      }
      return
    }

    // If the sentinel is still on top, pop it BEFORE running the action.
    // The sentinel shares the form's URL, so a `navigate(-1)` action would
    // pop the sentinel and leave the user on the form — that's the "two
    // clicks to discard" bug. Popping it ourselves first means the action's
    // own back-step actually exits the form.
    if (isSentinel(window.history.state)) {
      const onceUp = () => {
        window.removeEventListener('popstate', onceUp)
        action?.()
      }
      window.addEventListener('popstate', onceUp)
      ownSentinelRef.current = false
      window.history.back()
    } else {
      queueMicrotask(() => action?.())
    }
  }, [onDiscard])

  const onDialogOpenChange = useCallback((next: boolean) => {
    if (!next) {
      // User chose "Stay" (or pressed Escape). Drop the pending intent; keep
      // the form. The sentinel stays on top, so Back still prompts again.
      pendingActionRef.current = null
      pendingHistoryExitRef.current = false
    }
    setDialogOpen(next)
  }, [])

  const attempt = useCallback(
    (action: () => void) => {
      if (!isDirtyRef.current) {
        action()
        return
      }
      pendingActionRef.current = action
      pendingHistoryExitRef.current = false
      setDialogOpen(true)
    },
    [],
  )

  const bypassOnce = useCallback(() => {
    // One-shot synchronous override — see the interface doc. Used by
    // forms right after a successful save and before the programmatic
    // navigation that follows.
    isDirtyRef.current = false
  }, [])

  const popSentinelIfPresent = useCallback((): Promise<void> => {
    // No-op when no sentinel sits on top — keeps callers from having to
    // probe `ownSentinelRef` themselves.
    if (!ownSentinelRef.current || !isSentinel(window.history.state)) {
      return Promise.resolve()
    }
    ownSentinelRef.current = false
    return new Promise<void>((resolve) => {
      const once = () => {
        window.removeEventListener('popstate', once)
        resolve()
      }
      window.addEventListener('popstate', once)
      window.history.back()
    })
  }, [])

  return {
    dialogOpen,
    onDialogOpenChange,
    onConfirmDiscard,
    attempt,
    bypassOnce,
    popSentinelIfPresent,
  }
}
