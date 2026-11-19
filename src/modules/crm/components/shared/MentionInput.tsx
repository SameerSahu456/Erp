import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { useDebounce, useInfiniteDropdownLoader } from '@/shared/hooks'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { UI } from '@/shared/constants'
import {
  getUserDisplayName,
  useUserOptions,
  type UserListItem,
} from '@modules/users'

import { MENTION_TOKEN_RE, buildMentionToken } from '../../lib/mention-token'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

// Zero-width space (U+200B). Not user-facing copy — a layout shim that reserves
// vertical space on a trailing empty overlay line so the caret aligns. Hoisted
// to module scope so the literal-string lint doesn't flag it inside JSX.
const ZERO_WIDTH_SPACE = '​'

interface MentionInputProps {
  /** Canonical content with `@[Name](uuid)` tokens — this is what gets
   *  sent to the backend. The textarea itself displays the prettified
   *  `@Name` form; the parent never has to deal with that. */
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  className?: string
  /** Fired when the user presses Enter while the mention picker is closed.
   *  Shift+Enter always inserts a newline and never submits. Wire this to the
   *  composer's add/save handler so a comment/note posts on Enter; the handler
   *  is responsible for the empty-content guard. When omitted, Enter behaves
   *  like a normal newline. */
  onSubmit?: () => void
}

export interface MentionInputHandle {
  focus: () => void
}

// ── Projections ────────────────────────────────────────────────────────

function projectDisplay(canonical: string): {
  display: string
  mentions: Map<string, string>
} {
  const mentions = new Map<string, string>()
  const re = new RegExp(MENTION_TOKEN_RE.source, 'g')
  const display = canonical.replace(re, (_match, name: string, uuid: string) => {
    mentions.set(name, uuid)
    return `@${name}`
  })
  return { display, mentions }
}

function projectCanonical(display: string, mentions: Map<string, string>): string {
  if (mentions.size === 0) return display
  const labels = Array.from(mentions.keys()).sort((a, b) => b.length - a.length)
  let out = display
  for (const label of labels) {
    const uuid = mentions.get(label)!
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`@${escaped}(?=\\s|$|[^\\w])`, 'g')
    out = out.replace(re, buildMentionToken(label, uuid))
  }
  return out
}

// A mention query may contain spaces (people's names are usually
// `First Last`), but it must not grow without bound — once it gets longer
// than a plausible name we treat the `@` as ordinary text and close the
// picker. The user can always re-trigger with a fresh `@`.
const MENTION_QUERY_MAX_LEN = 60

function findActiveTrigger(
  displayValue: string,
  cursor: number,
  mentions: Map<string, string>,
): { start: number; query: string } | null {
  if (cursor <= 0) return null
  // Walk left to the nearest `@`. Unlike a single-token picker we do NOT
  // stop at spaces, so multi-word names keep the picker open — we only
  // bail at a line break (mentions never span lines).
  for (let i = cursor - 1; i >= 0; i -= 1) {
    const ch = displayValue[i]
    if (ch === '\n') return null
    if (ch !== '@') continue

    // `@` only triggers at the start of the field or after whitespace /
    // an opening punctuation char. A mid-word `@` (e.g. the one inside an
    // email like `john@gmail.com`) is NOT a trigger on its own — keep
    // scanning left so it stays part of the query and the user can search
    // by email address.
    if (i > 0) {
      const prev = displayValue[i - 1]
      if (prev && !/\s|[(,;:]/.test(prev)) continue
    }

    // If this `@` is the start of an already-picked mention (`@Label`
    // followed by a boundary) and the caret sits past it, the mention is
    // finished — the caret is in the text after it, not in a live query.
    for (const label of sortedLabels(mentions)) {
      const token = `@${label}`
      if (!displayValue.startsWith(token, i)) continue
      const tokenEnd = i + token.length
      const after = displayValue[tokenEnd]
      const endsAtBoundary = after === undefined || /[^\w]/.test(after)
      if (endsAtBoundary && cursor >= tokenEnd) return null
    }

    const query = displayValue.slice(i + 1, cursor)
    if (query.includes(']') || query.length > MENTION_QUERY_MAX_LEN) return null
    return { start: i, query }
  }
  return null
}

/**
 * Build a regex that matches any `@<known-label>` boundary-ended.
 * Longest labels first so `@John Doe` wins over `@John`.
 */
function buildLabelMatcher(mentions: Map<string, string>): RegExp | null {
  if (mentions.size === 0) return null
  const labels = Array.from(mentions.keys()).sort((a, b) => b.length - a.length)
  const escaped = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`@(?:${escaped.join('|')})(?=\\s|$|[^\\w])`, 'g')
}

