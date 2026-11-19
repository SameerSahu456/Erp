import { useState } from "react"
import { Link } from "react-router-dom"

import {
  BusinessMetricsTable,
  type CellFormatter,
  type ColumnDef,
} from "@/components/common/tables/BusinessMetricsTable"
import { ListPageShell } from "@/components/page-shells"
import { Button } from "@/components/ui/button"
import { EMPTY_VALUE, PAGINATION } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"

import type { ExtendDecision, ExtendRequest } from "../../api/extend-requests"
import { RENTALS_LIST_MAX_CELL_CHARS } from "../../constants/list"
import { usePendingExtendRequests } from "../../hooks/approvals/useExtendRequests"
import { formatRentalDay } from "../../lib/format"
import { type PageHeaderOverride, resolvePageHeader } from "../shared/page-header-override"
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings"
import { APPROVALS_STRINGS } from "./approvals.strings"
import { DecideExtendRequestDialog } from "./DecideExtendRequestDialog"

const S = APPROVALS_STRINGS.rateChange
const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

const COLUMNS: ColumnDef[] = [
  { key: "order", label: S.columns.order },
  { key: "customer", label: S.columns.customer },
  { key: "endDate", label: S.columns.endDate },
  { key: "ratesFrom", label: S.columns.ratesFrom },
  { key: "units", label: S.columns.units, align: "right" },
  { key: "requestedBy", label: S.columns.requestedBy },
  { key: "raised", label: S.columns.raised },
  { key: "actions", label: S.columns.actions, align: "right" },
]

function toRow(request: ExtendRequest): Record<string, unknown> {
  return {
    id: request.id,
    order: request.order_number ?? EMPTY_VALUE,
    customer: request.account_name ?? EMPTY_VALUE,
    endDate: S.endMove(formatRentalDay(request.current_end_date), formatRentalDay(request.new_end_date)),
    ratesFrom: formatRentalDay(request.rate_effective_date),
    units: request.units_affected ?? 0,
    requestedBy: request.requested_by_name ?? EMPTY_VALUE,
    raised: formatIST_date(request.created_at),
    actions: "",
    _request: request,
  }
}

/** Approvals → Rate change: extends that carry new rates, waiting for a
 *  holder of `rentals:extend_approve`. Nothing on the order moves until one
 *  is approved (2026-11-16). */
export function ExtendApprovalsBody({ header }: { header?: PageHeaderOverride } = {}) {
  const pageHeader = resolvePageHeader(header, APPROVALS_STRINGS.types["rate-change"])
  const [page, setPage] = useState(1)
  const [deciding, setDeciding] = useState<{ request: ExtendRequest; decision: ExtendDecision } | null>(null)
  const query = usePendingExtendRequests({ page, page_size: PAGE_SIZE })
  const rows = (query.data?.items ?? []).map(toRow)

  const cellFormatter: CellFormatter = (_value, key, row) => {
    const request = row._request as ExtendRequest
    if (key === "order") {
      return {
        display: (
          <Link to={`/rentals/agreements/${request.sales_order_id}`} className="hover:underline">
            {String(row.order)}
          </Link>
        ),
      }
    }
    if (key !== "actions") return null
    return {
      display: (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setDeciding({ request, decision: "approve" })}>
            {C.approve}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDeciding({ request, decision: "reject" })}>
            {C.reject}
          </Button>
        </div>
      ),
    }
  }

  return (
    <ListPageShell title={pageHeader.title} subtitle={S.subtitle} toolbar={pageHeader.toolbar}>
      <BusinessMetricsTable
        showIndex
        maxCellChars={RENTALS_LIST_MAX_CELL_CHARS}
        // The pending queue takes no search; on a server-paged table BMT's own
        // box would filter nothing.
        searchable={false}
        tabs={[{ id: "pending", label: APPROVALS_STRINGS.types["rate-change"], columns: COLUMNS, data: rows }]}
        cellFormatter={cellFormatter}
        persistKey="rentals-extend-approvals"
        serverPagination={{
          page,
          pageSize: PAGE_SIZE,
          total: query.data?.total ?? 0,
          isFetching: query.isFetching,
          onPageChange: setPage,
        }}
        error={query.isError ? { title: S.loadError, onRetry: () => void query.refetch() } : undefined}
        emptyState={{ title: S.empty.title, description: S.empty.description }}
      />
      {deciding ? (
        <DecideExtendRequestDialog
          request={deciding.request}
          decision={deciding.decision}
          onClose={() => setDeciding(null)}
        />
      ) : null}
    </ListPageShell>
  )
}
