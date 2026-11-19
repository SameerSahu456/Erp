import { useMemo, type CSSProperties, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  BusinessMetricsTable,
  type CellFormatter,
  type ColumnDef,
  type ToolbarFilter,
} from "@/components/common/tables/BusinessMetricsTable"
import { PAGINATION } from "@/shared/constants"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"

import { PM_APPROVALS_STRINGS } from "./pm-approvals.strings"

/** The "Review" action for queues decided on their detail page. */
export function ReviewAction({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="xs"
      variant="outline"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {PM_APPROVALS_STRINGS.queueTable.review}
    </Button>
  )
}

/** Column keys that hold row actions rather than data. */
const ACTION_KEYS = new Set(["actions", "status"])

interface PmQueueTableProps {
  id: string
  label: string
  /** Each tab keeps its own columns + data; only the table itself is shared. */
  columns: ColumnDef[]
  rows: Record<string, unknown>[]
  cellFormatter?: CellFormatter
  onRowClick: (row: Record<string, unknown>) => void
  pager?: {
    page: number
    pageSize: number
    total: number
    isFetching: boolean
    setPage: (n: number) => void
    setPageSize: (n: number) => void
  }
  emptyTitle: string
  emptyDescription?: string
  /** Rendered in place of the rows on a load failure (LoadErrorState). */
  errorNode?: ReactNode
  /** Server-side search box (Accounts-page toolbar). Omit for no search. */
  search?: { value: string; onChange: (value: string) => void; placeholder: string }
  /** Toolbar filter controls (e.g. the multi-select Account / User filters). */
  toolbarFilters?: ToolbarFilter[]
  /** Clears this tab's search + filters (the empty state's "Clear filters"). */
  onClearFilters?: () => void
  /** Whether any search / filter is applied — drives the filtered empty state. */
  filtersActive?: boolean
  /** Server-side sort (URL-backed). Columns opt in with `sortable: true`. */
  sort?: {
    column: string | null
    direction: "asc" | "desc" | null
    onChange: (column: string | null, direction: "asc" | "desc" | null) => void
  }
  /** Toolbar date-range picker (created / submitted date). */
  dateRange?: {
    value: DateRange | undefined
    onChange: (next: DateRange | undefined) => void
    placeholder: string
  }
}

/**
 * The one table every PM-approval tab renders: Accounts' table skin, Sr-No,
 * a fixed-layout grid (`.pm-queue-table` in comprint.css) so columns spread
 * evenly on every tab, and the shared numbered pager.
 */
export function PmQueueTable({
  id,
  label,
  columns,
  rows,
  cellFormatter,
  onRowClick,
  pager,
  emptyTitle,
  emptyDescription,
  errorNode,
  search,
  toolbarFilters,
  onClearFilters,
  filtersActive = false,
  dateRange,
  sort,
}: PmQueueTableProps) {
  // One alignment rule for every tab: numeric columns (declared `align:
  // "right"` by each tab — counts, totals) are centred, text is left-aligned,
  // and a trailing action column (buttons / status badge) sits right.
  const alignedColumns = columns.map((col, i) => ({
    ...col,
    align:
      i === columns.length - 1 && ACTION_KEYS.has(col.key)
        ? ("right" as const)
        : col.align === "right"
          ? ("center" as const)
          : ("left" as const),
  }))

  // BusinessMetricsTable's hover tooltip reads the RAW row value — so a cell
  // formatted from an id / timestamp / number (Created By → user id, Raised →
  // ISO string, Total → 11.8) tooltipped the raw value, not what's on screen.
  // Hand BMT display rows instead: every cell the formatter renders as plain
  // text carries that text as its value, so tooltip === what the user sees.
  // `original` maps each display row back so the formatter and row-click
  // handler still receive the untouched wire row.
  const { displayRows, original } = useMemo(() => {
    const original = new WeakMap<Record<string, unknown>, Record<string, unknown>>()
    const displayRows = rows.map((row) => {
      const display: Record<string, unknown> = { ...row }
      for (const col of columns) {
        const out = cellFormatter?.(row[col.key], col.key, row)?.display
        if (typeof out === "string" || typeof out === "number") display[col.key] = out
      }
      original.set(display, row)
      return display
    })
    return { displayRows, original }
  }, [rows, columns, cellFormatter])
  const toOriginal = (row: Record<string, unknown>) => original.get(row) ?? row
  const displayFormatter: CellFormatter | undefined = cellFormatter
    ? (_value, key, row) => {
        const src = toOriginal(row)
        return cellFormatter(src[key], key, src)
      }
    : undefined

  return (
    // `--pm-cols` sizes the table's min-width in comprint.css so a narrow
    // screen scrolls horizontally instead of crushing columns to "S…".
    // `bmt-search-md` + `filterSize="default"` = the WMS list toolbar (see
    // SalesReturnRequestsBody); heights / search width come from the
    // module-wide `.procurement-search-scope`.
    <div className="bmt-search-md" style={{ "--pm-cols": columns.length } as CSSProperties}>
      <BusinessMetricsTable
        className="cpt-compact crm-premium-table pm-queue-table"
        filterSize="default"
        tabs={[{ id, label, columns: alignedColumns, data: displayRows }]}
        showIndex
        searchable={Boolean(search)}
        searchValue={search?.value}
        onSearchChange={search?.onChange}
        searchPlaceholder={search?.placeholder}
        toolbarFilters={toolbarFilters}
        // PM Approvals keeps the original plain native hover on its date filter.
        dateRange={dateRange && { ...dateRange, nativeTitle: true }}
        onClearFilters={onClearFilters}
        externalFiltersActive={filtersActive}
        // Long text (account / vendor / reason / user names): one line clipped
        // to the column with an ellipsis, full value in a hover tooltip. The cap
        // is generous — the column width is what actually clips.
        maxCellChars={200}
        pageSize={PAGINATION.DEFAULT_PAGE_SIZE}
        cellFormatter={displayFormatter}
        onRowClick={(row) => onRowClick(toOriginal(row))}
        serverPagination={
          pager
            ? {
                page: pager.page,
                pageSize: pager.pageSize,
                total: pager.total,
                isFetching: pager.isFetching,
                onPageChange: pager.setPage,
                onPageSizeChange: pager.setPageSize,
                pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
                ...(sort
                  ? {
                      sort: { column: sort.column, direction: sort.direction },
                      onSortChange: sort.onChange,
                    }
                  : {}),
              }
            : undefined
        }
        emptyState={{ title: emptyTitle, description: emptyDescription }}
        emptyNode={errorNode}
      />
    </div>
  )
}
