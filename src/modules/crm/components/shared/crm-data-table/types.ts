/**
 * Shared types for the CrmDataTable family. Extracted from the original
 * monolithic component so the presenter, the logic hook, and the toolbar /
 * grid sub-components all reference one contract (§14 file-size, §17-S).
 */
import type * as React from "react"
import type { DateRange } from "react-day-picker"

export type SortDirection = "asc" | "desc" | null

export interface ColumnDef {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  /** Static option list for the filter dropdown. Required when serverPagination
   *  is on, since the per-page row sample isn't a reliable enumeration of all
   *  legal values. Falls back to deriving options from the loaded rows. */
  filterOptions?: string[]
  width?: string
  /** Cap the cell at `width` and ellipsize overflow (single line), so a long
   *  value (e.g. a long account name) can't stretch the column and squeeze the
   *  rest of the table. Requires `width` to be set as the cap; the full text is
   *  surfaced via a native `title` tooltip on hover. */
  truncate?: boolean
  align?: "left" | "center" | "right"
  /** Native-tooltip text rendered on the column header. Use for columns
   *  whose label is unavoidably ambiguous (e.g. "Price" on a multi-variant
   *  list where the row edit targets the default variant only). */
  headerHelp?: string
}

export interface TabConfig {
  id: string
  label: string
  columns: ColumnDef[]
  data: Record<string, unknown>[]
}

export type CellFormatter = (
  value: unknown,
  key: string,
  row: Record<string, unknown>,
) => {
  className?: string
  display?: React.ReactNode
} | null

export interface EmptyStateConfig {
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
}

/**
 * When provided, the table delegates pagination to the caller — `tabs[].data`
 * is treated as the rows for the current page only, and the footer fires
 * `onPageChange` instead of slicing locally. Use this for server-side
 * pagination (page state owned by the page; data refetched per page).
 */
export interface ServerPaginationConfig {
  page: number // 1-indexed
  pageSize: number
  total: number
  isFetching?: boolean
  onPageChange: (page: number) => void
  /** When wired, the footer renders a page-size dropdown matching
   *  TablePagination's UI so list pages share one pager vocabulary across
   *  the project. */
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: readonly number[]
  /** Optional server-side sort handoff. When the caller wires these the table
   *  reflects the parent's sort state on the headers and forwards every header
   *  click to `onSortChange` instead of running a client-side `Array.sort()`. */
  sort?: { column: string | null; direction: SortDirection }
  onSortChange?: (column: string | null, direction: SortDirection) => void
  /** Optional server-side column-filter handoff. Same contract as `sort` —
   *  filter dropdowns reflect `filters`, changes are routed to the caller via
   *  `onFiltersChange`. The caller is responsible for translating the column
   *  key + value into its own query params. */
  filters?: Record<string, string>
  onFiltersChange?: (filters: Record<string, string>) => void
  /** Optional values for filterable columns. In server-paged mode the table
   *  only holds the current page, so it can't derive the option list from
   *  `data`. Pass values per column key here if you want the dropdowns to
   *  show choices in server mode. */
  filterOptions?: Record<string, string[]>
  /** Optional subset of filter keys that should use searchable dropdowns.
   *  Use this for API-backed option lists; keep hardcoded lists as plain
   *  selects to avoid unnecessary search UI. */
  searchableFilterColumns?: string[]
}

export interface ToolbarFilterOption {
  value: string
  label: string
}

/** A filter dropdown rendered in the table toolbar that is NOT bound to a
 *  table column — for server-backed filters with no 1:1 visible column
 *  (e.g. "has email", "company size", "orphan only"). Mirrors the erp-demo
 *  layout where every filter is an inline dropdown chip in the toolbar. */
export interface ToolbarSelectFilter {
  /** Discriminant — optional so existing select configs need no change. */
  kind?: "select"
  key: string
  /** Short noun used to build the "All {label}" placeholder. */
  label: string
  /** Currently selected option value; "" (or "__all__") means unset. */
  value: string
  options: ToolbarFilterOption[]
  /** Overrides the default "All {label}" placeholder / reset-option text. */
  allLabel?: string
}

/** A created-date range filter chip — renders a DateRangePicker in the toolbar.
 *  Changes emit through `onToolbarDateRangeChange` (not the string-valued
 *  `onToolbarFilterChange`). */
export interface ToolbarDateRangeFilter {
  kind: "daterange"
  key: string
  /** Short noun used as the empty-trigger placeholder (e.g. "Created Date"). */
  label: string
  /** Currently selected range; `undefined` means unset. */
  value: DateRange | undefined
  /** Overrides the placeholder shown when nothing is picked. */
  placeholder?: string
  /** Cap the calendar at today — for created / issued / dispatched filters
   *  where a future day can only select nothing. Default off (CRM lists that
   *  don't set it are unchanged). */
  disableFuture?: boolean
}

