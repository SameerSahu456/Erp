import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
// SORT (disabled): chevron icons used only by the sortable headers below.
// import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
// import { cn } from "@/lib/utils" // SORT (disabled): only the sort header used it
import { formatINR, formatINRCompact } from "@/lib/currency"
import { formatIST, formatIST_date } from "@shared/lib/date"
import { PAGINATION } from "@/shared/constants"
import { useMemoryState, useUrlPagination } from "@/shared/hooks"

import type { SalesOrderListItemWire, SOStatus } from "../../api"
import {
  SO_STATUS_LABELS,
  SO_STATUS_VARIANT,
} from "../../constants/so-status"
// Through the rentals barrel (§7): CRM places the agreement state, rentals
// owns what the state is and where it links.
import {
  BlankAgreementCells,
  RENTAL_AGREEMENT_CELL_COUNT,
  RentalAgreementCells,
} from "@modules/rentals"
import { useSalesOrders } from "../../hooks/sales-orders/useSalesOrders"
import { useOrderTabFilters } from "../../hooks/sales-orders/useOrderTabFilters"
import { CellTooltip, HeadTooltip } from "../shared/CellTooltip"
import { CrmListFilterPanel } from "../shared/CrmListFilterPanel"
import { EmbeddedEmptyRow } from "../shared/EmbeddedEmptyRow"
import { EmbeddedFilterLayout } from "../shared/EmbeddedFilterLayout"
import {
  EmbeddedDateRangeFilter,
  EmbeddedSelectFilter,
  EmbeddedListToolbar,
} from "../shared/EmbeddedListToolbar"
import { UserNamesCell } from "../shared/UserNamesCell"
import { SALES_ORDERS_STRINGS as S } from "./sales-orders.strings"

export interface OrdersSectionProps {
  /** Which polymorphic filter to apply on the SO list endpoint
   *  (`GET /crm/sales-orders?account_id= | lead_id= | deal_id=`). */
  source: "account" | "lead" | "deal"
  /** UUID of the account / lead / deal whose sales orders we're scoping to. */
  sourceId: string
}

// SORT (disabled) — column sorting on this embedded view is commented out for now.
// Re-enable by restoring (1) the lucide import above, (2) these types, (3) the sort
// state + `handleSort`, (4) the `sort` param on the query, (5) the three
// `<SortableHeader>` headers, and (6) the `SortableHeader` component at the bottom.
// Sortable columns on this embedded view were Total / Created On / Submitted On.
// type SortColumn = "grand_total" | "created_at" | "submitted_at"
// type SortDirection = "asc" | "desc"

