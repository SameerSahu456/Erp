import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { EMPTY_VALUE, PAGINATION } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"

import type { RentalSalesOrderRow } from "../../api/sales-orders"
import { RENTAL_STATUS_LABELS } from "../../constants/billing"
import { useRentalSalesOrders } from "../../hooks/agreements/useRentalSalesOrders"
import { type PageHeaderOverride, resolvePageHeader } from "../shared/page-header-override"
import { StatusTabbedList } from "../shared/StatusTabbedList"
import { APPROVALS_STRINGS } from "./approvals.strings"

const S = APPROVALS_STRINGS.agreements
const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
// A configured new order waits here until `rentals:agreement_approve`
// puts it in force from its own page.
const AWAITING = "PendingSignature"
const TABS = [{ id: "waiting", label: S.tabs.waiting }] as const
const COLUMNS = [
  { key: "order", label: S.columns.order, width: "20%" },
  { key: "customer", label: S.columns.customer, width: "35%" },
  { key: "start", label: S.columns.start, width: "15%" },
  { key: "end", label: S.columns.end, width: "15%" },
  { key: "status", label: S.columns.status, width: "15%" },
]

function toRow(r: RentalSalesOrderRow): Record<string, unknown> {
  return {
    id: r.sales_order_id,
    order: r.order_number,
    customer: r.account_name ?? EMPTY_VALUE,
    start: r.start_date ? formatIST_date(r.start_date) : EMPTY_VALUE,
    end: r.end_date ? formatIST_date(r.end_date) : EMPTY_VALUE,
    status: RENTAL_STATUS_LABELS[AWAITING],
    _status: AWAITING,
  }
}

/** New rental orders whose configured terms wait for approval. The decision
 *  is made on the order's own page, where the terms are shown in full. */
export function AgreementApprovalsBody({ header }: { header?: PageHeaderOverride }) {
  const navigate = useNavigate()
  const pageHeader = resolvePageHeader(header, APPROVALS_STRINGS.title)
  const [page, setPage] = useState(1)
  const query = useRentalSalesOrders({ rental_status: [AWAITING], page, page_size: PAGE_SIZE })

  return (
    <StatusTabbedList
      title={pageHeader.title}
      subtitle={S.subtitle}
      toolbar={pageHeader.toolbar}
      tabs={TABS}
      activeTab="waiting"
      onTabChange={() => undefined}
      columns={COLUMNS}
      rows={(query.data?.items ?? []).map(toRow)}
      variantOf={() => "warning"}
      persistKey="rentals-agreement-approvals"
      onRowClick={(row) => navigate(`/rentals/agreements/${String(row.id)}`)}
      query={query}
      pagination={{ page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onPageChange: setPage }}
      emptyState={S.empty}
      loadError={S.loadError}
    />
  )
}
