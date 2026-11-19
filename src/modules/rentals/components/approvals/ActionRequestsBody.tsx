import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { PAGINATION } from "@/shared/constants"
import { usePermission } from "@shared/rbac"

import type { ActionRequest } from "../../api/action-requests"
import { useActionRequests } from "../../hooks/approvals/useActionRequests"
import { rentalsCan } from "../../permissions"
import { type PageHeaderOverride, resolvePageHeader } from "../shared/page-header-override"
import { StatusTabbedList } from "../shared/StatusTabbedList"
import {
  ACTION_REQUEST_COLUMNS,
  ACTION_REQUEST_TABS,
  actionRequestVariant,
  toActionRequestRow,
} from "./action-requests.columns"
import { APPROVALS_STRINGS } from "./approvals.strings"
import { DecideActionRequestDialog } from "./DecideActionRequestDialog"

const S = APPROVALS_STRINGS.actions
const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

/** Invoice deletions waiting for a decision (2026-11-14). Terminations are
 *  decided in the Early exit queue with their charge (2026-11-15). An
 *  approver opens a pending row to decide it; anyone else's click goes to
 *  the invoice it is against. */
export function ActionRequestsBody({ header }: { header?: PageHeaderOverride }) {
  const navigate = useNavigate()
  const pageHeader = resolvePageHeader(header, APPROVALS_STRINGS.title)
  const canDecide = usePermission().can([...rentalsCan.approveInvoiceDelete])
  const [tab, setTab] = useState<string>("pending")
  const [page, setPage] = useState(1)
  const [deciding, setDeciding] = useState<ActionRequest | null>(null)

  const status = ACTION_REQUEST_TABS.find((t) => t.id === tab)?.status
  const query = useActionRequests({ subject: "invoice_delete", status, page, page_size: PAGE_SIZE })
  const rows = (query.data?.items ?? []).map(toActionRequestRow)

  const openTarget = (r: ActionRequest) =>
    navigate(
      r.rental_invoice_id
        ? `/rentals/invoices/${r.rental_invoice_id}`
        : `/rentals/agreements/${r.sales_order_id}`,
    )

  return (
    <>
      <StatusTabbedList
        title={pageHeader.title}
        subtitle={S.invoiceDeleteSubtitle}
        toolbar={pageHeader.toolbar}
        tabs={ACTION_REQUEST_TABS}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id)
          setPage(1)
        }}
        columns={ACTION_REQUEST_COLUMNS}
        rows={rows}
        variantOf={actionRequestVariant}
        persistKey="rentals-action-requests-invoice_delete"
        onRowClick={(row) => {
          const r = row._row as ActionRequest
          if (canDecide && r.status === "pending") setDeciding(r)
          else openTarget(r)
        }}
        query={query}
        pagination={{ page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onPageChange: setPage }}
        emptyState={S.empty}
        loadError={S.loadError}
      />
      {deciding && (
        <DecideActionRequestDialog
          row={{
            ...deciding,
            earlyExitAmount: deciding.early_exit_amount,
            waiveRequested: deciding.waive_early_exit,
          }}
          onClose={() => setDeciding(null)}
        />
      )}
    </>
  )
}
