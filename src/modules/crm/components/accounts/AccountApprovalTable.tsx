import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { isValidationError } from "@/shared/api/envelope"

import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import { ACCOUNT_TYPE_BADGE_VARIANT } from "../../data/accountApprovals"
import type { AccountApprovalsController } from "../../hooks/accounts/useAccountApprovals"
import { AccountApprovalReviewDialog } from "./AccountApprovalReviewDialog"

/**
 * Accounts → Approval tab. Live pending queue (GET /accounts/pending-approvals),
 * server-paginated. Clicking a row opens the full account detail page (where the
 * approval banner also lives); the inline Approve / Reject buttons open a lean
 * decision dialog that calls the real endpoints. Mirrors `AccountsTable`'s
 * `cpt-compact crm-premium-table` styling so the two tabs read as one table.
 */
export function AccountApprovalTable({ c }: { c: AccountApprovalsController }) {
  const { rows, openReview } = c
  const navigate = useNavigate()

  const approvalTab: TabConfig = useMemo(
    () => ({
      id: "approval",
      label: "Approval",
      columns: [
        { key: "name", label: "Name", sortable: true },
        { key: "entityType", label: "Entity Type" },
        { key: "industry", label: "Industry" },
        { key: "type", label: "Type" },
        { key: "submittedBy", label: "Submitted By", sortable: true },
        { key: "status", label: "Status" },
        { key: "actions", label: "", align: "right" },
      ],
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        entityType: r.entityType,
        industry: r.industry,
        type: r.accountType,
        submittedBy: r.submittedBy,
        status: "Pending",
        actions: "",
      })),
    }),
    [rows],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "entityType" && typeof value === "string") {
      return { display: <Badge variant="secondary">{value}</Badge> }
    }
    if (key === "type" && typeof value === "string") {
      const variant = ACCOUNT_TYPE_BADGE_VARIANT[value as keyof typeof ACCOUNT_TYPE_BADGE_VARIANT]
      return {
        display: (
          <Badge variant={variant ?? "secondary"} size="sm">
            {value}
          </Badge>
        ),
      }
    }
    if (key === "status" && typeof value === "string") {
      return { display: <StatusBadge variant="warning">{value}</StatusBadge> }
    }
    if (key === "actions") {
      const id = String(row.id)
      return {
        display: (
          <div className="flex justify-end gap-2">
            <Button
              size="xs"
              variant="outline"
              className="border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive-soft"
              onClick={(e) => {
                e.stopPropagation()
                openReview(id, "Rejected")
              }}
            >
              <XCircle className="size-3" />
              Reject
            </Button>
            <Button
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                openReview(id, "Approved")
              }}
            >
              <CheckCircle2 className="size-3" />
              Approve
            </Button>
          </div>
        ),
      }
    }
    return null
  }

  return (
    <>
      <CrmDataTable
        className="cpt-compact crm-premium-table"
        toolbarLayout="inline"
        tabs={[approvalTab]}
        cellFormatter={cellFormatter}
        pageSize={c.pageSize}
        persistKey="crm-account-approvals"
        searchable
        searchValue={c.search}
        onSearchChange={c.setSearch}
        toolbarFilters={c.toolbarFilters}
        onToolbarFilterChange={c.handleToolbarFilterChange}
        onClearFilters={c.handleClearFilters}
        onRowClick={(row) => {
          // Carry the current page so the detail "Back" returns to it.
          const params = new URLSearchParams({ from: "approval" })
          if (c.page > 1) params.set("ap_page", String(c.page))
          navigate(`/crm/accounts/${String(row.id)}?${params.toString()}`)
        }}
        serverPagination={{
          page: c.page,
          pageSize: c.pageSize,
          total: c.total,
          isFetching: c.isFetching,
          onPageChange: c.setPage,
          onPageSizeChange: c.setPageSize,
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
        }}
        emptyNode={
          c.isError && !isValidationError(c.error) ? (
            <LoadErrorState error={c.error} fallback="Unable to load approvals." />
          ) : c.isLoading ? (
            <Typography variant="body" tone="muted" align="center" asChild>
              <div className="px-4 py-12">Loading approvals…</div>
            </Typography>
          ) : undefined
        }
        emptyState={{
          title: "No pending approvals",
          description: "Account creation requests routed to you will appear here.",
        }}
      />
      <AccountApprovalReviewDialog c={c} />
    </>
  )
}