// The one Sales Orders tab body — used by the Account, Lead and Deal detail
// pages. Pass the parent kind + id; it fetches and renders the table. Change the
// columns here and every detail page follows.
export function OrdersSection({ source, sourceId }: OrdersSectionProps) {
  const navigate = useNavigate()

  // §16.7 — server pagination.
  // Page + size live in the URL (`so_page` / `so_size`) next to the tab's filters
  // (`so_*`), so a refresh, a shared link and a trip into an order and back all keep
  // them; a filter change drops `so_page` (page 1).
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "so_size",
    pageKey: "so_page",
    defaultSize: PAGINATION.DEFAULT_PAGE_SIZE,
  })
  /* SORT (disabled) — restore with the items listed at the top of this file.

  // Local (not URL-backed) sort state — this is a tab inside a detail page, so
  // the sort doesn't need to survive deep-links / browser back. Initialised to
  // "newest first" to match the backend's default `-created_at`.
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const sortToken = `${sortDirection === "desc" ? "-" : ""}${sortColumn}`

  // Two-stage toggle: click the active column to flip asc ⇄ desc; click a
  // different column to switch to it in `desc`. Resets paging to page 1.
  function handleSort(column: SortColumn) {
    setPage(1)
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
      return
    }
    setSortColumn(column)
    setSortDirection("desc")
  }
  */

  // Search + filters (shared toolbar). Any change jumps back to page 1.
  const filters = useOrderTabFilters()

  // Starts open when a filter is already in the URL (refresh / shared link), then
  // stays as the user left it across detail round-trips.
  const [filtersOpen, setFiltersOpen] = useMemoryState(
    `crm:tab:orders:${source}:${sourceId}:open`,
    () => filters.asideActiveCount > 0,
  )

  const listQuery = useSalesOrders({
    account_id: source === "account" ? sourceId : undefined,
    lead_id: source === "lead" ? sourceId : undefined,
    deal_id: source === "deal" ? sourceId : undefined,
    // sort: sortToken, // SORT (disabled) — the API default (newest first) applies
    page,
    page_size: pageSize,
    ...filters.queryParams,
  })

  const items = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  )
  const hasRental = items.some((so) => so.sellable_type === "rental_sales")
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const isLoading = listQuery.isLoading && items.length === 0

  if (listQuery.isError) {
    return <LoadErrorState error={listQuery.error} fallback={S.section.loadError} />
  }

  return (
    <EmbeddedFilterLayout
      open={filtersOpen}
      onClose={() => setFiltersOpen(false)}
      activeFilterCount={filters.asideActiveCount}
      aside={
        <CrmListFilterPanel
          selects={[]}
          createdBy={{
            label: S.section.filters.submittedBy,
            value: filters.submittedBy,
            onChange: filters.setSubmittedBy,
          }}
          userMultiSelects={[
            {
              key: "approvedBy",
              label: S.section.filters.approvedBy,
              value: filters.approvedBy,
              onChange: filters.setApprovedBy,
            },
          ]}
          categoryOem={{
            categories: filters.categories,
            onCategoriesChange: filters.setCategories,
            oems: filters.oems,
            onOemsChange: filters.setOems,
          }}
          valueRange={{
            label: S.section.filters.total,
            value: filters.total,
            onChange: filters.setTotal,
          }}
          activeFilterCount={filters.asideActiveCount}
          onResetAll={filters.resetAside}
        />
      }
    >
      {/* Search + filters (shared with the Deals / Quotes tabs). Always shown — an empty tab keeps its filters and shows the empty state below. */}
      {(
        <EmbeddedListToolbar
          search={filters.search}
          onSearchChange={filters.setSearch}
          searchPlaceholder={S.section.filters.searchPlaceholder}
          asideOpen={filtersOpen}
          onToggleAside={() => setFiltersOpen((v) => !v)}
          asideActiveCount={filters.asideActiveCount}
          onClearAside={filters.resetAside}
        >
          <EmbeddedDateRangeFilter
            label={S.section.filters.submittedOn}
            value={filters.submittedOn}
            onChange={filters.setSubmittedOn}
          />
          {/* Single-select, same as the Quotes list page's Status filter. The URL
              keeps its list format (`so_status`), so this is one value or none. */}
          <EmbeddedSelectFilter
            label={S.section.filters.status}
            allLabel={S.list.filters.statusAll}
            value={filters.statuses[0] ?? ""}
            options={SO_STATUS_OPTIONS}
            onChange={(next) => filters.setStatuses(next ? [next as SOStatus] : [])}
          />
        </EmbeddedListToolbar>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      )}

      {!isLoading && (
        <div>
          {/* Same as the Accounts list: columns size to their content (even gaps, no ellipsis),
              and a table wider than its card scrolls sideways inside it. */}
          <Table className="min-w-full whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead><HeadTooltip label={S.section.columns.orderNumber} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.status} /></TableHead>
                {/* SORT (disabled): <SortableHeader label={S.section.columns.total} column="grand_total" ... /> */}
                <TableHead className="pr-6 text-right"><HeadTooltip label={S.section.columns.total} /></TableHead>
                {/* SORT (disabled): <SortableHeader label={S.section.columns.createdOn} column="created_at" ... /> */}
                <TableHead><HeadTooltip label={S.section.columns.createdOn} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.submittedBy} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.approvedBy} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.categories} /></TableHead>
                {/* SORT (disabled): <SortableHeader label={S.section.columns.submittedOn} column="submitted_at" ... /> */}
                <TableHead><HeadTooltip label={S.section.columns.submittedOn} /></TableHead>
                {/* Rental orders only — dropped when the list holds no rental. One
                    header per cell `RentalAgreementCells` renders. */}
                {hasRental &&
                  S.section.columns.agreement.map((label) => (
                    <TableHead key={label}><HeadTooltip label={label} /></TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <EmbeddedEmptyRow
                  colSpan={8 + (hasRental ? RENTAL_AGREEMENT_CELL_COUNT : 0)}
                  filtered={filters.hasActive}
                  emptyTitle={S.section.emptyTitle(source)}
                  onClearFilters={filters.clearAll}
                />
              ) : items.map((so) => (
                <OrderRow
                  key={so.id}
                  so={so}
                  showAgreement={hasRental}
                  onOpen={() => navigate(`/crm/sales-orders/${so.id}`)}
                />
              ))}
            </TableBody>
          </Table>
          {total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              isFetching={listQuery.isFetching}
              onPageChange={setPage}
              // setPageSize also drops the page key in the same URL update; a follow-up
              // setPage(1) would read the stale URL and undo the size change.
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}
    </EmbeddedFilterLayout>
  )
}

