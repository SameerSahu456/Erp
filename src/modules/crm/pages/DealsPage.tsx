import { useState, useMemo } from "react"
import { Plus, LayoutGrid, List } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { KanbanBoard } from "@/components/common/KanbanBoard"
import type { KanbanColumnConfig } from "@/components/common/KanbanBoard"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"

import { deals } from "@/modules/crm/data/deals"
import { DEAL_STAGES } from "@/modules/crm/types"
import type { Deal } from "@/modules/crm/types"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const stageVariant: Record<string, StatusBadgeVariant> = {
  Discovery: "info",
  Proposal: "warning",
  Negotiation: "neutral",
  "Closed Won": "success",
  "Closed Lost": "error",
}

const stageColors: Record<string, string> = {
  Discovery: "#3b82f6",
  Proposal: "#f59e0b",
  Negotiation: "#6366f1",
  "Closed Won": "#22c55e",
  "Closed Lost": "#ef4444",
}

const kanbanColumns: KanbanColumnConfig[] = DEAL_STAGES.map((stage) => ({
  id: stage,
  label: stage,
  color: stageColors[stage],
}))

function groupDealsByStage(dealList: Deal[]): Record<string, Deal[]> {
  const grouped: Record<string, Deal[]> = {}
  for (const stage of DEAL_STAGES) {
    grouped[stage] = []
  }
  for (const deal of dealList) {
    grouped[deal.stage]?.push(deal)
  }
  return grouped
}

// List view config
const listTab: TabConfig = {
  id: "deals",
  label: "All Deals",
  columns: [
    { key: "deal", label: "Deal", sortable: true },
    { key: "account", label: "Account", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "value", label: "Value", sortable: true, align: "right" },
    { key: "probability", label: "Probability", sortable: true, align: "right" },
    { key: "closeDate", label: "Close Date", sortable: true },
    { key: "owner", label: "Owner", sortable: true },
  ],
  data: deals.map((d) => ({
    deal: d.name,
    account: d.accountName,
    stage: d.stage,
    value: d.value,
    probability: d.probability,
    closeDate: d.closeDate,
    owner: d.owner,
  })),
}

const listCellFormatter: CellFormatter = (value, key, row) => {
  if (key === "value" && typeof value === "number") {
    return { display: formatCurrency(value) }
  }
  if (key === "probability" && typeof value === "number") {
    return { display: `${value}%` }
  }
  if (key === "stage" && typeof value === "string") {
    const variant = stageVariant[value] ?? "neutral"
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  const stage = row["stage"]
  const probability = row["probability"]
  if (
    stage === "Closed Lost" ||
    (typeof probability === "number" && probability < 30)
  ) {
    return { className: "text-destructive" }
  }
  return null
}

function DealsPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [kanbanItems, setKanbanItems] = useState(() =>
    groupDealsByStage(deals)
  )

  const handleMoveAcross = useMemo(
    () => (itemId: string, fromColumn: string, toColumn: string) => {
      setKanbanItems((prev) => {
        const fromItems = (prev[fromColumn] ?? []).filter(
          (i) => i.id !== itemId
        )
        const movedItem = (prev[fromColumn] ?? []).find(
          (i) => i.id === itemId
        )
        if (!movedItem) return prev
        const updated = { ...movedItem, stage: toColumn as Deal["stage"] }
        const toItems = [...(prev[toColumn] ?? []), updated]
        return { ...prev, [fromColumn]: fromItems, [toColumn]: toItems }
      })
    },
    []
  )

  const renderDealCard = (deal: Deal) => (
    <Card size="sm">
      <CardContent className="space-y-2">
        <div>
          <p className="font-medium text-sm">{deal.name}</p>
          <p className="text-xs text-muted-foreground">{deal.accountName}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold font-sans">
            {formatCurrency(deal.value)}
          </span>
          <StatusBadge variant={stageVariant[deal.stage] ?? "neutral"}>
            {deal.stage}
          </StatusBadge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{deal.probability}% probability</span>
          <span>{deal.closeDate}</span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Deals</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
              className="rounded-r-none"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="rounded-l-none"
            >
              <List className="size-4" />
            </Button>
          </div>
          <Button>
            <Plus className="mr-1 size-4" />
            Add Deal
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "kanban" ? (
        <KanbanBoard<Deal>
          columns={kanbanColumns}
          items={kanbanItems}
          renderCard={renderDealCard}
          onMoveAcross={handleMoveAcross}
        />
      ) : (
        <BusinessMetricsTable
          tabs={[listTab]}
          cellFormatter={listCellFormatter}
          pageSize={10}
        />
      )}
    </div>
  )
}

export default DealsPage