export type ToolbarFilter = ToolbarSelectFilter | ToolbarDateRangeFilter

export interface CrmDataTableProps {
  tabs: TabConfig[]
  cellFormatter?: CellFormatter
  pageSize?: number
  stickyHeader?: boolean
  searchable?: boolean
  className?: string
  onRowClick?: (row: Record<string, unknown>) => void
  /** When provided, tab/search/filter/sort/page state persists to sessionStorage under this key. */
  persistKey?: string
  /** Customize the empty state shown when the active tab has no rows (pre-filter). */
  emptyState?: EmptyStateConfig
  /** Fully custom empty node — takes precedence over emptyState. */
  emptyNode?: React.ReactNode
  /** Called when the no-results "Clear filters" button is clicked. Lets the
   *  parent reset its own server-side filter/search state in addition to the
   *  table's internal column filters. Without this, the parent's `search` /
   *  `category_id` / etc. linger and the page falls back to "no data" empty
   *  state instead of returning to the unfiltered listing. */
  onClearFilters?: () => void
  /** Opt into server-side pagination. Disables client-side slicing for the current tab. */
  serverPagination?: ServerPaginationConfig
  /** Emits the search input value on every keystroke. Pair with `serverPagination`
   *  so the parent can refetch with `?search=…`; otherwise the in-table client
   *  filter only sees the current page's slice. The parent owns debouncing. */
  onSearchChange?: (query: string) => void
  /** Emits tab clicks so server-backed pages can refetch for that segment. */
  onTabChange?: (tabId: string) => void
  /** Optional controlled active-tab id. When provided, BMT no longer owns its
   *  own tab state — the parent does (typically driven from the URL so each
   *  tab gets a shareable link). When omitted, BMT keeps its current
   *  `persistKey`-backed sessionStorage behavior. */
  activeTab?: string
  /** Emits the full column-filter map whenever a column dropdown changes. Pair
   *  with `serverPagination` so the parent can translate filter values into
   *  query params and refetch. */
  onColumnFiltersChange?: (filters: Record<string, string>) => void
  /** Optional custom renderer per filter column. Return null to fall back to
   *  built-in filter UI. */
  renderFilter?: (args: {
    column: ColumnDef
    value: string | undefined
    onChange: (next: string) => void
    options: string[]
  }) => React.ReactNode | null
  /** Use AsyncSelect styling for all column filters (no native <select>). */
  useAsyncFilterDropdowns?: boolean
  /** Optional subset of filter keys that should use searchable dropdowns. */
  searchableFilterColumns?: string[]
  /** Controlled value for the built-in toolbar search box. When provided,
   *  the page owns the search string (so it can persist it and drive a
   *  server query); BMT renders it and still emits `onSearchChange`. */
  searchValue?: string
  /** Column-independent filter dropdowns rendered in the toolbar next to
   *  the search box — for server-backed filters that don't map 1:1 to a
   *  visible table column. */
  toolbarFilters?: ToolbarFilter[]
  /** Fired when a `toolbarFilters` dropdown changes. `value` is "" when the
   *  user clears the dropdown back to its "All" option. */
  onToolbarFilterChange?: (key: string, value: string) => void
  /** Fired when a `daterange` toolbar filter changes. `range` is `undefined`
   *  when the user clears the picker. */
  onToolbarDateRangeChange?: (key: string, range: DateRange | undefined) => void
  /** Keeps toolbar controls on one scrollable row for dense CRM index pages. */
  toolbarLayout?: "wrap" | "inline"
  /** Optional custom filter control(s) rendered at the end of the toolbar
   *  filter row (before the right-aligned spacer). Use for filters the static
   *  `toolbarFilters` contract can't express — e.g. an async user picker. */
  extraFilters?: React.ReactNode
  /** Optional controls rendered AFTER the date-range picker (which the toolbar
   *  normally pins rightmost). Use for a right-anchored action like a "Filters"
   *  aside toggle button that should sit beyond the Created Date chip. */
  trailingFilters?: React.ReactNode
  /** Optional controls rendered right AFTER the search box, before the filter
   *  chips — e.g. a "Filters" aside toggle that should sit beside search. */
  leadingFilters?: React.ReactNode
  /** Where the toolbar's date-range chip(s) sit: "end" (default) pins them
   *  rightmost; "start" puts them right after `leadingFilters`, i.e. beside the
   *  search box / Filters button, ahead of the select chips. */
  dateRangePlacement?: "start" | "end"
}

export function isTooltipPrimitive(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number"
}
