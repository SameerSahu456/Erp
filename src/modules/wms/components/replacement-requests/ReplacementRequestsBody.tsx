import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { AsyncSelect } from "@/components/ui/async-select"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { EntityRef } from "@/components/common/display/EntityRef"
import { ListPageShell } from "@/components/page-shells"
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"

import { useReplacementSourceOrderOptions } from "../../hooks/replacement-requests/useReplacementOrderOptions"
import { useReplacementRequestsList } from "../../hooks/replacement-requests/useReplacementRequestsList"
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants"
import {
  REPLACEMENT_MODE_OPTIONS,
  REPLACEMENT_PRIORITY_OPTIONS,
  REPLACEMENT_PRIORITY_VARIANT,
  REPLACEMENT_STATUS_VARIANT,
  type ReplacementPriority,
  type ReplacementRequestStatus,
} from "../../constants/replacement-request-status"
import { REPLACEMENT_COLUMNS, REPLACEMENT_TABS } from "./replacement-requests.columns"
import { RentalOrderTag } from "./RentalOrderTag"
import { ReplacementRequestStats } from "./ReplacementRequestStats"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const NEW_ROUTE = "/wms/replacements/new"

export function ReplacementRequestsBody() {
  const navigate = useNavigate()
  const r = useReplacementRequestsList()
  const { lv, listQuery } = r
  const { search, sortColumn, sortDirection, page, pageSize, filters } = lv.view

  const toolbarFilters = [
    {
      key: "priority",
      label: S.list.filters.priority,
      allLabel: S.list.filters.allPriorities,
      value: filters.priority,
      options: REPLACEMENT_PRIORITY_OPTIONS,
      // Hug the label so the arrow sits right after it (no dead gap).
      triggerClassName: "w-auto",
    },
    {
      key: "mode",
      label: S.list.filters.mode,
      allLabel: S.list.filters.allModes,
      value: filters.mode,
      options: REPLACEMENT_MODE_OPTIONS,
      triggerClassName: "w-auto",
    },
    {
      // Searchable Sales Order picker via the render escape hatch. `value`
      // stays populated so "Clear filters" detects it as active.
      key: "salesOrder",
      label: S.list.filters.salesOrder,
      value: filters.salesOrder?.id ?? "",
      options: [],
      render: () => (
        <AsyncSelect
          value={filters.salesOrder}
          onValueChange={(next) => lv.setFilters({ salesOrder: next })}
          useOptions={useReplacementSourceOrderOptions}
          toLabel={(o) => o.order_number}
          placeholder={S.list.filters.allSalesOrders}
          searchPlaceholder={S.list.filters.salesOrderSearch}
          loadOnOpen
          clearable
          chevron="down"
          // `text-foreground` last so AsyncSelect's twMerge lets it win over its
          // idle muted tint, matching the sibling filter selects.
          className="h-9 w-auto text-foreground"
        />
      ),
    },
  ]

  const tabs: TabConfig[] = REPLACEMENT_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: r.counts[t.id] ?? 0,
    columns: REPLACEMENT_COLUMNS,
    // Only the active tab carries rows; the others render on demand.
    data: t.id === r.activeTab ? r.rows : [],
  }))

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "reason") {
      const full = value == null ? "" : String(value).trim()
      if (!full) {
        return {
          display: (
            <Typography variant="body" tone="muted" asChild>
              <span>—</span>
            </Typography>
          ),
        }
      }
      // Plain text so maxCellChars caps it; a node would overflow sideways (§8.7).
      return { display: full }
    }
    if (key === "request_number") {
      // min-w-0 so a long number truncates instead of widening the row (§8.7).
      return {
        display: (
          <span className="flex min-w-0 items-center gap-1.5">
            <EntityRef kind="replacement" id={String(row.id)} value={String(value)} className="min-w-0 truncate font-semibold">
              {String(value)}
            </EntityRef>
            <RentalOrderTag isRental={row._isRental as boolean} />
          </span>
        ),
      }
    }
    if (key === "status") {
      const variant = REPLACEMENT_STATUS_VARIANT[row._status as ReplacementRequestStatus] ?? "neutral"
      return { display: <StatusBadge variant={variant}>{String(value)}</StatusBadge> }
    }
    if (key === "priority") {
      const variant = REPLACEMENT_PRIORITY_VARIANT[row._priority as ReplacementPriority] ?? "neutral"
      return { display: <StatusBadge variant={variant}>{String(value)}</StatusBadge> }
    }
    return null
  }

  // A failed load offers a Retry, never a dead end (§12); the create CTA is
  // offered only to users who may raise one (§0.9).
  let emptyAction: { label: string; onClick: () => void } | undefined
  if (listQuery.isError) emptyAction = { label: S.list.error.retry, onClick: () => void listQuery.refetch() }
  else if (r.canCreate) emptyAction = { label: S.list.empty.action, onClick: () => navigate(NEW_ROUTE) }

  return (
    <ListPageShell
      title={S.list.title}
      subtitle={S.list.subtitle}
      stats={<ReplacementRequestStats counts={r.statCounts} onPick={r.setTab} />}
      actions={
        r.canCreate ? (
          <Button onClick={() => navigate(NEW_ROUTE)}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.list.newRequest}
          </Button>
        ) : undefined
      }
    >
      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          tabs={tabs}
          activeTab={r.activeTab}
          onTabChange={r.setTab}
          cellFormatter={cellFormatter}
          persistKey="wms-replacement-requests"
          onRowClick={(row) => navigate(`/wms/replacements/${String(row.id)}`)}
          searchPlaceholder={S.list.searchPlaceholder}
          searchValue={search}
          onSearchChange={r.setSearch}
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={(key, value) => {
            if (key === "priority") lv.setFilters({ priority: value })
            if (key === "mode") lv.setFilters({ mode: value })
          }}
          onClearFilters={lv.clearFilters}
          dateRange={{
            value: filters.dateRange,
            onChange: (range) => lv.setFilters({ dateRange: range }),
            placeholder: S.list.filters.anyDate,
            disableFuture: true,
          }}
          serverPagination={{
            page,
            pageSize,
            // `total` comes from the API, never rows.length (§16.7).
            total: listQuery.data?.total ?? 0,
            isFetching: listQuery.isFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
            sort: { column: sortColumn, direction: sortDirection },
            onSortChange: lv.setSort,
          }}
          emptyState={{
            title: listQuery.isError ? S.list.error.title : S.list.empty.title,
            description: listQuery.isError ? S.list.error.description : S.list.empty.description,
            action: emptyAction,
          }}
        />
      </div>
    </ListPageShell>
  )
}
