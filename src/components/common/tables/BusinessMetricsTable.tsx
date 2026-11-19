import * as React from "react"
import { AlertTriangle, Inbox, Loader2, RotateCw, SearchX } from "lucide-react"

import { cn } from "@/lib/utils"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { useMirroredValue } from "@/shared/hooks"
import { Card } from "@/components/ui/card"
import {
  AsyncSelect,
  makeStaticAsyncOptions,
  type AsyncSelectOption,
} from "@/components/ui/async-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Typography } from "@/components/ui/typography"
import {
  DATE_RANGE_TOOLBAR_WIDTH,
  DateRangePicker,
  type DateRange,
} from "@/components/common/pickers/DateRangePicker"
import { BarcodeText } from "../display/BarcodeText"
import { TruncatedText } from "../display/TruncatedText"
import { TablePagination } from "./TablePagination"
import { TableSearchInput } from "./TableSearchInput"

import { BUSINESS_METRICS_TABLE_STRINGS as S } from './business-metrics-table.strings'

interface ColumnDef {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  /** Static option list for the filter dropdown. Required when serverPagination
   *  is on, since the per-page row sample isn't a reliable enumeration of all
   *  legal values. Falls back to deriving options from the loaded rows. */
  filterOptions?: string[]
  width?: string
  align?: "left" | "center" | "right"
  /** For a `barcode` column: hide the printer button (show the code as plain
   *  reference text). Used where the barcode only identifies a row, not a label
   *  to print (e.g. the spares listing's device column). */
  noBarcodePrint?: boolean
  /** Native-tooltip text rendered on the column header. Use for columns
   *  whose label is unavoidably ambiguous (e.g. "Price" on a multi-variant
   *  list where the row edit targets the default variant only). */
  headerHelp?: string
}

interface TabConfig {
  id: string
  label: string
  columns: ColumnDef[]
  data: Record<string, unknown>[]
  /** Optional row count rendered as a small pill beside the label — for
   *  server-paged pages where each tab is a server-side filter and the
   *  count comes from a stats endpoint (e.g. Purchase Orders). */
  count?: number
}

type CellFormatter = (
  value: unknown,
  key: string,
  row: Record<string, unknown>
) => {
  className?: string
  display?: React.ReactNode
} | null

interface EmptyStateConfig {
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
}

/**
 * Load-error state (§12). When set AND there are no rows, the table shows a
 * friendly error with a Retry instead of the "no data" empty state. A failed
 * background refresh (rows still present) keeps the rows on screen, so callers
 * pass this only for a genuine first-load failure: `error={isError ? { onRetry:
 * query.refetch } : undefined}`.
 */
interface ErrorStateConfig {
  title?: string
  description?: string
  onRetry?: () => void
}

/**
 * When provided, the table delegates pagination to the caller — `tabs[].data`
 * is treated as the rows for the current page only, and the footer fires
 * `onPageChange` instead of slicing locally. Use this for server-side
 * pagination (page state owned by the page; data refetched per page).
 */
