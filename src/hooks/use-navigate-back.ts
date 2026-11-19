import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Back-button navigation that goes to the *right* place.
 *
 * When the user reached this page by navigating WITHIN the app, browser-back
 * (`navigate(-1)`) returns them to the exact previous page — preserving its
 * scroll position and filters. But on a fresh load, a deep link, or a
 * post-login redirect there is no in-app page to go back to, so we send them to
 * the declared logical parent (`fallback`, i.e. the page's `backHref`) instead.
 *
 * The previous heuristic (`window.history.length > 1`) was effectively always
 * true — history length never shrinks — so back always did `navigate(-1)` and
 * landed on whatever happened to be the previous browser entry (a redirect, an
 * external referrer, an unrelated tab history), never the declared parent.
 * `location.key === 'default'` is set ONLY for the first entry of this Router
 * session, which is exactly the "no in-app history" case.
 *
 * The case that makes this load-bearing: the CRM dashboard's drill-throughs
 * open in a NEW TAB (`target="_blank"`), so that tab has no in-app history at
 * all and the browser's own Back button is inert. This is what gives those
 * pages a Back that reaches the record's listing rather than dead-ending.
 *
 * Deliberately NOT `&& window.history.length <= 1`. Pairing the two was tried;
 * it buys one thing — after a RELOAD the key is re-stamped `'default'` while
 * the browser keeps the real stack, so `navigate(-1)` would still reach the
 * true previous page instead of the parent — and it costs two:
 *
 *  1. The length check is exactly the unreliable signal this replaced. Any tab
 *     carrying unrelated prior entries takes `navigate(-1)` and can walk the
 *     user out of the app.
 *  2. `useUnsavedChangesGuard` pushes a no-op SENTINEL entry with a raw
 *     `window.history.pushState` whenever a form is dirty. That inflates the
 *     length while leaving `location.key` untouched, because a raw pushState
 *     bypasses the router. On `/crm/sales-orders/:id/edit` opened directly the
 *     length check therefore read "history exists", `navigate(-1)` popped the
 *     sentinel — which shares the form's own url — and Back visibly did nothing.
 *
 * Landing on the declared parent after a refresh is predictable and always
 * in-app; that is the better trade.
 *
 * KNOWN LIMIT — do not reach for this hook on a page that can be arrived at by
 * `navigate(url, { replace: true })`. A replace SWAPS the entry but still
 * stamps a fresh `location.key`, so the key claims history exists while the
 * stack behind it is empty and `navigate(-1)` has nothing to pop. That is why
 * the sales-order form and detail headers pass an explicit `onBack` instead:
 * a page with one obvious parent should address it, not walk history.
 */
export function useNavigateBack(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }, [navigate, location.key, fallback])
}
