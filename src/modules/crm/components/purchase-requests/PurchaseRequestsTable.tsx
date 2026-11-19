import { CheckCircle2, Clock, Eye } from "lucide-react"
import { Link } from "react-router-dom"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { StatusBadge } from "@/components/common/display/StatusBadge"

import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import { PURCHASE_REQUESTS_STRINGS } from "./purchase-requests.strings"
import { PR_WORKFLOW_STATUS_VARIANT } from "../../constants/pr-status"
import type { PurchaseRequestsListController } from "../../hooks/purchase-requests/usePurchaseRequestsList"

const LIST_STRINGS = PURCHASE_REQUESTS_STRINGS.list

const columns = [
  { key: "prNumber", label: LIST_STRINGS.columns.prNumber, sortable: true },
  { key: "salesOrderNumber", label: LIST_STRINGS.columns.linkedSO, sortable: true },
  { key: "status", label: LIST_STRINGS.columns.status, sortable: true, filterable: true },
  { key: "pmApproval", label: LIST_STRINGS.columns.pmApprovals },
  { key: "categories", label: LIST_STRINGS.columns.categories },
  { key: "itemsCount", label: LIST_STRINGS.columns.items, sortable: true, align: "right" as const },
  { key: "requestedBy", label: LIST_STRINGS.columns.requestedBy, sortable: true },
  { key: "createdAt", label: LIST_STRINGS.columns.created, sortable: true },
  { key: "actions", label: "" },
]

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "prNumber") {
    return {
      display: (
        <Link to={`/crm/purchase-requests/${row.id}/edit`} className="text-primary hover:underline font-medium">
          {value as string}
        </Link>
      ),
    }
  }
  if (key === "status") {
    const variant = PR_WORKFLOW_STATUS_VARIANT[value as string] ?? "neutral"
    return {
      display: <StatusBadge variant={variant}>{value as string}</StatusBadge>,
    }
  }
  if (key === "pmApproval") {
    const approved = row.pmApprovalCount as number
    const total = row.pmApprovalTotal as number
    const allDone = approved === total && total > 0
    return {
      display: (
        <span className="inline-flex items-center gap-1.5 text-sm">
          {allDone ? (
            <CheckCircle2 className="size-3.5 text-success" />
          ) : approved > 0 ? (
            <Clock className="size-3.5 text-warning" />
          ) : (
            <Clock className="size-3.5 text-muted-foreground" />
          )}
          <span className={allDone ? "text-success font-medium" : ""}>
            {value as string}
          </span>
        </span>
      ),
    }
  }
  if (key === "categories") {
    const cats = row.categoryList as string[]
    return {
      display: (
        <OverflowPillList
          items={cats}
          getItemKey={(category) => String(category)}
          getItemLabel={(category) => String(category)}
          summaryLabel={LIST_STRINGS.categoriesPill.summaryLabel}
          hoverTitle={LIST_STRINGS.categoriesPill.hoverTitle}
        />
      ),
    }
  }
  if (key === "actions") {
    return {
      display: (
        <Link
          to={`/crm/purchase-requests/${row.id}/edit`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Eye className="size-3.5" />
          {LIST_STRINGS.viewAction}
        </Link>
      ),
    }
  }
  return null
}

export function PurchaseRequestsTable({ list }: { list: PurchaseRequestsListController }) {
  const tabs: TabConfig[] = [
    { id: "all", label: `All (${list.rows.length})`, columns, data: list.rows },
    { id: "pending-pm", label: `Pending PM (${list.pendingPM.length})`, columns, data: list.pendingPM },
    { id: "procurement", label: `Procurement (${list.readyForProcurement.length})`, columns, data: list.readyForProcurement },
  ]

  return (
    <CrmDataTable
      className="bmt-search-wide crm-premium-table"
      tabs={tabs}
      cellFormatter={cellFormatter}
      pageSize={10}
      persistKey="crm-purchase-requests"
      onRowClick={(row) => list.goToEdit(String(row.id))}
      emptyState={{
        title: "No purchase requests yet",
        description: "Create a PR to kick off the approval flow for a sales order.",
        action: {
          label: "Create PR",
          onClick: list.goToNew,
        },
      }}
    />
  )
}
