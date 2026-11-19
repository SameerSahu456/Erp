import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { ListPageShell } from "@/components/page-shells"
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import {
  DEFICIENCY_STATUS_VARIANT,
  DEFICIENCY_TYPE_OPTIONS,
  type DeficiencyStatus,
} from "../../constants/deficiency"
import { ChargeOrderDialog } from "./ChargeOrderDialog"
import {
  DEFICIENCY_COLUMNS,
  DEFICIENCY_TABS,
  toDeficiencyRow,
  type DeficiencyTabId,
} from "./deficiencies.columns"
import { DEFICIENCIES_STRINGS as S } from "./deficiencies.strings"
import { useDeficiencyQueue, type DeficiencyQueue } from "./useDeficiencyQueue"

function useCellFormatter(q: DeficiencyQueue, canCharge: boolean): CellFormatter {
  return (value, key, row) => {
    if (key === "select") {
      const item = q.items.find((d) => d.id === row.id)
      if (!canCharge || !item || row._chargeable !== true) return { display: null }
      return {
        display: (
          // Stop the click reaching the row, which opens the detail.
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={q.picked.has(item.id)}
              onCheckedChange={() => q.toggle(item)}
              aria-label={S.list.selectRow(String(row.type))}
            />
          </span>
        ),
      }
    }
    if (key !== "status") return null
    const status = row._status as DeficiencyStatus
    return { display: <StatusBadge variant={DEFICIENCY_STATUS_VARIANT[status] ?? "neutral"}>{String(value)}</StatusBadge> }
  }
}

function ChargeBar({ q, onCharge }: { q: DeficiencyQueue; onCharge: () => void }) {
  if (q.pickedRows.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Typography variant="caption" tone="muted">
        {q.oneCustomer ? S.list.selected(q.pickedRows.length) : S.list.oneCustomer}
      </Typography>
      <Button onClick={onCharge} disabled={!q.oneCustomer}>
        <Receipt className="size-4" data-icon="inline-start" />
        {S.list.createCharge}
      </Button>
    </div>
  )
}

/** The sales recovery queue (return-by-count §9.4). */
export function DeficienciesBody() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canCharge = can(crmCan.manageDeficiency)
  const q = useDeficiencyQueue()
  const [charging, setCharging] = useState(false)
  const rows = useMemo(() => q.items.map(toDeficiencyRow), [q.items])
  const cellFormatter = useCellFormatter(q, canCharge)

  const tabs: TabConfig[] = DEFICIENCY_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: q.counts[t.id],
    columns: DEFICIENCY_COLUMNS,
    data: t.id === q.tab ? rows : [],
  }))

  return (
    <ListPageShell title={S.list.title} subtitle={S.list.subtitle} actions={<ChargeBar q={q} onCharge={() => setCharging(true)} />}>
      <BusinessMetricsTable
        tabs={tabs}
        activeTab={q.tab}
        onTabChange={(id) => q.setTab(id as DeficiencyTabId)}
        cellFormatter={cellFormatter}
        renderHeaderCell={(col) =>
          col.key === "select" && canCharge ? (
            <Checkbox checked={q.allPicked} onCheckedChange={q.toggleAll} aria-label={S.list.selectAll} />
          ) : null
        }
        persistKey="crm-deficiencies"
        onRowClick={(row) => navigate(`/crm/deficiencies/${String(row.id)}`)}
        toolbarFilters={[
          { key: "type", label: S.list.filters.type, allLabel: S.list.filters.allTypes, value: q.type, options: DEFICIENCY_TYPE_OPTIONS },
        ]}
        onToolbarFilterChange={(_key, value) => q.setType(value)}
        onClearFilters={() => q.setType("")}
        serverPagination={{
          page: q.page,
          pageSize: q.pageSize,
          total: q.listQuery.data?.total ?? 0,
          isFetching: q.listQuery.isFetching,
          onPageChange: q.setPage,
        }}
        emptyState={{
          title: q.listQuery.isError ? S.list.error.title : S.list.empty.title,
          description: q.listQuery.isError ? S.list.error.description : S.list.empty.description,
        }}
      />
      {charging && (
        // On success the dialog navigates to the new order; cancelling
        // keeps the selection so the operator can adjust and retry.
        <ChargeOrderDialog rows={q.pickedRows} onClose={() => setCharging(false)} />
      )}
    </ListPageShell>
  )
}
