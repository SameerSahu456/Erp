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
import { formatIST_date } from "@shared/lib/date"

import { AsyncUserMultiSelect } from "../shared/AsyncUserMultiSelect"
import { CellTooltip } from "../shared/CellTooltip"
import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import { ACCOUNT_TYPE_BADGE_VARIANT } from "../../data/accountApprovals"
import type { AccessRequestsController } from "../../hooks/accounts/useAccessRequests"
import { UserNameRoleCell } from "../shared/UserNameRoleCell"
import { AccountAccessReviewDialog } from "./AccountAccessReviewDialog"

/**
 * Accounts → Access tab. Live pending access-request queue
 * (GET /crm/accounts/access-requests), server-paginated. Clicking a row opens
 * the requested account's detail page; the inline Reject / Grant buttons open a
 * lean decision dialog that calls the real endpoints. Mirrors `AccountsTable`'s
 * `cpt-compact crm-premium-table` styling so the tabs read as one table.
 */
export function AccountAccessTable({ c }: { c: AccessRequestsController }) {
  const navigate = useNavigate()

  const accessTab: TabConfig = useMemo(
    () => ({
      id: "access",
      label: "Access",
      columns: [
        { key: "account", label: "Account", sortable: true },
        { key: "type", label: "Type", sortable: true },
        { key: "requestedBy", label: "Requested By", sortable: true },
        { key: "note", label: "Note" },
        { key: "requestedAt", label: "Requested" },
        { key: "status", label: "Status" },
        { key: "actions", label: "", align: "right" },
      ],
      data: c.requests.map((r) => ({
        id: r.id,
        accountId: r.account.id,
        account: r.account.name,
        type: r.account.account_type,
        requestedBy: r.requested_by.name,
        requestedByRoles: r.requested_by.roles ?? [],
        note: r.requested_notes,
        requestedAt: r.requested_at,
        status: r.status,
        actions: "",
      })),
    }),
    [c.requests],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "note") {
      const note = typeof value === "string" ? value : ""
      if (!note) {
        return { display: <Typography variant="helper" tone="muted">—</Typography> }
      }
      return {
        display: (
          <CellTooltip text={note} className="max-w-[220px]">
            <Typography variant="helper" tone="default" truncate className="block">
              {note}
            </Typography>
          </CellTooltip>
        ),
      }
    }
    if (key === "requestedBy") {
      return {
        display: (
          <UserNameRoleCell
            name={typeof value === "string" ? value : null}
            roles={row["requestedByRoles"] as string[]}
          />
        ),
      }
    }
    if (key === "type" && typeof value === "string") {
      const variant =
        ACCOUNT_TYPE_BADGE_VARIANT[value as keyof typeof ACCOUNT_TYPE_BADGE_VARIANT]
      return {
        display: (
          <Badge variant={variant ?? "secondary"} size="sm">
            {value}
          </Badge>
        ),
      }
    }
    if (key === "requestedAt" && typeof value === "string") {
      return {
        display: (
          <Typography variant="helper" tone="muted">
            {formatIST_date(value)}
          </Typography>
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
                c.openReview(id, "Rejected")
              }}
            >
              <XCircle className="size-3" />
              Reject
            </Button>
            <Button
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                c.openReview(id, "Approved")
              }}
            >
              <CheckCircle2 className="size-3" />
              Grant
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
        className="cpt-compact crm-premium-table crm-toolbar-wrap"
        toolbarLayout="inline"
        tabs={[accessTab]}
        cellFormatter={cellFormatter}
        pageSize={c.pageSize}
        persistKey="crm-account-access"
        searchable
        searchValue={c.search}
        onSearchChange={c.setSearch}
        toolbarFilters={c.toolbarFilters}
        onToolbarFilterChange={c.handleToolbarFilterChange}
        onClearFilters={c.handleClearFilters}
        extraFilters={
          // Same size as the toolbar's static chips so the row stays aligned.
          <div className="w-[170px]">
            <AsyncUserMultiSelect
              value={c.selectedRequestedBy}
              onValueChange={c.setSelectedRequestedBy}
              label="Requested By"
              placeholder="Requested By"
              className="h-8 rounded-[5px] shadow-none"
            />
          </div>
        }
        onRowClick={(row) =>
          navigate(`/crm/accounts/${String(row.accountId)}?from=access`)
        }
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
            <LoadErrorState error={c.error} fallback="Unable to load access requests." />
          ) : c.isLoading ? (
            <Typography variant="body" tone="muted" align="center" asChild>
              <div className="px-4 py-12">Loading access requests…</div>
            </Typography>
          ) : undefined
        }
        emptyState={{
          title: "No pending access requests",
          description: "Requests to view accounts you manage will appear here.",
        }}
      />
      <AccountAccessReviewDialog c={c} />
    </>
  )
}
