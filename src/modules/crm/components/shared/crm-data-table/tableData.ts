/**
 * Pure row transforms for the client-paginated path: deriving filter options
 * and applying search + column filters + sort. Kept framework-free (no hooks)
 * so they're trivially testable and keep the controller hook lean (§17-S).
 */
import type { SortDirection, TabConfig } from "./types"

/** Distinct, sorted values per filterable column. Column-supplied
 *  `filterOptions` win; otherwise values are derived from the loaded rows. */
export function buildFilterOptions(tab: TabConfig): Record<string, string[]> {
  const options: Record<string, string[]> = {}
  for (const col of tab.columns) {
    if (!col.filterable) continue
    if (col.filterOptions && col.filterOptions.length > 0) {
      options[col.key] = col.filterOptions
      continue
    }
    const values = new Set<string>()
    for (const row of tab.data) {
      const val = row[col.key]
      if (val != null && val !== "") values.add(String(val))
    }
    options[col.key] = [...values].sort()
  }
  return options
}

/** Apply free-text search, column filters, and sort to a row set (client mode). */
export function applySearchSortFilter(
  tab: TabConfig,
  searchQuery: string,
  columnFilters: Record<string, string>,
  sortColumn: string | null,
  sortDirection: SortDirection,
): Record<string, unknown>[] {
  let data = [...tab.data]

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    data = data.filter((row) =>
      tab.columns.some((col) => {
        const val = row[col.key]
        return val != null && String(val).toLowerCase().includes(q)
      }),
    )
  }

  for (const [key, filterValue] of Object.entries(columnFilters)) {
    data = data.filter((row) => String(row[key]) === filterValue)
  }

  if (sortColumn && sortDirection) {
    data.sort((a, b) => compareRows(a[sortColumn], b[sortColumn], sortDirection))
  }
  return data
}

function compareRows(aVal: unknown, bVal: unknown, direction: SortDirection): number {
  if (aVal == null && bVal == null) return 0
  if (aVal == null) return 1
  if (bVal == null) return -1
  if (typeof aVal === "number" && typeof bVal === "number") {
    return direction === "asc" ? aVal - bVal : bVal - aVal
  }
  const aStr = String(aVal)
  const bStr = String(bVal)
  return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
}
