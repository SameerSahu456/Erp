import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { PAGINATION } from "@/shared/constants"
import { useRentalReturnRequestsPendingPM } from "@modules/crm"
import { usePermission } from "@shared/rbac"

import type { EarlyExitQueueRow } from "../../api/early-exit"
import { useEarlyExitQueue } from "../../hooks/early-exit/useEarlyExit"
import { rentalsCan } from "../../permissions"
import { DecideActionRequestDialog } from "../approvals/DecideActionRequestDialog"
import { APPROVALS_STRINGS } from "../approvals/approvals.strings"
import { type PageHeaderOverride, resolvePageHeader } from "../shared/page-header-override"
import { StatusTabbedList } from "../shared/StatusTabbedList"
import { DecideWaiverDialog } from "./DecideWaiverDialog"
import { EARLY_EXIT_RETURN_COLUMNS, toEarlyExitReturnRow } from "./early-exit-returns.columns"
import {
  EARLY_EXIT_QUEUE_COLUMNS,
  EARLY_EXIT_QUEUE_TABS,
  earlyExitQueueVariant,
  toEarlyExitQueueRow,
} from "./early-exit-queue.columns"
import { EARLY_EXIT_STRINGS } from "./early-exit.strings"

const S = EARLY_EXIT_STRINGS.queue
const R = EARLY_EXIT_STRINGS.returns
const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
// Not a request status: the rental returns whose early line awaits a decision.
const RETURNS_TAB = "returns"

/** Approvals → Early exit (2026-11-15). Early exit IS the end of a contract,
 *  so terminations — each with the charge it raises and whether a waiver is
 *  asked, decided in one go — sit beside the waivers raised on their own.
 *  Whoever decides rental returns also gets the returns held because they
 *  end a rental early (approvals spec D1, RM44). A pending row opens its
 *  decision for whoever may make it; anything else opens its order. */
export function EarlyExitQueueBody({ header }: { header?: PageHeaderOverride } = {}) {
  const navigate = useNavigate()
  const pageHeader = resolvePageHeader(header, APPROVALS_STRINGS.title)
  const { can } = usePermission()
  const canDecideWaiver = can([...rentalsCan.approveEarlyExitWaiver])
  const canDecideTermination = can([...rentalsCan.approveTermination])
  const canDecideReturns = can([...rentalsCan.decideReturn])
  const [tab, setTab] = useState<string>("pending")
  const [page, setPage] = useState(1)
  const [deciding, setDeciding] = useState<EarlyExitQueueRow | null>(null)

  const onReturns = tab === RETURNS_TAB && canDecideReturns
  const status = EARLY_EXIT_QUEUE_TABS.find((t) => t.id === tab)?.status
  const queue = useEarlyExitQueue(
    { status: status ? [...status] : undefined, page, page_size: PAGE_SIZE },
    { enabled: !onReturns },
  )
  const returns = useRentalReturnRequestsPendingPM({ page, page_size: PAGE_SIZE }, { enabled: onReturns })
  const tabs = canDecideReturns ? [...EARLY_EXIT_QUEUE_TABS, { id: RETURNS_TAB, label: R.tab }] : EARLY_EXIT_QUEUE_TABS
  const view = onReturns
    ? {
        query: returns,
        columns: EARLY_EXIT_RETURN_COLUMNS,
        rows: (returns.data?.items ?? []).map(toEarlyExitReturnRow),
        // Every queued return is still waiting on a decision.
        variantOf: () => "warning" as const,
        emptyState: R.empty,
        loadError: R.loadError,
      }
    : {
        query: queue,
        columns: EARLY_EXIT_QUEUE_COLUMNS,
        rows: (queue.data?.items ?? []).map(toEarlyExitQueueRow),
        variantOf: earlyExitQueueVariant,
        emptyState: S.empty,
        loadError: S.loadError,
      }

  const open = (r: EarlyExitQueueRow) => {
    const mayDecide = r.kind === "termination" ? canDecideTermination : canDecideWaiver
    if (r.status === "pending" && mayDecide) setDeciding(r)
    else if (r.sales_order_id) navigate(`/rentals/agreements/${r.sales_order_id}`)
  }

  return (
    <>
      <StatusTabbedList
        title={pageHeader.title}
        subtitle={S.subtitle}
        toolbar={pageHeader.toolbar}
        tabs={tabs}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id)
          setPage(1)
        }}
        columns={view.columns}
        rows={view.rows}
        variantOf={view.variantOf}
        persistKey="rentals-early-exit-queue"
        onRowClick={(row) => {
          // The return's own page carries the approve / reject controls.
          if (onReturns) navigate(`/wms/rental-returns/${String(row.id)}`)
          else open(row._row as EarlyExitQueueRow)
        }}
        query={view.query}
        pagination={{ page, pageSize: PAGE_SIZE, total: view.query.data?.total ?? 0, onPageChange: setPage }}
        emptyState={view.emptyState}
        loadError={view.loadError}
      />
      {deciding ? <DecideEarlyExitRow row={deciding} onClose={() => setDeciding(null)} /> : null}
    </>
  )
}

/** A termination is decided with its charge (approve / approve and waive /
 *  reject); a waiver raised on its own keeps its own approve / reject. */
function DecideEarlyExitRow({ row, onClose }: { row: EarlyExitQueueRow; onClose: () => void }) {
  if (row.kind === "termination") {
    return (
      <DecideActionRequestDialog
        row={{
          id: row.id,
          subject: "terminate",
          reason: row.reason,
          earlyExitAmount: row.amount,
          waiveRequested: row.waive_requested,
          effectiveDate: row.effective_date,
        }}
        onClose={onClose}
      />
    )
  }
  return (
    <DecideWaiverDialog
      row={{
        id: row.id,
        subject: row.kind === "charge_waiver" ? "early_exit_charge" : "account_terms",
        reason: row.reason,
      }}
      onClose={onClose}
    />
  )
}
