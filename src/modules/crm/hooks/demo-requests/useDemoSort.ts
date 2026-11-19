import { useCallback, useMemo } from "react"

import type { SortDirection } from "../../components/shared/crm-data-table/types"
import { useUrlFilter } from "@/shared/hooks"

import {
  DEMO_DEFAULT_SORT,
  DEMO_SORT_COLUMN_BY_FIELD,
  DEMO_SORT_FIELD_BY_COLUMN,
} from "../../components/demo-requests/demoRequestsConfig"

// URL-backed server sort for the demo list. The token is backend format
// (`-created_at`, `demo_number`, …); empty means the default (newest first).
// Setting it clears `?page` (the URL setter does), so a sort change lands on
// page 1.
export function useDemoSort() {
  const [sortToken, setSortToken] = useUrlFilter("sort", "")

  // Unknown field (stale bookmark) reads as "unsorted" instead of highlighting
  // a column we are not actually sorting on.
  const { sortColumn, sortDirection } = useMemo<{
    sortColumn: string | null
    sortDirection: SortDirection
  }>(() => {
    const column = sortToken ? DEMO_SORT_COLUMN_BY_FIELD[sortToken.replace(/^-/, "")] : undefined
    if (!column) return { sortColumn: null, sortDirection: null }
    return { sortColumn: column, sortDirection: sortToken.startsWith("-") ? "desc" : "asc" }
  }, [sortToken])

  const setSort = useCallback(
    (column: string | null, direction: SortDirection) => {
      const field = column ? DEMO_SORT_FIELD_BY_COLUMN[column] : undefined
      setSortToken(field && direction ? `${direction === "desc" ? "-" : ""}${field}` : "")
    },
    [setSortToken],
  )

  return { sortParam: sortToken || DEMO_DEFAULT_SORT, sortColumn, sortDirection, setSort }
}
