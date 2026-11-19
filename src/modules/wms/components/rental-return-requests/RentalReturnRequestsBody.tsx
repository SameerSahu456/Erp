import { useNavigate } from "react-router-dom"
import { CheckCircle2, Clock, PackageCheck, Plus, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { StatsRow } from "@/components/common/display/StatsRow"
import { ListPageShell } from "@/components/page-shells"
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"

import { WMS_PAGE_SIZE } from "../../constants"
import {
  RENTAL_RETURN_REASON_FILTER_OPTIONS,
  RENTAL_RETURN_STATUS_VARIANT,
  type RentalReturnStatus,
} from "../../constants/rental-return-status"
import { useRentalReturnList } from "../../hooks/rental-return-requests/useRentalReturnList"
import { NEW_ROUTE, rentalReturnDetailPath } from "./rental-return-request-detail-helpers"
import { RENTAL_RETURN_COLUMNS, RENTAL_RETURN_TABS } from "./rental-return-requests.columns"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "request_number") {
    // min-w-0 so a long number truncates instead of widening the row (§8.7).
    return {
      display: (
        <Typography variant="body-strong" className="min-w-0 truncate">
          {String(value)}
        </Typography>
      ),
    }
  }
  if (key !== "status") return null
  const status = row._status as RentalReturnStatus
  return {
    display: (
      <StatusBadge variant={RENTAL_RETURN_STATUS_VARIANT[status] ?? "neutral"}>{String(value)}</StatusBadge>
    ),
  }
}

/** The four headline buckets; a click opens that tab. */
function RentalReturnStats({
  counts,
  onTabChange,
}: {
  counts: Record<string, number>
  onTabChange: (tabId: string) => void
}) {
  return (
    <StatsRow
      stats={[
        { label: S.list.stats.pending, value: counts.pending_approval ?? 0, icon: Clock, accent: "warning", onClick: () => onTabChange("pending_approval") },
        { label: S.list.stats.approved, value: counts.approved ?? 0, icon: PackageCheck, accent: "info", onClick: () => onTabChange("approved") },
        { label: S.list.stats.completed, value: counts.completed ?? 0, icon: CheckCircle2, accent: "success", onClick: () => onTabChange("completed") },
        { label: S.list.stats.rejected, value: counts.rejected ?? 0, icon: XCircle, accent: "danger", onClick: () => onTabChange("rejected") },
      ]}
    />
  )
}

export function RentalReturnRequestsBody() {
  const navigate = useNavigate()
  const list = useRentalReturnList()
  const { listQuery } = list

  const tabs: TabConfig[] = RENTAL_RETURN_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: list.counts[t.id] ?? 0,
    columns: RENTAL_RETURN_COLUMNS,
    // Only the active tab carries rows; the others render on demand.
    data: t.id === list.activeTab ? list.rows : [],
  }))
  const toolbarFilters = [
    {
      key: "reason",
      label: S.list.filters.reason,
      allLabel: S.list.filters.allReasons,
      value: list.reason,
      options: RENTAL_RETURN_REASON_FILTER_OPTIONS,
    },
  ]

  return (
    <ListPageShell
      title={S.list.title}
      subtitle={S.list.subtitle}
      stats={<RentalReturnStats counts={list.counts} onTabChange={list.onTabChange} />}
      actions={
        list.canCreate ? (
          <Button onClick={() => navigate(NEW_ROUTE)}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.list.newRequest}
          </Button>
        ) : undefined
      }
    >
      <div className="bmt-search-md">
        <BusinessMetricsTable
          showIndex
          tabs={tabs}
          activeTab={list.activeTab}
          onTabChange={list.onTabChange}
          cellFormatter={cellFormatter}
          persistKey="wms-rental-return-requests"
          onRowClick={(row) => navigate(rentalReturnDetailPath(String(row.id)))}
          searchPlaceholder={S.list.searchPlaceholder}
          searchValue={list.search}
          onSearchChange={list.onSearchChange}
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={list.onToolbarFilterChange}
          onClearFilters={list.onClearFilters}
          serverPagination={{
            page: list.page,
            pageSize: WMS_PAGE_SIZE,
            // `total` comes from the API, never rows.length (§16.7).
            total: listQuery.data?.total ?? 0,
            isFetching: listQuery.isFetching,
            onPageChange: list.setPage,
          }}
          // Error and empty are distinct states (§12) — a failed load offers Retry.
          error={
            listQuery.isError
              ? { title: S.list.error.title, description: S.list.error.description, onRetry: () => void listQuery.refetch() }
              : undefined
          }
          emptyState={{
            title: S.list.empty.title,
            description: S.list.empty.description,
            action: list.canCreate ? { label: S.list.empty.action, onClick: () => navigate(NEW_ROUTE) } : undefined,
          }}
        />
      </div>
    </ListPageShell>
  )
}