// ── Component ──────────────────────────────────────────────────────────

/**
 * Textarea with `@`-mention picker. Surface contract:
 *   - The user sees and edits `@Display Name` text — picked names are
 *     visually highlighted with a colored pill via an overlay layer.
 *   - The parent receives canonical `@[Display Name](uuid)` content via
 *     `onChange`, ready to ship to the backend.
 *
 * Implementation: a styled overlay div sits behind a transparent
 * textarea. The textarea owns the caret + focus + resize; the overlay
 * paints the same content with mentions wrapped in styled spans. They
 * use identical typography and padding so the caret aligns perfectly.
 *
 * Backspace and Delete are intercepted to remove a mention atomically
 * when the caret sits at its boundary.
 */
export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  function MentionInput(
    { value, onChange, placeholder, rows = 3, disabled, className, onSubmit },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const overlayRef = useRef<HTMLDivElement | null>(null)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }))

    const { display: displayValue, mentions: tokenMentions } = useMemo(
      () => projectDisplay(value),
      [value],
    )

    const [sessionMentions, setSessionMentions] = useState<Map<string, string>>(
      new Map(),
    )
    const allMentions = useMemo(() => {
      const merged = new Map(tokenMentions)
      for (const [k, v] of sessionMentions) merged.set(k, v)
      return merged
    }, [tokenMentions, sessionMentions])

    const labelMatcher = useMemo(() => buildLabelMatcher(allMentions), [allMentions])

    const [open, setOpen] = useState(false)
    const [trigger, setTrigger] = useState<{ start: number; query: string } | null>(null)

    // Keyboard navigation for the picker. `activeIndex` is the highlighted
    // row; `pickerItems` mirrors the popover's currently-loaded users so the
    // textarea's keydown handler can navigate + select without the items
    // living in the child. Reported up from UserMentionPopover via
    // `handlePickerItems`.
    const [activeIndex, setActiveIndex] = useState(0)
    const [pickerItems, setPickerItems] = useState<UserListItem[]>([])
    const handlePickerItems = useCallback((items: UserListItem[]) => {
      setPickerItems(items)
      // Clamp the highlight if the freshly-loaded page is shorter than the
      // previous one (e.g. the query narrowed the matches).
      setActiveIndex((i) => (i >= items.length ? 0 : i))
    }, [])

    function syncTrigger(nextDisplay: string, cursor: number) {
      const t = findActiveTrigger(nextDisplay, cursor, allMentions)
      if (t) {
        setTrigger(t)
        setOpen(true)
      } else {
        setTrigger(null)
        setOpen(false)
        setPickerItems([])
      }
    }

    function emit(nextDisplay: string) {
      onChange(projectCanonical(nextDisplay, allMentions))
    }

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const nextDisplay = e.target.value
      emit(nextDisplay)
      // Typing into the query restarts the match list — highlight the top row.
      setActiveIndex(0)
      syncTrigger(nextDisplay, e.target.selectionStart ?? nextDisplay.length)
      // Keep the overlay scrolled in sync with the textarea — for long
      // notes the textarea can scroll internally; the overlay must follow
      // or the caret will visually misalign.
      syncOverlayScroll()
    }

    function handleSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
      const node = e.currentTarget
      syncTrigger(node.value, node.selectionStart ?? node.value.length)
    }

    function handleScroll() {
      syncOverlayScroll()
    }

    function syncOverlayScroll() {
      const t = textareaRef.current
      const o = overlayRef.current
      if (!t || !o) return
      o.scrollTop = t.scrollTop
      o.scrollLeft = t.scrollLeft
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      const pickerOpen = open && trigger !== null
      const hasItems = pickerItems.length > 0

      if (pickerOpen && e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        setTrigger(null)
        setPickerItems([])
        return
      }

      // ── Mention-picker keyboard navigation (only while it's open with
      //    at least one match). Arrows move the highlight; Tab / Enter pick
      //    the highlighted user. We preventDefault on the arrows so the
      //    textarea caret doesn't move (which would re-fire onSelect and
      //    reset the query). ──
      if (pickerOpen && hasItems) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActiveIndex((i) => (i + 1) % pickerItems.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setActiveIndex((i) => (i - 1 + pickerItems.length) % pickerItems.length)
          return
        }
        if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
          e.preventDefault()
          const user = pickerItems[Math.min(activeIndex, pickerItems.length - 1)]
          if (user) pickUser(user)
          return
        }
      }

      // ── Submit on Enter when the picker is NOT actively offering a choice.
      //    Shift+Enter always falls through to insert a newline. ──
      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        e.preventDefault()
        if (pickerOpen) {
          setOpen(false)
          setTrigger(null)
          setPickerItems([])
        }
        onSubmit()
        return
      }

      // Atomic mention delete on Backspace / Delete. Only when there's
      // no active selection (collapsed caret).
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      const node = textareaRef.current
      if (!node) return
      const start = node.selectionStart ?? 0
      const end = node.selectionEnd ?? 0
      if (start !== end) return

      if (e.key === 'Backspace') {
        // Look for a known `@<label>` ending exactly at the caret.
        const before = displayValue.slice(0, start)
        for (const label of sortedLabels(allMentions)) {
          const token = `@${label}`
          if (before.endsWith(token)) {
            e.preventDefault()
            const newDisplay =
              displayValue.slice(0, start - token.length) + displayValue.slice(start)
            emit(newDisplay)
            const newCursor = start - token.length
            window.setTimeout(() => {
              node.focus()
              node.setSelectionRange(newCursor, newCursor)
            }, 0)
            return
          }
        }
      }

      if (e.key === 'Delete') {
        // Look for a known `@<label>` starting exactly at the caret.
        const after = displayValue.slice(start)
        for (const label of sortedLabels(allMentions)) {
          const token = `@${label}`
          if (after.startsWith(token)) {
            // Only treat it as a mention if the next char is a boundary
            // (whitespace, end-of-string, or non-word punctuation).
            const next = after.charAt(token.length)
            if (next !== '' && /\w/.test(next)) continue
            e.preventDefault()
            const newDisplay =
              displayValue.slice(0, start) + after.slice(token.length)
            emit(newDisplay)
            window.setTimeout(() => {
              node.focus()
              node.setSelectionRange(start, start)
            }, 0)
            return
          }
        }
      }
    }

    function handleBlur() {
      // Microtask delay — without this an option's click registers
      // after blur and the popover dismisses before the click lands.
      window.setTimeout(() => setOpen(false), 100)
    }

    function pickUser(user: UserListItem) {
      if (!trigger) return
      const node = textareaRef.current

      // Derive the trigger's end deterministically from the trigger
      // itself — NOT from `node.selectionStart`. Clicking a popover
      // row causes a transient blur on the textarea; depending on
      // browser timing, `selectionStart` can read as 0 by the time
      // pickUser runs, which previously produced
      //   `before + insertion + slice(0)` = duplicated original content
      // (the bug that surfaced as a wide trailing selection band).
      const triggerEnd = trigger.start + 1 + trigger.query.length

      const label = getUserDisplayName(user)
      const before = displayValue.slice(0, trigger.start)
      const after = displayValue.slice(triggerEnd)
      const insertion = `@${label} `
      const nextDisplay = before + insertion + after

      const nextSession = new Map(sessionMentions).set(label, user.id)
      setSessionMentions(nextSession)

      const mergedNow = new Map(tokenMentions)
      for (const [k, v] of nextSession) mergedNow.set(k, v)
      onChange(projectCanonical(nextDisplay, mergedNow))

      setOpen(false)
      setTrigger(null)
      setPickerItems([])
      setActiveIndex(0)

      const newCursor = before.length + insertion.length
      window.setTimeout(() => {
        node?.focus()
        node?.setSelectionRange(newCursor, newCursor)
      }, 0)
    }

    // ── Overlay rendering ──
    const overlayParts = useMemo(
      () => renderHighlighted(displayValue, labelMatcher),
      [displayValue, labelMatcher],
    )

    return (
      <div className={cn('relative', className)}>
        {/* Overlay — paints the visible text. The pill backgrounds live
            here. The textarea's text on top of this is transparent. */}
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={cn(
            // Match the Textarea primitive's box exactly so the caret
            // (rendered by the real textarea) aligns over the rendered
            // chars in the overlay.
            // [overflow-wrap:anywhere] MUST match the textarea below so long
            // unbroken tokens wrap identically in both layers (caret alignment).
            'absolute inset-0 overflow-hidden whitespace-pre-wrap [overflow-wrap:anywhere]',
            'rounded-lg border border-transparent px-2.5 py-2 text-base md:text-sm',
            'pointer-events-none select-none',
            disabled && 'opacity-50',
          )}
        >
          {overlayParts}
          {/* Trailing zero-width-space — without it, an empty trailing
              line wouldn't reserve vertical space and the caret on a
              fresh newline would visually drop below the overlay. */}
          {ZERO_WIDTH_SPACE}
        </div>

        <textarea
          ref={textareaRef}
          value={displayValue}
          onChange={handleChange}
          onSelect={handleSelect}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(
            // Same box dimensions / typography as the overlay — these
            // strings MUST match the overlay's so the caret lands on the
            // right glyph.
            // Grow in height only; lock width to the container and cap height
            // at max-h-64 (then scroll — overlay stays synced via handleScroll).
            'relative z-10 flex field-sizing-content min-h-16 max-h-64 w-full max-w-full min-w-0 resize-none overflow-y-auto overflow-x-hidden [overflow-wrap:anywhere]',
            'rounded-lg border border-input bg-transparent px-2.5 py-2 text-base md:text-sm',
            'transition-colors outline-none',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
            // Hide the textarea's own glyphs — the overlay shows them
            // (with the mention coloring). Caret stays visible via
            // caret-color. We deliberately do NOT include
            // `selection:text-foreground` — that rule made the
            // transparent text become visible during selection, which
            // ghost-rendered on top of the overlay's green mention text
            // (regular weight in the textarea, drawn weight or coloured
            // weight in the overlay). Selection is now communicated
            // purely via the background highlight; the textarea text
            // stays transparent at all times.
            'text-transparent caret-foreground selection:bg-primary/30',
            // Placeholder is on the textarea, not the overlay, so it
            // appears only when displayValue is empty.
            'placeholder:text-muted-foreground',
          )}
        />

        {open && trigger && (
          <UserMentionPopover
            query={trigger.query}
            onPick={pickUser}
            activeIndex={activeIndex}
            onItemsChange={handlePickerItems}
            onHover={setActiveIndex}
          />
        )}
      </div>
    )
  },
)

