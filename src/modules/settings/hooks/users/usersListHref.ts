import { useEffect } from "react"
import { useLocation } from "react-router-dom"

export const USERS_LIST_PATH = "/settings/users"

// The Users list keeps its page, page size, search, status and role in the URL,
// but the detail page's back arrow falls back to a BARE path when there is no
// history to pop — which is exactly the state after a refresh on the detail
// page. A bare `/settings/users` would drop `?page=3&users_size=50&role=…`,
// so the list stamps its query string here and the detail page's back target
// re-attaches it. Same approach as the Sales Orders list (`soListHref.ts`).
//
// sessionStorage (per tab, survives a refresh) and NOT a `bmt:` key —
// `useClearFiltersOnReload` wipes that whole prefix on any browser refresh.
const KEY = "settings:users:list-search"

// Activity-log sheet params describe an overlay, not the list view. Remembering
// them would reopen the sheet every time the user comes back.
const OVERLAY_PARAMS = ["log", "logPage", "logTab", "logFrom", "logTo"]

function listSearch(search: string): string {
  const params = new URLSearchParams(search)
  for (const key of OVERLAY_PARAMS) params.delete(key)
  const out = params.toString()
  return out ? `?${out}` : ""
}

/** Mount on the list page — records the current list query on every change. */
export function useRememberUsersListSearch(): void {
  const { search } = useLocation()
  useEffect(() => {
    try {
      const next = listSearch(search)
      if (next) sessionStorage.setItem(KEY, next)
      else sessionStorage.removeItem(KEY)
    } catch {
      /* storage unavailable — the list still works, back just lands on page 1 */
    }
  }, [search])
}

/** `/settings/users` plus the last-seen list query string, if any. */
export function usersListHref(): string {
  try {
    return `${USERS_LIST_PATH}${sessionStorage.getItem(KEY) ?? ""}`
  } catch {
    return USERS_LIST_PATH
  }
}
