import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { ListPageShell } from "@/components/page-shells"
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"

import { WMS_PAGE_SIZE } from "../../constants"
import { useWarehouseScope } from "../../context/warehouse-scope"
import {
  INWARD_EXCEPTION_STATUS_VARIANT,
  type InwardExceptionStatus,
} from "../../constants/inward-exception"
import {
  useInwardExceptionCount,
  useInwardExceptions,
} from "../../hooks/inward-exceptions/useInwardExceptions"
import {
  INWARD_EXCEPTION_COLUMNS,
  INWARD_EXCEPTION_TABS,
  KIND_FILTER_OPTIONS,
  toInwardExceptionRow,
} from "./inward-exceptions.columns"
import { inwardExceptionDetailPath } from "./inward-exceptions-helpers"
import { INWARD_EXCEPTIONS_STRINGS as S } from "./inward-exceptions.strings"

type TabId = (typeof INWARD_EXCEPTION_TABS)[number]["id"]
const OVERDUE_OPTIONS = [{ value: "yes", label: S.list.filters.overdue }]

function useFilters() {
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<TabId>("open")
  const [kind, setKind] = useState("")
  const [overdue, setOverdue] = useState("")
  const { selectedWarehouseIds } = useWarehouseScope()
  // The navbar warehouse pick is a filter too: a narrowed scope must not open
  // on a page that no longer exists (§16.7). Adjusted during render.
  const whKey = selectedWarehouseIds.join(",")
  const [lastWh, setLastWh] = useState(whKey)
  if (whKey !== lastWh) {
    setLastWh(whKey)
    setPage(1)
  }
  const shared = {
    kind: kind ? [kind] : undefined,
    overdue: overdue === "yes",
    warehouse_ids: selectedWarehouseIds,
  }
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }
  return { page, setPage, tab, setTab: reset(setTab), kind, setKind: reset(setKind), overdue, setOverdue: reset(setOverdue), shared }
}

/** Badges on the two worklist tabs only — "resolved" / "all" carry none. */
function useWorklistCounts(shared: ReturnType<typeof useFilters>["shared"]): Partial<Record<TabId, number>> {
  const open = useInwardExceptionCount({ ...shared, status: ["open"] }).data
  const returning = useInwardExceptionCount({ ...shared, status: ["returning"] }).data
  return { open: open ?? 0, returning: returning ?? 0 }
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "serial")
    return { display: <Typography variant="body-strong" className="min-w-0 truncate font-mono">{String(value)}</Typography> }
  if (key !== "status") return null
  const status = row._status as InwardExceptionStatus
  return {
    display: (
      <span className="flex flex-wrap gap-1">
        <StatusBadge variant={INWARD_EXCEPTION_STATUS_VARIANT[status] ?? "neutral"}>{String(value)}</StatusBadge>
        {row._overdue === true && <StatusBadge variant="error">{S.list.overdueBadge}</StatusBadge>}
      </span>
    ),
  }
}

/** The queue of held rental-return boxes (return-by-count spec §8). */
export function InwardExceptionsBody() {
  const navigate = useNavigate()
  const f = useFilters()
  const active = INWARD_EXCEPTION_TABS.find((t) => t.id === f.tab) ?? INWARD_EXCEPTION_TABS[0]
  const status = active.status ? [...active.status] : undefined
  const listQuery = useInwardExceptions({ ...f.shared, status, page: f.page, page_size: WMS_PAGE_SIZE })
  const counts = useWorklistCounts(f.shared)
  const rows = useMemo(() => (listQuery.data?.items ?? []).map(toInwardExceptionRow), [listQuery.data?.items])

  const tabs: TabConfig[] = INWARD_EXCEPTION_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: counts[t.id],
    columns: INWARD_EXCEPTION_COLUMNS,
    data: t.id === f.tab ? rows : [],
  }))
  const toolbarFilters = [
    { key: "kind", label: S.list.filters.kind, allLabel: S.list.filters.allKinds, value: f.kind, options: KIND_FILTER_OPTIONS },
    { key: "overdue", label: S.list.filters.overdue, allLabel: S.list.tabs.all, value: f.overdue, options: OVERDUE_OPTIONS },
  ]

  return (
    <ListPageShell title={S.list.title} subtitle={S.list.subtitle}>
      <BusinessMetricsTable
        showIndex
        tabs={tabs}
        activeTab={f.tab}
        onTabChange={(id) => f.setTab(id as TabId)}
        cellFormatter={cellFormatter}
        persistKey="wms-inward-exceptions"
        onRowClick={(row) => navigate(inwardExceptionDetailPath(String(row.id)))}
        toolbarFilters={toolbarFilters}
        onToolbarFilterChange={(key, value) => (key === "kind" ? f.setKind(value) : f.setOverdue(value))}
        onClearFilters={() => {
          f.setKind("")
          f.setOverdue("")
        }}
        serverPagination={{
          page: f.page,
          pageSize: WMS_PAGE_SIZE,
          total: listQuery.data?.total ?? 0,
          isFetching: listQuery.isFetching,
          onPageChange: f.setPage,
        }}
        // Error and empty are distinct states (§12) — a failed load offers Retry.
        error={
          listQuery.isError
            ? { title: S.list.error.title, description: S.list.error.description, onRetry: () => void listQuery.refetch() }
            : undefined
        }
        emptyState={{ title: S.list.empty.title, description: S.list.empty.description }}
      />
    </ListPageShell>
  )
}