function sortedLabels(mentions: Map<string, string>): string[] {
  return Array.from(mentions.keys()).sort((a, b) => b.length - a.length)
}

/**
 * Walk display text and split it into plain-text chunks + mention pills,
 * suitable for rendering inside the overlay.
 */
function renderHighlighted(
  text: string,
  matcher: RegExp | null,
): React.ReactNode[] {
  if (!matcher) return [text]
  const out: React.ReactNode[] = []
  let lastEnd = 0
  let i = 0
  // Reset the regex's lastIndex via fresh pattern (Map keys haven't
  // changed between renders unless `matcher` itself changed).
  const re = new RegExp(matcher.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > lastEnd) out.push(text.slice(lastEnd, m.index))
    out.push(
      <span
        key={`m-${m.index}-${i++}`}
        // CRITICAL — overlay-vs-textarea alignment constraint: ONLY
        // color may differ from surrounding text. Any change to font
        // metrics (font-weight, letter-spacing, padding, margin) shifts
        // overlay glyphs out of sync with the transparent textarea
        // glyphs underneath, and the caret stops aligning with the
        // visible mention text. Bold lives in the saved-note renderer
        // (no overlay constraint there). Here, color-only.
        className="text-green-600 dark:text-green-400"
      >
        {m[0]}
      </span>,
    )
    lastEnd = m.index + m[0].length
  }
  if (lastEnd < text.length) out.push(text.slice(lastEnd))
  return out
}

