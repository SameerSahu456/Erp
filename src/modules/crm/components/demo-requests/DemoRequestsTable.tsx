import { Link } from "react-router-dom"
import { AlertTriangle } from "lucide-react"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { EMPTY_VALUE, PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { CrmDataTable, type CellFormatter, type TabConfig } from "../shared/CrmDataTable"

import type { useDemoRequestsList } from "../../hooks/demo-requests/useDemoRequestsList"
import { DEMO_STATUS_VARIANT, type DemoStatusLabel } from "../../constants/demo-request-status"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import { demoRequestsColumns } from "./demoRequestsConfig"

function blank(value: unknown) {
  return typeof value === "string" && value ? value : EMPTY_VALUE
}

export function DemoRequestsTable({ list }: { list: ReturnType<typeof useDemoRequestsList> }) {
  // Status is a dropdown beside the search box, not a tab strip — one TabConfig
  // holds the server's current page; the `?status=` URL param picks the bucket.
  const singleTab: TabConfig = {
    id: "list",
    label: "",
    columns: demoRequestsColumns,
    data: list.rows,
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "status") {
      const s = value as DemoStatusLabel
      return { display: <StatusBadge variant={DEMO_STATUS_VARIANT[s] ?? "neutral"}>{s}</StatusBadge> }
    }
    if (key === "requestType") {
      return {
        display: (
          <Typography variant="helper" tone="default" asChild>
            <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 font-medium">
              {value as string}
            </span>
          </Typography>
        ),
      }
    }
    if (key === "account") {
      // Name comes in the list payload — no per-row account fetch.
      const name = row.accountName as string
      if (!name) return { display: <span className="text-muted-foreground">{EMPTY_VALUE}</span> }
      return {
        display: (
          <Link
            to={`/crm/accounts/${row.accountId as string}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-primary hover:underline"
          >
            {name}
          </Link>
        ),
      }
    }
    if (key === "requestedBy") {
      return { display: <span>{blank(value)}</span> }
    }
    if (key === "items") {
      return { display: <span className="tabular-nums">{value as number}</span> }
    }
    if (key === "overdue") {
      if (!(value as boolean)) {
        return { display: <span className="text-muted-foreground">{EMPTY_VALUE}</span> }
      }
      return {
        display: (
          <Typography variant="body-strong" tone="danger" asChild>
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="size-3.5" />
              {S.list.overdueDays(row.overdueByDays as number)}
            </span>
          </Typography>
        ),
      }
    }
    if (key === "returnDate") {
      const isOverdue = row.overdue as boolean
      return {
        display: (
          <Typography
            variant={isOverdue ? "body-strong" : "body"}
            tone={isOverdue ? "danger" : "inherit"}
            asChild
          >
            <span>{value as string}</span>
          </Typography>
        ),
      }
    }
    return null
  }

  return (
    <CrmDataTable
      className="bmt-search-wide crm-premium-table"
      tabs={[singleTab]}
      activeTab="list"
      cellFormatter={cellFormatter}
      searchable
      searchValue={list.search}
      onSearchChange={list.handleSearchChange}
      toolbarFilters={[list.statusFilter, list.dateFilter]}
      onToolbarFilterChange={list.handleStatusFilterChange}
      onToolbarDateRangeChange={list.handleToolbarDateRangeChange}
      onClearFilters={list.handleClearFilters}
      // Whole row opens the demo; the Account link above stops propagation.
      onRowClick={(row) => list.openDemo(String(row.id))}
      emptyNode={
        list.demoQuery.isError ? (
          <LoadErrorState error={list.demoQuery.error} fallback={S.list.alert.loadFailedFallback} />
        ) : undefined
      }
      emptyState={{
        title: list.demoQuery.isLoading ? S.list.empty.loadingTitle : S.list.empty.title,
        description: list.demoQuery.isLoading
          ? S.list.empty.loadingDescription
          : S.list.empty.description,
        action:
          !list.demoQuery.isLoading && !list.hasActiveFilters && list.canWriteDr
            ? { label: S.list.empty.action, onClick: list.openDemoNew }
            : undefined,
      }}
      serverPagination={{
        page: list.page,
        pageSize: list.pageSize,
        total: list.total,
        isFetching: list.demoQuery.isFetching,
        onPageChange: list.setPage,
        onPageSizeChange: list.setPageSize,
        pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
        sort: { column: list.sortColumn, direction: list.sortDirection },
        onSortChange: list.setSort,
      }}
    />
  )
}