// Every sales-order status the tab can show — the labels come from the domain map.
const SO_STATUS_OPTIONS = Object.entries(SO_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

interface OrderRowProps {
  so: SalesOrderListItemWire
  /** Render the rental Agreement cell (the list holds a rental order). */
  showAgreement: boolean
  onOpen: () => void
}

function OrderRow({ so, showAgreement, onOpen }: OrderRowProps) {
  const isRental = so.sellable_type === "rental_sales"
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell>
        {/* Label badges (e.g. RENTAL) are hidden for now — restore by rendering
            `so.labels` as outline Badges here. */}
        <span className="inline-flex items-center gap-2">
          <CellTooltip text={so.order_number} className="truncate">
            <Link
              to={`/crm/sales-orders/${so.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-primary hover:underline"
            >
              {so.order_number}
            </Link>
          </CellTooltip>
          {/* A plain sale and a rental read very differently — the rental
              recurs — so the row says which it is. */}
          {isRental && <StatusBadge variant="info">{S.entitySection.rentalTag}</StatusBadge>}
        </span>
      </TableCell>
      <TableCell>
        <StatusBadge variant={SO_STATUS_VARIANT[so.status] ?? "neutral"} className="max-w-full">
          <CellTooltip
            text={SO_STATUS_LABELS[so.status] ?? so.status}
            className="truncate"
          >
            {SO_STATUS_LABELS[so.status] ?? so.status}
          </CellTooltip>
        </StatusBadge>
      </TableCell>
      <TableCell className="pr-6 text-right font-semibold tabular-nums">
        {/* Hover shows the exact amount to the paisa. */}
        <CellTooltip text={formatINR(so.grand_total ?? 0)} className="truncate">
          {formatINRCompact(so.grand_total ?? 0, { decimals: true })}
        </CellTooltip>
      </TableCell>
      <TableCell>
        <CellTooltip text={formatIST(so.created_at)} className="truncate">
          {formatIST_date(so.created_at)}
        </CellTooltip>
      </TableCell>
      {/* Submitted "who/when" pair — Draft SOs have no submitter yet, so
          UserNamesCell renders its own empty-state and the date cell falls
          back to an em dash. Both read as "not yet submitted" rather than
          empty cells. */}
      <TableCell>
        <UserNamesCell users={so.submitted_by_detail ? [so.submitted_by_detail] : []} />
      </TableCell>
      <TableCell>
        <OverflowPillList
          items={so.approved_by ?? []}
          getItemKey={(u) => u.id}
          getItemLabel={(u) => u.name ?? "—"}
          summaryLabel={S.section.approvedByPill.summaryLabel}
          hoverTitle={S.section.approvedByPill.hoverTitle}
        />
      </TableCell>
      <TableCell>
        <OverflowPillList
          items={so.categories ?? []}
          getItemKey={(category) => category}
          getItemLabel={(category) => category}
          summaryLabel={S.section.categoriesPill.summaryLabel}
          hoverTitle={S.section.categoriesPill.hoverTitle}
        />
      </TableCell>
      <TableCell>
        {so.submitted_at ? (
          <CellTooltip text={formatIST(so.submitted_at)} className="truncate">
            {formatIST_date(so.submitted_at)}
          </CellTooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      {showAgreement &&
        // Rental rows only: did the order we closed actually start billing?
        // A plain sale has no agreement and costs no request — it fills the
        // same columns with dashes so the row stays aligned.
        (isRental ? <RentalAgreementCells salesOrderId={so.id} /> : <BlankAgreementCells />)}
    </TableRow>
  )
}

/* SORT (disabled) — clickable sort header for the embedded SO section; unused while
   sorting is commented out. Restore together with the items listed at the top.

interface SortableHeaderProps {
  label: string
  column: SortColumn
  activeColumn: SortColumn
  direction: SortDirection
  onToggle: (column: SortColumn) => void
  align?: "left" | "right"
}

// Minimal clickable header for the embedded SO section — asc ⇄ desc toggle,
// chevron reflects current state (highlighted when this column is active,
// dimmed otherwise). Not using the full CrmDataTable here because the
// detail-tab wants the lighter shadcn `<Table>` chrome, so we keep the sort
// affordance scoped to this file.
function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onToggle,
  align = "left",
}: SortableHeaderProps) {
  const isActive = activeColumn === column
  const Icon = !isActive
    ? ChevronsUpDown
    : direction === "asc"
      ? ChevronUp
      : ChevronDown
  return (
    <button
      type="button"
      onClick={() => onToggle(column)}
      className={cn(
        // Inherit the TableHead's own typography (font-medium / text-foreground
        // / default text size) so a sortable header reads identical to the
        // non-sortable ones (Order No, Status) sitting next to it. Only the
        // chevron carries the sort hint; the label stays full-weight.
        "inline-flex w-full min-w-0 items-center gap-0.5 font-medium text-foreground",
        align === "right" ? "justify-end" : "justify-start",
      )}
    >
      <HeadTooltip label={label} />
      <Icon
        className={cn(
          "size-3 shrink-0 text-muted-foreground",
          isActive ? "opacity-100" : "opacity-60",
        )}
      />
    </button>
  )
}
*/