interface ServerPaginationConfig {
  page: number   // 1-indexed
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

interface ToolbarFilterOption {
  value: string
  label: string
}

/** A filter dropdown rendered in the table toolbar that is NOT bound to a
 *  table column — for server-backed filters with no 1:1 visible column
 *  (e.g. "has email", "company size", "orphan only"). Mirrors the erp-demo
 *  layout where every filter is an inline dropdown chip in the toolbar. */
interface ToolbarFilter {
  key: string
  /** Short noun used to build the "All {label}" placeholder. */
  label: string
  /** Currently selected option value; "" (or "__all__") means unset. */
  value: string
  options: ToolbarFilterOption[]
  /** Overrides the default "All {label}" placeholder / reset-option text. */
  allLabel?: string
  /** Escape hatch: render a custom control (e.g. a searchable `AsyncSelect`)
   *  in the toolbar instead of the default static `Select`. When set, `options`
   *  is ignored and the custom node owns its own value/change wiring; keep
   *  `value` populated so "clear filters" still detects this filter as active. */
  render?: () => React.ReactNode
  /** Extra trigger classes, e.g. `w-auto` to hug the label instead of the
   *  default fixed width. */
  triggerClassName?: string
}

/** A date-range filter rendered in the toolbar (the shared CRM `DateRangePicker`).
 *  Server-backed like the other toolbar filters — the parent turns the picked
 *  range into `date_from` / `date_to` query params. */
interface ToolbarDateRange {
  value: DateRange | undefined
  onChange: (next: DateRange | undefined) => void
  /** Trigger placeholder when nothing is picked. Defaults to "Select Date Range". */
  placeholder?: string
  /** Cap the calendar at today — for created/received-date filters where a
   *  future date is never valid. Defaults to false. */
  disableFuture?: boolean
  /** Keep the browser's native `title` hover on the picker instead of the
   *  styled tooltip. Defaults to false. */
  nativeTitle?: boolean
}

interface BusinessMetricsTableProps {
  tabs: TabConfig[]
  cellFormatter?: CellFormatter
  /**
   * Opt-in hard character cap for PLAIN-TEXT cells (a column whose value is a
   * bare string/number with no custom `cellFormatter` node). When set, such a
   * cell's visible text is clipped to this many characters with an ellipsis,
   * while the full value still surfaces in the hover tooltip. Barcode cells and
   * any column the formatter took over are left untouched. Undefined (default)
   * keeps the existing 200px width-based ellipsis and changes nothing — so
   * other modules and the CRM fork are unaffected. WMS list pages set 35.
   */
  maxCellChars?: number
  pageSize?: number
  stickyHeader?: boolean
  searchable?: boolean
  /** Hide the footer pager entirely. For embedded tables (e.g. a handful of
   *  rows inside a form) where paging adds no value. Defaults to false. */
  hidePagination?: boolean
  /**
   * Render a leading "Sr No" column with the absolute row index (carries
   * across pages in server-paginated mode: page 2 starts at the right
   * offset, not at 1 again).
   *
   * Defaults to `true` for the `crm-premium-table` skin (kept for
   * backwards compatibility — existing CRM pages already render the
   * column via the skin and shouldn't change). Pages outside that skin
   * pass `showIndex` explicitly; IMS turns it on across every list page.
   */
  showIndex?: boolean
  /** Force the tab strip to render even with a single tab. By default the
   *  strip is hidden when `tabs.length <= 1` (a lone tab adds no nav value);
   *  set this when the single tab's label is meaningful as a section title. */
  alwaysShowTabs?: boolean
  className?: string
  onRowClick?: (row: Record<string, unknown>) => void
  /** When provided, tab/search/filter/sort/page state persists to sessionStorage under this key. */
  persistKey?: string
  /** Customize the empty state shown when the active tab has no rows (pre-filter). */
  emptyState?: EmptyStateConfig
  /** Load-error state (§12). When set and there are no rows, a friendly error
   *  + Retry replaces the empty state. See `ErrorStateConfig`. */
  error?: ErrorStateConfig
  /** Fully custom empty node — takes precedence over emptyState. */
  emptyNode?: React.ReactNode
  /** Called when the no-results "Clear filters" button is clicked. Lets the
   *  parent reset its own server-side filter/search state in addition to the
   *  table's internal column filters. Without this, the parent's `search` /
   *  `category_id` / etc. linger and the page falls back to "no data" empty
   *  state instead of returning to the unfiltered listing. */
  onClearFilters?: () => void
  /** Signals that the PARENT holds active server-side filters (search /
   *  category / status / …) that BMT can't see — e.g. filters rendered via
   *  `renderFilter` or applied outside the table. When true, a zero-row result
   *  shows the "No results match your filters" state (with Clear filters)
   *  instead of the generic "no data" empty state. */
  externalFiltersActive?: boolean
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
  /** Optional custom renderer for a column's HEADER cell. Return a node to
   *  replace the default label + sort indicator (e.g. a select-all checkbox in
   *  a leading selection column), or null to fall back to the default header.
   *  Opt-in — tables that don't pass it are unaffected. */
  renderHeaderCell?: (column: ColumnDef) => React.ReactNode | null
  /** Optional custom renderer for a whole BODY row. Return a node (one or more
   *  `<tr>`s) to replace the default row — for rows the column/cellFormatter
   *  model can't express, e.g. an inline-expandable row that renders a detail
   *  panel `<tr>` beneath it — or null to fall back to the default row. The
   *  custom row owns every cell, including the Sr-No cell when `showIndex` is
   *  on; `index` is the absolute (page-offset) 0-based row index and `colSpan`
   *  the table's full column count. Opt-in — other tables are unaffected. */
  renderRow?: (
    row: Record<string, unknown>,
    ctx: { index: number; colSpan: number },
  ) => React.ReactNode | null
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
  /** Optional override for the search input's placeholder. Defaults to the
   *  generic "Search...". Pages whose search box only searches a single
   *  field (e.g. PM Assignments — name-only resolution) should set this so
   *  the input self-describes. */
  searchPlaceholder?: string
  /** Column-independent filter dropdowns rendered in the toolbar next to
   *  the search box — for server-backed filters that don't map 1:1 to a
   *  visible table column. */
  toolbarFilters?: ToolbarFilter[]
  /** Fired when a `toolbarFilters` dropdown changes. `value` is "" when the
   *  user clears the dropdown back to its "All" option. */
  onToolbarFilterChange?: (key: string, value: string) => void
  /**
   * Trigger size for the BUILT-IN toolbar/column filter dropdowns. Defaults to
   * the compact `"sm"` (h-8). Pass `"default"` (h-10) to match the standard
   * form `Select` — WMS list pages use this so every filter reads the same as
   * the rest of the module. Custom `renderFilter` controls set their own size.
   */
  filterSize?: "sm" | "default"
  /** Optional date-range filter shown in the toolbar (shared DateRangePicker).
   *  The parent maps the range to server `date_from` / `date_to` params. */
  dateRange?: ToolbarDateRange
}

type SortDirection = "asc" | "desc" | null

function isTooltipPrimitive(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number"
}

// Tiny sort-direction indicator. Extracted so the header can render it
// on either side of the label without duplicating the arrow/opacity
// logic (right-aligned numeric columns flip it to the LEFT so the
// label's last char tail-aligns with the cell values).
function SortIndicator({
  isActive,
  direction,
}: {
  isActive: boolean
  direction: SortDirection
}) {
  return (
    <span
      className={cn(
        "srt inline-block h-3.5 w-3.5 text-[10px] leading-none",
        isActive ? "opacity-90" : "opacity-60",
      )}
      aria-hidden
    >
      {isActive && direction === "asc"
        ? S.sortIndicator.asc
        : isActive && direction === "desc"
          ? S.sortIndicator.desc
          : S.sortIndicator.unsorted}
    </span>
  )
}

function BusinessMetricsTable({
  tabs,
  cellFormatter,
  maxCellChars,
  renderRow,
  pageSize: initialPageSize = 10,
  stickyHeader = true,
  searchable = true,
  alwaysShowTabs = false,
  className,
  onRowClick,
  persistKey,
  emptyState,
  error,
  emptyNode,
  onClearFilters: parentOnClearFilters,
  externalFiltersActive = false,
  serverPagination,
  onSearchChange,
  onTabChange,
  onColumnFiltersChange,
  renderFilter,
  renderHeaderCell,
  useAsyncFilterDropdowns = false,
  searchableFilterColumns,
  searchValue,
  searchPlaceholder = "Search...",
  toolbarFilters,
  onToolbarFilterChange,
  filterSize = "sm",
  dateRange,
  activeTab: controlledActiveTab,
  showIndex,
  hidePagination = false,
}: BusinessMetricsTableProps) {
  const isServerPaged = !!serverPagination
  const isPremiumTable = className?.includes("crm-premium-table") ?? false
  const showsTabs =
    (tabs.length > 1 || alwaysShowTabs) && !className?.includes("cpt-compact")
  // `showIndex` prop wins when explicitly set; otherwise fall back to
  // the legacy "premium table" detection so existing CRM call-sites keep
  // their Sr-No column without code changes.
  const showIndexColumn = showIndex ?? isPremiumTable
  const pk = persistKey ? `bmt:${persistKey}` : ""
  const [internalActiveTab, setInternalActiveTab] = usePersistedState<string>(pk ? `${pk}:tab` : "", tabs[0]?.id ?? "")
  const isTabControlled = controlledActiveTab !== undefined
  const activeTab = isTabControlled ? controlledActiveTab : internalActiveTab
  const [sortColumn, setSortColumn] = usePersistedState<string | null>(pk ? `${pk}:sortCol` : "", null)
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(pk ? `${pk}:sortDir` : "", null)
  const [currentPage, setCurrentPage] = usePersistedState<number>(pk ? `${pk}:page` : "", 0)
  const [pageSize, setPageSize] = usePersistedState<number>(pk ? `${pk}:pageSize` : "", initialPageSize)
  const [searchQuery, setSearchQuery] = usePersistedState<string>(pk ? `${pk}:search` : "", "")
  const [columnFilters, setColumnFilters] = usePersistedState<Record<string, string>>(
    pk ? `${pk}:colFilters` : "",
    {},
  )
  // Bridges the brief gap after a filter-clear: filters reset synchronously but
  // the parent's refetch hasn't flipped isFetching yet, so without this the
  // non-filtered empty state (with its create CTA) flashes for one frame.
  const [clearing, setClearing] = React.useState(false)

  // The built-in search can run controlled (page owns the string — e.g. to
  // persist it and drive a server query) or uncontrolled (BMT-local state).
  const isSearchControlled = searchValue !== undefined
  const effectiveSearch = isSearchControlled ? searchValue : searchQuery

  // Caret-safe search: bind the box to local state (updated synchronously on
  // each keystroke) so editing mid-string never bounces the caret to the end —
  // the value is owned upstream (often a URL param) and reading it back per
  // keystroke is what resets the caret. Changes still propagate via the commit
  // below; external resets (Clear, tab switch) are adopted.
  const commitSearch = (next: string) => {
    if (!isSearchControlled) setSearchQuery(next)
    setCurrentPage(0)
    onSearchChange?.(next)
  }
  const [searchText, onSearchType] = useMirroredValue(effectiveSearch, commitSearch)

  // Memoize the lookup so downstream `useMemo`s aren't invalidated on every
  // render by a fresh object reference from `tabs.find(...)`.
  const activeTabConfig = React.useMemo(
    () => tabs.find((t) => t.id === activeTab),
    [tabs, activeTab],
  )

  const filterOptions = React.useMemo(() => {
    if (!activeTabConfig) return {}
    // Server-paged mode: rely on the caller-supplied option list (if any).
    // Computing distinct values from `data` would be wrong because `data`
    // only holds the current page slice.
    if (isServerPaged) return serverPagination?.filterOptions ?? {}
    const options: Record<string, string[]> = {}
    for (const col of activeTabConfig.columns) {
      if (!col.filterable) continue
      if (col.filterOptions && col.filterOptions.length > 0) {
        options[col.key] = col.filterOptions
        continue
      }
      const values = new Set<string>()
      for (const row of activeTabConfig.data) {
        const val = row[col.key]
        if (val != null && val !== '') values.add(String(val))
      }
      options[col.key] = [...values].sort()
    }
    return options
  }, [activeTabConfig, isServerPaged, serverPagination?.filterOptions])

  // Effective sort/filter state — pulled from the parent in server-paged mode,
  // local persisted state otherwise.
  const effectiveSortColumn = isServerPaged
    ? (serverPagination?.sort?.column ?? null)
    : sortColumn
  const effectiveSortDirection = isServerPaged
    ? (serverPagination?.sort?.direction ?? null)
    : sortDirection
  const effectiveColumnFilters = isServerPaged
    ? (serverPagination?.filters ?? {})
    : columnFilters

  const handleTabChange = (tabId: string) => {
    if (!isTabControlled) setInternalActiveTab(tabId)
    onTabChange?.(tabId)
    setSortColumn(null)
    setSortDirection(null)
    setCurrentPage(0)
    setSearchQuery("")
    setColumnFilters({})
  }

  const handleSort = (columnKey: string) => {
    // Compute next sort state from the currently-effective values so server
    // mode and client mode behave identically — three-stage cycle (asc → desc
    // → off) on repeat clicks of the same column.
    let nextColumn: string | null
    let nextDirection: SortDirection
    if (effectiveSortColumn === columnKey) {
      if (effectiveSortDirection === "asc") {
        nextColumn = columnKey
        nextDirection = "desc"
      } else if (effectiveSortDirection === "desc") {
        nextColumn = null
        nextDirection = null
      } else {
        nextColumn = columnKey
        nextDirection = "asc"
      }
    } else {
      nextColumn = columnKey
      nextDirection = "asc"
    }

    if (isServerPaged && serverPagination?.onSortChange) {
      serverPagination.onSortChange(nextColumn, nextDirection)
      return
    }
    setSortColumn(nextColumn)
    setSortDirection(nextDirection)
    setCurrentPage(0)
  }

  const handleFilterChange = (columnKey: string, value: string) => {
    if (isServerPaged && serverPagination?.onFiltersChange) {
      const next = { ...(serverPagination.filters ?? {}) }
      if (value === "__all__") delete next[columnKey]
      else next[columnKey] = value
      serverPagination.onFiltersChange(next)
      return
    }
    setColumnFilters((prev) => {
      const next =
        value === '__all__'
          ? (() => { const n = { ...prev }; delete n[columnKey]; return n })()
          : { ...prev, [columnKey]: value }
      onColumnFiltersChange?.(next)
      return next
    })
    setCurrentPage(0)
  }

  const processedData = React.useMemo(() => {
    if (!activeTabConfig) return []
    // Server-paged mode: the caller already applied search/sort/filter at the
    // backend, and we only hold one page. Re-doing the work here would (a)
    // filter against an incomplete row set and (b) waste an O(n log n) sort
    // on every keystroke. Pass through.
    if (isServerPaged) return activeTabConfig.data
    let data = [...activeTabConfig.data]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter((row) =>
        activeTabConfig.columns.some((col) => {
          const val = row[col.key]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }

    for (const [key, filterValue] of Object.entries(columnFilters)) {
      data = data.filter((row) => String(row[key]) === filterValue)
    }

    if (sortColumn && sortDirection) {
      data.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal
        }
        const aStr = String(aVal)
        const bStr = String(bVal)
        return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    }
    return data
  }, [activeTabConfig, isServerPaged, sortColumn, sortDirection, searchQuery, columnFilters])

  // Server-paginated mode: trust the caller for both data and totals.
  // Client-paginated mode: process + slice locally.
  const effectivePageSize = isServerPaged ? serverPagination!.pageSize : pageSize
  const effectiveTotalRows = isServerPaged ? serverPagination!.total : processedData.length
  const totalPages = Math.max(1, Math.ceil(effectiveTotalRows / effectivePageSize))
  const effectiveCurrentPage = isServerPaged ? serverPagination!.page - 1 : currentPage
  const paginatedData = isServerPaged
    ? (activeTabConfig?.data ?? [])
    : processedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  const totalColumns = (activeTabConfig?.columns.length ?? 0) + (showIndexColumn ? 1 : 0)
  // End the clear-bridge as soon as the query reacts (refetch begins or the row
  // set changes). Done during render via React's "reset state on prop change"
  // pattern — no setState-in-effect, no render cascade.
  const fetchSignal = `${!!serverPagination?.isFetching}:${paginatedData.length}`
  const [prevFetchSignal, setPrevFetchSignal] = React.useState(fetchSignal)
  if (fetchSignal !== prevFetchSignal) {
    setPrevFetchSignal(fetchSignal)
    if (clearing) setClearing(false)
  }
  const showLoadingState =
    (!!serverPagination?.isFetching && paginatedData.length === 0) || clearing
  // If the current page is empty (e.g., user landed on a stale page after a
  // deletion) we'd otherwise render "Showing 21 to 20 of N" — collapse to 0.
  const isEmptyView = effectiveTotalRows === 0 || paginatedData.length === 0
  const rangeStart = isEmptyView ? 0 : effectiveCurrentPage * effectivePageSize + 1
  const rangeEnd = isEmptyView ? 0 : rangeStart + paginatedData.length - 1
  // rangeStart/rangeEnd are kept for the screen-reader announcer below; the
  // visual numbers come from TablePagination now.
  void rangeStart
  void rangeEnd

  const goToPage = (zeroIdx: number) => {
    if (isServerPaged) serverPagination!.onPageChange(zeroIdx + 1)
    else setCurrentPage(zeroIdx)
  }

  const renderCellContent = (
    value: unknown,
    rendered: React.ReactNode,
    isBarcodeCol: boolean,
    model?: string,
    serial?: string,
    // The device behind the barcode, when the row carries one. With it the
    // printer button fetches the real scannable PDF label; without it, the
    // legacy text-only fallback. Rows that are not devices simply omit it.
    stockItemId?: string,
    // Actions (and other interactive) cells must NOT width-clip: their buttons
    // keep their natural width so the column can't squeeze below them — the
    // table then overflows on a narrow screen and the wrapper scrolls instead
    // of chopping the buttons.
    clip = true,
    // Hide the barcode printer button (column opted out via `noBarcodePrint`).
    hidePrint = false,
  ) => {
    // Opt-in character cap (WMS). Only a plain-text cell qualifies: a bare
    // primitive value the formatter did NOT replace with a custom node, and not
    // a barcode. The tooltip below still carries the full value, so nothing is
    // lost — the cell just shows the first `maxCellChars` characters + "…".
    const cappedRendered =
      maxCellChars != null &&
      !isBarcodeCol &&
      isTooltipPrimitive(value) &&
      isTooltipPrimitive(rendered) &&
      String(rendered).length > maxCellChars
        ? `${String(rendered).slice(0, maxCellChars).trimEnd()}…`
        : rendered

    const display = isBarcodeCol ? (
      <BarcodeText model={model} serial={serial} stockItemId={stockItemId} hidePrint={hidePrint}>
        {rendered}
      </BarcodeText>
    ) : (
      cappedRendered
    )

    // When a cellFormatter returns a custom React node (i.e. `rendered` is
    // not the same primitive as `value`), the page is in control of what
    // operators see and the raw `value` should not leak via tooltip. This
    // prevented the "actions" cell from showing the row's UUID on hover —
    // pages routinely set `actions: row.id` so the formatter can navigate
    // / mutate by id without re-reading the row.
    const rendererTookOver =
      isTooltipPrimitive(value) && !isTooltipPrimitive(rendered)
    // A formatter-owned cell (`rendererTookOver`) normally shows no tooltip so
    // a raw value (e.g. `actions: row.id`) can't leak on hover. But once the
    // char cap is on (WMS), a long text value that the formatter rendered
    // (a part name, a description) gets clipped with NO way to read it in full.
    // So when capped, DO surface the value on hover for a value that is (a)
    // longer than the cap — i.e. actually truncated — and (b) not a UUID/ id
    // (guards the actions-cell case). Short enum-backed badges never qualify.
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const cappedTooltip =
      maxCellChars != null &&
      isTooltipPrimitive(value) &&
      String(value).trim().length > maxCellChars &&
      !UUID_RE.test(String(value).trim())
        ? String(value)
        : null
    const tooltipText = rendererTookOver
      ? cappedTooltip
      : isTooltipPrimitive(value)
        ? String(value)
        : isTooltipPrimitive(rendered)
          ? String(rendered)
          : null

    // With the character cap on (WMS), also clip every cell to its OWN column
    // width on a single line — a narrow column truncates with an ellipsis even
    // when the value is under the character cap, and custom formatter nodes
    // (part-name links, etc.) clip the same way plain text does. Without the
    // cap, cells keep wrapping naturally inside their 200px max width.
    const widthClip = maxCellChars != null && clip

    if (!tooltipText)
      return widthClip ? (
        <div className="min-w-0 max-w-full truncate">{display}</div>
      ) : (
        display
      )

    return (
      <TooltipProvider delay={150}>
        <Tooltip>
          <TooltipTrigger
            render={
              // Tooltip still useful when the wrapped value is a long
              // sentence — operator can hover for the unwrapped form.
              <div
                className={
                  widthClip ? "min-w-0 max-w-full truncate" : "min-w-0 break-words"
                }
              >
                {display}
              </div>
            }
          />
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const filterableColumns = activeTabConfig?.columns.filter((c) => c.filterable) ?? []
  // Toolbar shouldn't paint its zebra band when there's nothing inside it.
  // Each filter dropdown bails on `options.length === 0`; in server-paged
  // mode without `filterOptions` supplied (e.g. CRM Leads/Deals list view),
  // every dropdown renders null and the toolbar wraps a row of nothing —
  // showing as a hollow band above the header. Gate on actual content:
  // a search input, OR at least one filter with options, OR a custom
  // `renderFilter` callback that may render something we can't preview here.
  const dateRangeActive = !!(dateRange?.value?.from || dateRange?.value?.to)
  const toolbarFiltersActive =
    (toolbarFilters ?? []).some((f) => !!f.value && f.value !== "__all__") ||
    dateRangeActive
  const toolbarHasFilterContent =
    !!renderFilter ||
    filterableColumns.some((col) => (filterOptions[col.key]?.length ?? 0) > 0) ||
    (toolbarFilters?.length ?? 0) > 0 ||
    !!dateRange
  const showToolbar = searchable || toolbarHasFilterContent
  const searchableFilterKeys = React.useMemo(
    () =>
      new Set([
        ...(searchableFilterColumns ?? []),
        ...(serverPagination?.searchableFilterColumns ?? []),
      ]),
    [searchableFilterColumns, serverPagination?.searchableFilterColumns],
  )

  if (tabs.length === 0) {
    return <div className={cn("text-muted-foreground text-sm p-4", className)}>{S.noData}</div>
  }

  return (
    <div className={cn("space-y-0", className)}>
      {/* Tabs — only rendered when there are multiple, so single-tab pages
          (Accounts, Vendors, Contacts, etc.) don't show a redundant pill. */}
      {showsTabs && (
        <div className="cpt-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn("cpt-tab", activeTab === tab.id && "active")}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("cpt-tab-count", activeTab === tab.id && "active")}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Table wrap with toolbar */}
      <Card
        className="cpt-table-wrap gap-0 overflow-hidden rounded-2xl py-0"
        style={showsTabs ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : undefined}
      >
        {/* Toolbar: search + filters. Renders when EITHER search is on or
            any column is filterable — gating both on `searchable` would hide
            the filter dropdowns on pages that opted out of free-text search
            (e.g. PM Assignments, where the backend has no search param). */}
        {showToolbar && (
          <div className="cpt-table-toolbar">
            {searchable && (
              <TableSearchInput
                value={searchText}
                onChange={onSearchType}
                placeholder={searchPlaceholder}
                // `min-w-0` lets the search box shrink instead of holding its
                // content width — so the fixed-width filters + date stay on the
                // one toolbar row rather than the last one wrapping below.
                className="flex-1 min-w-0"
                clearAriaLabel={S.toolbar.clearSearchAriaLabel}
              />
            )}

            {/* Column filter dropdowns */}
            {filterableColumns.map((col) => {
              const options = filterOptions[col.key] ?? []
              const customFilter = renderFilter?.({
                column: col,
                value: effectiveColumnFilters[col.key],
                onChange: (next) => handleFilterChange(col.key, next),
                options,
              })
              if (customFilter != null) {
                return <React.Fragment key={col.key}>{customFilter}</React.Fragment>
              }
              if (options.length === 0) return null
              if (useAsyncFilterDropdowns || searchableFilterKeys.has(col.key)) {
                return (
                  <FilterChipDropdown
                    key={col.key}
                    label={col.label}
                    options={options}
                    value={effectiveColumnFilters[col.key]}
                    onChange={(value) => handleFilterChange(col.key, value)}
                    searchable={searchableFilterKeys.has(col.key)}
                  />
                )
              }
              {
                const v = effectiveColumnFilters[col.key]
                const hasValue = v != null && v !== "__all__" && v !== ""
                return (
                  <Select
                    key={col.key}
                    value={v ?? "__all__"}
                    onValueChange={(next) => handleFilterChange(col.key, next ?? "__all__")}
                  >
                    <SelectTrigger
                      size={filterSize}
                      className="w-[160px]"
                      clearable={hasValue}
                      onClear={() => handleFilterChange(col.key, "__all__")}
                    >
                      <SelectValue>
                        {hasValue ? v : S.toolbar.allFilter(col.label)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{S.toolbar.allFilter(col.label)}</SelectItem>
                      {options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
            })}

            {/* Column-independent toolbar filters — server-backed filters
                with no matching visible table column. */}
            {(toolbarFilters ?? []).map((tf) => {
              if (tf.render) return <React.Fragment key={tf.key}>{tf.render()}</React.Fragment>
              if (tf.options.length === 0) return null
              const allText = tf.allLabel ?? `All ${tf.label}`
              const hasValue =
                !!tf.value && tf.value !== "__all__" && tf.value !== ""
              const selected = tf.options.find((o) => o.value === tf.value)
              return (
                <Select
                  key={tf.key}
                  value={tf.value || "__all__"}
                  onValueChange={(next) =>
                    onToolbarFilterChange?.(
                      tf.key,
                      next && next !== "__all__" ? next : "",
                    )
                  }
                >
                  <SelectTrigger
                    size={filterSize}
                    className={cn("w-[185px]", tf.triggerClassName)}
                    clearable={hasValue}
                    onClear={() => onToolbarFilterChange?.(tf.key, "")}
                  >
                    <SelectValue>
                      {/* A long label (e.g. a 50+ char vendor name) ellipsizes; full text on hover. */}
                      <TruncatedText
                        value={hasValue ? (selected?.label ?? tf.value) : allText}
                        className="max-w-full"
                      />
                    </SelectValue>
                  </SelectTrigger>
                  {/* Let the popup grow to fit the longest option (vendor names
                      run long) instead of clamping to the trigger width, and
                      drop the per-row check — in a narrow filter it overlapped
                      long labels; the selection is already shown in the trigger. */}
                  <SelectContent className="w-auto min-w-(--anchor-width) max-w-[300px]">
                    <SelectItem value="__all__" hideIndicator>
                      {allText}
                    </SelectItem>
                    {tf.options.map((o) => (
                      <SelectItem key={o.value} value={o.value} hideIndicator>
                        {/* Capped to the popup's 300px so a long option ellipsizes, not spills. */}
                        <TruncatedText value={o.label} className="max-w-[17rem]" />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            })}

            {/* Date-range filter (shared CRM DateRangePicker) — server-backed
                via the parent's date_from / date_to params. */}
            {dateRange && (
              <DateRangePicker
                value={dateRange.value}
                onChange={dateRange.onChange}
                disableFuture={dateRange.disableFuture}
                nativeTitle={dateRange.nativeTitle}
                // Don't apply on the first (start) click — wait for
                // the end date; a lone start auto-fills to today on close. BMT is
                // not used by CRM (it forked its own table), so this is scoped to
                // the WMS/IMS/procurement lists.
                commitOnComplete
                placeholder={dateRange.placeholder ?? S.toolbar.dateRangePlaceholder}
                // h-9 / rounded-[7px] matches the other toolbar filters; the
                // width is the shared DATE_RANGE_TOOLBAR_WIDTH so a full
                // "from – to" range reads without truncating (same chip width
                // as the CRM toolbar date filter). The full range is also in
                // the trigger's hover tooltip.
                className={cn("h-9", DATE_RANGE_TOOLBAR_WIDTH)}
              />
            )}

            <div style={{ marginLeft: 'auto' }} />
          </div>
        )}

        <div className="relative">
          {/* Prominent loading overlay over the table while a new page/filter
              result loads OVER existing rows. The subtle bottom
              "loading" text was easy to miss, leaving users unsure whether the
              table had refreshed. Click-through (pointer-events-none) so a
              background refetch never traps interaction; initial/empty loads
              use the in-body spinner row instead. */}
          {!!serverPagination?.isFetching && paginatedData.length > 0 && (
            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/55"
              role="status"
              aria-live="polite"
            >
              <span className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 shadow-md">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                <Typography variant="helper" tone="muted" asChild>
                  <span>{S.loadingData}</span>
                </Typography>
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            {/* `min-w-full` (not `w-full`) so the table grows to fit its
                natural content width — the sum of column min-widths
                driven by `whitespace-nowrap` headers. When that exceeds
                the wrapper, the parent `overflow-x-auto` kicks in for a
                horizontal scrollbar instead of compressing columns and
                letting header text overlap into the next column. */}
            <table className="premium-table min-w-full">
              <thead className={cn(stickyHeader && "sticky top-0 z-10")}>
                <tr className="border-b border-gray-200 dark:border-zinc-700">
                  {showIndexColumn && (
                    // Header darkened to match the body cell weight
                    // (`text-gray-700 dark:text-zinc-300`) — previous
                    // `text-gray-500` rendered as a muted column label
                    // that didn't pair with the now-readable cell
                    // numerals below it.
                    <th className="index-col px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-700 dark:text-zinc-300">
                      {S.srNo}
                    </th>
                  )}
                  {activeTabConfig?.columns.map((col) => {
                    // Opt-in custom header (e.g. a select-all checkbox). When it
                    // returns a node, it OWNS the cell — the default label + sort
                    // and the sort-on-click are suppressed so its own controls
                    // (a checkbox) aren't hijacked by a header click.
                    const customHeader = renderHeaderCell?.(col) ?? null
                    // Label + sort arrow shared by the plain and the
                    // tooltip-wrapped header renders below.
                    const headerLabel = (
                      <>
                        <span>{col.label}</span>
                        {col.sortable && (
                          <SortIndicator
                            isActive={effectiveSortColumn === col.key}
                            direction={effectiveSortDirection}
                          />
                        )}
                      </>
                    )
                    return (
                      <th
                        key={col.key}
                        className={cn(
                          // Bumped from text-gray-500 → text-gray-700 (zinc-200
                          // in dark) so the header label sits at a comfortably
                          // visible contrast — previously it read as muted/decor
                          // rather than as the column name. Min-width stops it
                          // from being squeezed below the label's natural width.
                          "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-700 dark:text-zinc-200",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.label === "" && !customHeader && "w-0",
                        )}
                        style={{
                          cursor: col.sortable && !customHeader ? "pointer" : undefined,
                          // `col.width` is the body-cell cap; on the header it
                          // is both the width (a `table-layout: fixed` table
                          // sizes columns from the header row, so a min alone
                          // is ignored) and the min, so the label + sort/filter
                          // icons always render in full.
                          width: col.width,
                          minWidth: col.width,
                          userSelect: "none",
                        }}
                        onClick={
                          col.sortable && !customHeader ? () => handleSort(col.key) : undefined
                        }
                      >
                        {customHeader ??
                          // §0.14 — `col.headerHelp` is EXTRA info (not the
                          // visible label), so it earns a styled tooltip. The
                          // trigger sits on the inner label span, never the
                          // `<th>`, and never stops propagation, so a click
                          // still bubbles to the header's sort handler.
                          (col.headerHelp ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <span className="inline-flex items-center gap-1 align-middle" />
                                  }
                                >
                                  {headerLabel}
                                </TooltipTrigger>
                                <TooltipContent>{col.headerHelp}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="inline-flex items-center gap-1 align-middle">
                              {headerLabel}
                            </span>
                          ))}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody
                className={cn(
                  // While a new page / filter result loads OVER existing rows,
                  // dim them so the change reads as "loading" rather than a
                  // frozen table. Kept click-through (no
                  // pointer-events lock) so a background refetch never blocks
                  // interaction. Initial/empty loads show the spinner row below.
                  !!serverPagination?.isFetching &&
                    paginatedData.length > 0 &&
                    "opacity-60 transition-opacity",
                )}
              >
                {showLoadingState ? (
                  // Loading lives INSIDE the body so the <thead> (column
                  // structure) stays mounted across a filter change — only the
                  // rows swap, the columns never flash/remount. Prior behaviour
                  // conditionally rendered the whole <table>, so any filter that
                  // emptied the current page tore down and rebuilt the header.
                  <tr>
                    <td colSpan={totalColumns} className="px-0 py-0">
                      <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <Typography variant="body" tone="muted" className="mt-3">
                          {S.loadingData}
                        </Typography>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((row, rowIdx) => {
                    const custom = renderRow?.(row, {
                      index: effectiveCurrentPage * effectivePageSize + rowIdx,
                      colSpan: totalColumns,
                    })
                    if (custom != null) {
                      return <React.Fragment key={String(row.id ?? rowIdx)}>{custom}</React.Fragment>
                    }
                    return (
                      <tr
                        key={rowIdx}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={cn(
                          "border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50",
                          onRowClick && "cursor-pointer",
                        )}
                      >
                        {showIndexColumn && (
                          // Sr No reads at the same weight as other body
                          // cells (`text-gray-700 dark:text-zinc-300`) —
                          // the previous `text-gray-400` rendered as
                          // "disabled" on plain (non-striped) rows.
                          // Header stays in muted gray below.
                          <td className="index-col px-3 py-2.5 text-right text-sm font-medium tabular-nums whitespace-nowrap text-gray-700 dark:text-zinc-300">
                            {effectiveCurrentPage * effectivePageSize + rowIdx + 1}
                          </td>
                        )}
                        {activeTabConfig?.columns.map((col) => {
                          const value = row[col.key]
                          const formatted = cellFormatter ? cellFormatter(value, col.key, row) : null
                          const rendered = formatted?.display !== undefined
                            ? formatted.display
                            : value != null ? String(value) : ""
                          const isBarcodeCol = col.key === "barcode" && value != null && value !== ""
                          const model = (row.model ?? row.deviceModel) as string | undefined
                          const serial = (row.serialNumber ?? row.serial) as string | undefined
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                // Text truncates at 200px with an ellipsis; the
                                // full value surfaces on hover via the STYLED
                                // tooltip `renderCell` wraps primitive values in.
                                // No native `title=` here — it would stack a second
                                // grey browser box under the styled one (§0.14
                                // double-tooltip). `truncate` expands to
                                // `overflow-hidden text-ellipsis whitespace-nowrap`.
                                "px-3 py-2.5 text-sm align-middle text-gray-700 dark:text-zinc-300",
                                // Actions keep their buttons on one line at full
                                // width (no ellipsis clip); every other cell
                                // truncates to its column width.
                                col.key === "actions" ? "whitespace-nowrap" : "truncate",
                                col.align === "right" && "right text-right",
                                col.align === "center" && "text-center",
                                col.label === "" && "w-0",
                                formatted?.className,
                              )}
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                // Explicit per-column width wins; otherwise cap
                                // at 200px so long content stays inside its
                                // column and shows `…` instead of pushing
                                // siblings off-screen. Actions override the
                                // `.premium-table td { max-width:0; overflow:hidden }`
                                // truncation trick so their buttons stay whole and
                                // the table scrolls instead of chopping them.
                                maxWidth:
                                  col.key === "actions" ? "none" : (col.width ?? "200px"),
                                overflow: col.key === "actions" ? "visible" : undefined,
                              }}
                            >
                              {renderCellContent(
                                value,
                                rendered,
                                isBarcodeCol,
                                model,
                                serial,
                                typeof row.stock_item_id === "string"
                                  ? row.stock_item_id
                                  : typeof row.id === "string"
                                    ? row.id
                                    : undefined,
                                col.key !== "actions",
                                col.noBarcodePrint ?? false,
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={totalColumns} className="px-0 py-0">
                      {emptyNode ?? (error ? (
                        <BmtErrorState config={error} />
                      ) : (
                        <BmtEmptyState
                          filtered={
                            effectiveSearch.trim() !== "" ||
                            Object.keys(effectiveColumnFilters).length > 0 ||
                            toolbarFiltersActive ||
                            externalFiltersActive
                          }
                          onClearFilters={() => {
                            // Hold the loading state across the clear→refetch gap
                            // so the create CTA never flashes.
                            setClearing(true)
                            // Reset table-internal state first, then notify
                            // the parent so its server-side `search` /
                            // `category_id` / etc. get cleared too. Without
                            // the parent reset, the listing falls back to
                            // a generic "No data" empty state because the
                            // API still returns nothing for the lingering
                            // filter values.
                            setSearchQuery("")
                            onSearchChange?.("")
                            setColumnFilters({})
                            setCurrentPage(0)
                            dateRange?.onChange(undefined)
                            parentOnClearFilters?.()
                          }}
                          config={emptyState}
                        />
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!hidePagination && (
          <TablePagination
            page={effectiveCurrentPage + 1}
            totalPages={totalPages}
            pageSize={effectivePageSize}
            total={effectiveTotalRows}
            isFetching={serverPagination?.isFetching}
            onPageChange={(p) => goToPage(p - 1)}
            onPageSizeChange={
              isServerPaged && serverPagination?.onPageSizeChange
                ? serverPagination.onPageSizeChange
                : !isServerPaged
                  ? (size) => {
                      setPageSize(size)
                      setCurrentPage(0)
                    }
                  : undefined
            }
            pageSizeOptions={serverPagination?.pageSizeOptions}
          />
        )}
      </Card>
    </div>
  )
}

function BmtEmptyState({
  filtered,
  onClearFilters,
  config,
}: {
  filtered: boolean
  onClearFilters: () => void
  config?: EmptyStateConfig
}) {
  const Icon = filtered ? SearchX : Inbox
  const title = filtered
    ? S.emptyState.filteredTitle
    : config?.title ?? S.emptyState.defaultTitle
  const description = filtered
    ? S.emptyState.filteredDescription
    : config?.description

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-2 flex justify-center text-gray-300 dark:text-zinc-700">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description && (
        // max-w-lg (not -sm) so the standard filtered message fits on ONE line
        // instead of orphaning the last word ("…to see more" / "rows.").
        // text-pretty keeps any longer/custom description from orphaning too.
        <Typography variant="body" tone="muted" className="max-w-lg text-pretty">
          {description}
        </Typography>
      )}
      {filtered ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          {S.emptyState.clearFilters}
        </button>
      ) : (
        config?.action && (
          <button
            type="button"
            onClick={config.action.onClick}
            className="mt-2 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            {config.action.label}
          </button>
        )
      )}
    </div>
  )
}

/** Load-error state (§12) — AlertTriangle + message + Retry. Shown in place of
 *  the empty state when `error` is set and there are no rows. */
function BmtErrorState({ config }: { config: ErrorStateConfig }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-2 flex justify-center text-destructive">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <Typography variant="body-strong">{config.title ?? S.errorState.title}</Typography>
      {(config.description ?? S.errorState.description) && (
        <Typography variant="body" tone="muted" className="max-w-sm">
          {config.description ?? S.errorState.description}
        </Typography>
      )}
      {config.onRetry && (
        <button
          type="button"
          onClick={config.onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          {S.errorState.retry}
        </button>
      )}
    </div>
  )
}

function FilterChipDropdown({
  label,
  options,
  value,
  onChange,
  searchable,
}: {
  label: string
  options: string[]
  value?: string
  onChange: (next: string) => void
  searchable: boolean
}) {
  const normalized = React.useMemo(
    () => options.map((opt) => ({ id: opt, name: opt })),
    [options],
  )
  const useOptions = React.useMemo(
    () => makeStaticAsyncOptions(normalized, (o) => o.name),
    [normalized],
  )
  const selected: AsyncSelectOption | null = value
    ? { id: value, label: value }
    : null

  return (
    <div className="w-[190px]">
      <AsyncSelect
        value={selected}
        onValueChange={(next) => onChange(next?.id ?? "__all__")}
        useOptions={useOptions}
        toLabel={(o) => o.name}
        placeholder={S.toolbar.allFilter(label)}
        allOption={S.toolbar.allFilter(label)}
        searchPlaceholder={S.toolbar.searchFilter(label)}
        searchable={searchable}
        className="h-9 rounded-[7px] border-input bg-card px-[10px] text-[13px] text-foreground shadow-xs"
        // X clear when a value is picked. Resets to "__all__" so the
        // parent's onChange treats it as no filter.
        clearable
        chevron="down"
      />
    </div>
  )
}

export { BusinessMetricsTable }
export type {
  BusinessMetricsTableProps,
  TabConfig,
  ColumnDef,
  CellFormatter,
  // Consumers driving `serverPagination.sort` need this to type their own
  // sort state; without it they had to import the twin from `@modules/crm`,
  // which is a cross-module import for a type this component owns.
  SortDirection,
  EmptyStateConfig,
  ErrorStateConfig,
  ToolbarFilter,
}
