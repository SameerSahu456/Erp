import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

import type { StatCardData } from "@/components/common/display/StatsRow"

import { purchaseRequests } from "../../data/purchase-requests"

// Container logic for the Purchase Requests list: shape the mock rows, derive
// the PM-approval / procurement buckets, build the stat cards, and own nav.
export function usePurchaseRequestsList() {
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      purchaseRequests.map((pr) => {
        const approvedCount = pr.categoryApprovals.filter((a) => a.status === "Approved").length
        const totalApprovals = pr.categoryApprovals.length
        const categories = [...new Set(pr.items.map((i) => i.category))]

        return {
          id: pr.id,
          prNumber: pr.prNumber,
          salesOrderNumber: pr.salesOrderNumber ?? "—",
          status: pr.status,
          pmApproval: `${approvedCount}/${totalApprovals}`,
          pmApprovalCount: approvedCount,
          pmApprovalTotal: totalApprovals,
          categories: categories.join(", "),
          categoryList: categories,
          itemsCount: pr.items.length,
          requestedBy: pr.requestedBy,
          createdAt: pr.createdAt,
        }
      }),
    []
  )

  const pendingPM = useMemo(
    () => rows.filter((r) => ["Pending PM Approval", "Partially Approved"].includes(r.status)),
    [rows]
  )
  const readyForProcurement = useMemo(
    () => rows.filter((r) => ["Final Approved", "Sent to Procurement"].includes(r.status)),
    [rows]
  )

  const stats: StatCardData[] = [
    { label: "Total PRs", value: rows.length, accent: "primary" },
    { label: "Pending PM Approval", value: pendingPM.length, accent: "warning" },
    { label: "Ready for Procurement", value: readyForProcurement.length, accent: "success" },
  ]

  return {
    rows,
    pendingPM,
    readyForProcurement,
    stats,
    goToNew: () => navigate("/crm/purchase-requests/new"),
    goToEdit: (id: string) => navigate(`/crm/purchase-requests/${id}/edit`),
  }
}

export type PurchaseRequestsListController = ReturnType<typeof usePurchaseRequestsList>
