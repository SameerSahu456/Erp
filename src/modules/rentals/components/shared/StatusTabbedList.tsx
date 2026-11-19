import type { ReactNode } from "react"

import { StatusBadge, type StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { ListPageShell } from "@/components/page-shells"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BusinessMetricsTable,
  type CellFormatter,
  type ColumnDef,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"

import { RENTALS_LIST_MAX_CELL_CHARS } from "../../constants/list"
import { FilterSearch } from "./filters/FilterSearch"
import { filterBar } from "./filters/filterBar"
import { RENTALS_FILTER_STRINGS as F } from "./filters/filters.strings"

/** The list's filter bar: just the search box, when the page has one. */
function searchBar(search: { value: string; onChange: (value: string) => void } | undefined) {
  if (!search) return undefined
  return filterBar([
    {
      key: "search",
      active: search.value.trim() !== "",
      node: (
        <FilterSearch
          value={search.value}
          onChange={search.onChange}
          placeholder={F.search}
          clearAriaLabel={F.clearSearch}
        />
      ),
    },
  ])
}
import { RetryLoadError } from "./RetryLoadError"

interface Tab {
  id: string
  label: string
}

/** The list query's state, as TanStack Query reports it. */
export interface StatusListQuery {
  isLoading: boolean
  isFetching: boolean
  error: unknown
  refetch: () => Promise<unknown>
}

export interface StatusTabbedListProps {
  title: string
  subtitle: string
  actions?: ReactNode
  /** Rendered under the header — e.g. the Approvals page's queue switch. */
  toolbar?: ReactNode
  tabs: readonly Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  columns: ColumnDef[]
  rows: Record<string, unknown>[]
  variantOf: (status: string) => StatusBadgeVariant
  persistKey: string
  onRowClick: (row: Record<string, unknown>) => void
  query: StatusListQuery
  pagination: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }
  emptyState: { title: string; description: string }
  /** Shown (with Retry) when the first load fails. */
  loadError: string
  /** A search box over the list, when the active view's query supports one.
   *  The caller debounces before the value reaches its query key (§6.9.1). */
  search?: { value: string; onChange: (value: string) => void }
}

const SKELETON_ROWS = 5

function RowsSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

/**
 * A server-paged list whose tabs are status buckets and whose `status`
 * column is a badge — the shape the swap, adjustment and waiver queues share.
 * Rows carry the raw status as `_status` for the badge variant.
 */
export function StatusTabbedList(p: StatusTabbedListProps) {
  const cellFormatter: CellFormatter = (value, key, row) =>
    key === "status"
      ? { display: <StatusBadge variant={p.variantOf(String(row._status))}>{String(value)}</StatusBadge> }
      : null
  const tabs: TabConfig[] = p.tabs.map((t) => ({
    id: t.id,
    label: t.label,
    columns: p.columns,
    data: t.id === p.activeTab ? p.rows : [],
  }))
  const { query } = p
  // First load → skeleton rows; a failed load with nothing cached → the
  // error with Retry, never the "nothing here" empty state.
  let emptyNode: ReactNode
  if (query.isLoading) emptyNode = <RowsSkeleton />
  else if (query.error && p.rows.length === 0)
    emptyNode = <RetryLoadError error={query.error} fallback={p.loadError} onRetry={() => void query.refetch()} />

  return (
    <ListPageShell title={p.title} subtitle={p.subtitle} actions={p.actions} toolbar={p.toolbar}>
      <BusinessMetricsTable
        showIndex
        // Long plain-text values are cut, full text on hover.
        maxCellChars={RENTALS_LIST_MAX_CELL_CHARS}
        tabs={tabs}
        activeTab={p.activeTab}
        onTabChange={p.onTabChange}
        // The rentals filter bar: the rentals search box when the page has
        // one (BMT's own search is sized for other modules).
        searchable={false}
        toolbarFilters={searchBar(p.search)}
        onClearFilters={() => p.search?.onChange("")}
        cellFormatter={cellFormatter}
        persistKey={p.persistKey}
        onRowClick={p.onRowClick}
        // While the skeleton shows, the table's own spinner would replace it.
        serverPagination={{ ...p.pagination, isFetching: query.isFetching && !query.isLoading }}
        emptyNode={emptyNode}
        emptyState={p.emptyState}
      />
    </ListPageShell>
  )
}
