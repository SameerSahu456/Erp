import { useEffect } from "react"
import { useLocation } from "react-router-dom"

export const SO_LIST_PATH = "/crm/sales-orders"

// The SO list keeps its page / page size / filters in the URL, but the detail
// and form pages ADDRESS the list explicitly (`navigate(SO_LIST_PATH)`) rather
// than popping history — see the `onBack` note in SoDetailHeader. A bare path
// would drop `?page=3&so_size=50`, so the list stamps its query string here
// and every "back to list" target re-attaches it.
//
// The `sales-orders:` prefix is registered in `use-reset-crm-filters.ts`, so
// the remembered view is wiped the moment the user leaves the SO section —
// same rule as every other CRM list (remembered within its module, never
// across). NOT under `bmt:` — `useClearFiltersOnReload` wipes that whole
// prefix on any browser refresh, which would send Back to page 1 after a
// reload of the detail page.
const KEY = "sales-orders:list-search"

/** Mount on the list page — records the current query string on every change. */
export function useRememberSoListSearch(): void {
  const { search } = useLocation()
  useEffect(() => {
    try {
      if (search) sessionStorage.setItem(KEY, search)
      else sessionStorage.removeItem(KEY)
    } catch {
      /* storage unavailable — the list still works, back just lands on page 1 */
    }
  }, [search])
}

/** `/crm/sales-orders` plus the last-seen list query string, if any. */
export function soListHref(): string {
  try {
    return `${SO_LIST_PATH}${sessionStorage.getItem(KEY) ?? ""}`
  } catch {
    return SO_LIST_PATH
  }
}
