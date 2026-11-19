import { useNavigate } from "react-router-dom"

import type { CellFormatter, ColumnDef } from "@/components/common/tables/BusinessMetricsTable"
import { useUrlPagination } from "@shared/hooks"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { formatINR } from "@/lib/currency"
import { PURCHASE_ORDER_PAGE_SIZE } from "../../constants"
import { useMyPoApprovals } from "../../hooks/purchase-orders/usePurchaseOrders"
import { PURCHASE_ORDERS_STRINGS } from "../purchase-orders/purchase-orders.strings"
import { PM_APPROVALS_STRINGS } from "./pm-approvals.strings"
import { PO_SORT, PO_SORT_KEYS } from "./pm-queue-sort"
import { PmQueueTable /* , ReviewAction */ } from "./PmQueueTable"
import { RecordLink } from "./RecordLink"
import { toSortParam, usePmQueueFilters } from "../../hooks/pm-approvals/usePmQueueFilters"
import { UserMultiFilter } from "./QueueFilters"
import { formatDate } from "../../pm-approvals-shared"

const COLS = PURCHASE_ORDERS_STRINGS.approvals.inboxTab.columns

const PO_COLUMNS: ColumnDef[] = [
  { key: "po_number", label: PM_APPROVALS_STRINGS.poQueue.columns.poNumber, width: "200px", sortable: true },
  { key: "supplier", label: COLS.supplier },
  { key: "my_pending_line_count", label: COLS.myPendingLines, align: "right" },
  { key: "grand_total", label: COLS.grandTotal, align: "right", sortable: true },
  { key: "created_by_name", label: PM_APPROVALS_STRINGS.poQueue.columns.createdBy },
  { key: "created_at", label: PM_APPROVALS_STRINGS.poQueue.columns.createdAt, sortable: true },
  // Action column (Review) — commented out; rows still open the approval card.
  // { key: "actions", label: COLS.action, align: "right" },
]

/**
 * Real (backend-wired) Purchase Order tab for the PM-approvals inbox.
 * Lists POs awaiting the current user's per-line sign-off and links to the
 * focused approval card. Renders on the shared PmQueueTable like every tab.
 */
export function RealPoApprovalsTab() {
  const navigate = useNavigate()
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    pageKey: "po_page",
    sizeKey: "po_size",
    defaultSize: PURCHASE_ORDER_PAGE_SIZE,
  })
  // Toolbar search (PO number / supplier), URL-backed under `po_q`.
  const filters = usePmQueueFilters("po", PO_SORT_KEYS)
  // Same param shape as the page's PO badge query (page 1 → one shared request).
  const query = useMyPoApprovals({
    page,
    page_size: pageSize,
    search: filters.search || undefined,
    user_id: filters.userIds,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    sort: toSortParam(filters.sort, PO_SORT),
  })
  // Opens the PO approval card inside PM Approvals (PMApprovalDetailBody
  // `po`), so the sidebar + back-arrow stay in this section.
  const openPo = (id: string) => navigate(`/procurement/pm-approvals/po/${id}`)

  const cellFormatter: CellFormatter = (_v, key, row) => {
    if (key === "po_number") {
      return {
        display: (
          <RecordLink to={`/procurement/pm-approvals/po/${String(row.id)}`}>{String(row.po_number)}</RecordLink>
        ),
      }
    }
    if (key === "supplier") {
      return { display: (row.supplier as { name?: string } | null)?.name ?? "—" }
    }
    if (key === "grand_total") return { display: formatINR(Number(row.grand_total)) }
    if (key === "created_by_name") return { display: (row.created_by_name as string | null) ?? "—" }
    if (key === "created_at") return { display: formatDate(String(row.created_at)) }
    // Review button — commented out with the Action column.
    // if (key === "actions") return { display: <ReviewAction onClick={() => openPo(String(row.id))} /> }
    return null
  }

  return (
    <PmQueueTable
      id="po"
      sort={{ ...filters.sort, onChange: filters.setSort }}
      label={PM_APPROVALS_STRINGS.tabs.purchaseOrder}
      columns={PO_COLUMNS}
      rows={(query.data?.items ?? []) as unknown as Record<string, unknown>[]}
      cellFormatter={cellFormatter}
      onRowClick={(row) => openPo(String(row.id))}
      pager={{
        page,
        pageSize,
        total: query.data?.total ?? 0,
        isFetching: query.isFetching,
        setPage,
        setPageSize,
      }}
      search={{
        value: filters.searchInput,
        onChange: filters.setSearch,
        placeholder: PM_APPROVALS_STRINGS.queueFilters.search.po,
      }}
      toolbarFilters={[
        {
          key: "user",
          label: PM_APPROVALS_STRINGS.queueFilters.userFilterLabel,
          value: filters.userIds.join(","),
          options: [],
          render: () => (
            <UserMultiFilter
              value={filters.userIds}
              onChange={filters.setUserIds}
              placeholder={PM_APPROVALS_STRINGS.queueFilters.createdBy}
            />
          ),
        },
      ]}
      dateRange={{
        value: filters.dateRange,
        onChange: filters.setDateRange,
        placeholder: PM_APPROVALS_STRINGS.queueFilters.createdDate,
      }}
      onClearFilters={filters.clear}
      filtersActive={filters.active}
      emptyTitle={PM_APPROVALS_STRINGS.poQueue.emptyTitle}
      emptyDescription={PM_APPROVALS_STRINGS.poQueue.emptyDescription}
      errorNode={
        query.isError ? (
          <LoadErrorState error={query.error} fallback={PURCHASE_ORDERS_STRINGS.approvals.loadFailed} />
        ) : undefined
      }
    />
  )
}