// ── Popover ──────────────────────────────────────────────────────────────

function UserMentionPopover({
  query,
  onPick,
  activeIndex,
  onItemsChange,
  onHover,
}: {
  query: string
  onPick: (user: UserListItem) => void
  /** Index of the keyboard-highlighted row (driven by the parent textarea). */
  activeIndex: number
  /** Reports the currently-loaded users up so the textarea can navigate +
   *  select them via the keyboard. */
  onItemsChange: (items: UserListItem[]) => void
  /** Sync the highlight to the row under the mouse pointer. */
  onHover: (index: number) => void
}) {
  const debounced = useDebounce(query.trim(), UI.DEBOUNCE_SEARCH_MS)
  const userQuery = useUserOptions(debounced, { is_active: true })
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = userQuery

  const items = useMemo<UserListItem[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  // Mirror the loaded users up to the parent so its keydown handler can
  // navigate + pick them. `onItemsChange` is stable (useCallback) so this
  // runs only when the list actually changes.
  useEffect(() => {
    onItemsChange(items)
  }, [items, onItemsChange])

  // Keep the keyboard-highlighted row scrolled into view.
  const activeRowRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open: true,
    scrollerNode,
    sentinelNode,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadedCount: items.length,
  })

  return (
    <div
      className="absolute left-0 right-0 z-20 mt-1 rounded-md border border-border bg-popover text-popover-foreground shadow-md"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="border-b border-border p-2">
        <Input
          value={query}
          readOnly
          placeholder={CRM_SHARED_STRINGS.mentionInput.searchPlaceholder}
          className="h-7 text-xs"
        />
      </div>
      <div
        ref={setScrollerNode}
        onScroll={onScroll}
        onWheel={onWheel}
        className="max-h-60 overflow-y-auto p-1"
      >
        {isLoading && items.length === 0 ? (
          <Typography variant="helper" align="center" asChild>
            <div className="px-2 py-4">{CRM_SHARED_STRINGS.mentionInput.loading}</div>
          </Typography>
        ) : isError ? (
          <LoadErrorState
            error={error}
            fallback={CRM_SHARED_STRINGS.mentionInput.loadError}
            compact
          />
        ) : items.length === 0 ? (
          <Typography variant="helper" align="center" asChild>
            <div className="px-2 py-4">
              {query
                ? CRM_SHARED_STRINGS.mentionInput.noMatches
                : CRM_SHARED_STRINGS.mentionInput.startTyping}
            </div>
          </Typography>
        ) : (
          <>
            {items.map((user, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={user.id}
                  ref={isActive ? activeRowRef : null}
                  type="button"
                  onClick={() => onPick(user)}
                  onMouseEnter={() => onHover(index)}
                  aria-selected={isActive}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                    isActive ? 'bg-accent' : 'hover:bg-accent',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{getUserDisplayName(user)}</span>
                  {user.email && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </button>
              )
            })}
            {hasNextPage && (
              <Typography variant="caption" align="center" asChild>
                <div ref={setSentinelNode} className="px-2 py-2">
                  {isFetchingNextPage
                    ? CRM_SHARED_STRINGS.mentionInput.loadingMore
                    : CRM_SHARED_STRINGS.mentionInput.scrollForMore}
                </div>
              </Typography>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Renderer for saved content ──────────────────────────────────────────

export function MentionContent({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  const parts = useMemo(() => {
    const out: Array<{ type: 'text' | 'mention'; text: string; userId?: string }> = []
    let lastEnd = 0
    const re = new RegExp(MENTION_TOKEN_RE.source, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(content))) {
      if (m.index > lastEnd) {
        out.push({ type: 'text', text: content.slice(lastEnd, m.index) })
      }
      out.push({ type: 'mention', text: m[1], userId: m[2] })
      lastEnd = m.index + m[0].length
    }
    if (lastEnd < content.length) {
      out.push({ type: 'text', text: content.slice(lastEnd) })
    }
    return out
  }, [content])

  return (
    <p className={cn('text-sm whitespace-pre-wrap [overflow-wrap:anywhere]', className)}>
      {parts.map((part, i) =>
        part.type === 'mention' ? (
          <span
            key={i}
            // WhatsApp-style: bold green text, no background, no pill —
            // sits inline with the surrounding sentence.
            className="font-bold text-green-600 dark:text-green-400"
            title={part.userId}
          >
            @{part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  )
}
