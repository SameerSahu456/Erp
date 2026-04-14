import { useState, useMemo } from "react"
import { Plus, LayoutGrid, List } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { KanbanBoard } from "@/components/common/KanbanBoard"
import type { KanbanColumnConfig } from "@/components/common/KanbanBoard"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"

import { leads } from "@/modules/crm/data/leads"
import { LEAD_STAGES } from "@/modules/crm/types"
import type { Lead } from "@/modules/crm/types"

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const stageVariant: Record<string, StatusBadgeVariant> = {
  New: "info",
  Contacted: "neutral",
  Qualified: "warning",
  Proposal: "warning",
  Negotiation: "neutral",
  Won: "success",
  Lost: "error",
}

const stageColors: Record<string, string> = {
  New: "#3b82f6",
  Contacted: "#8b5cf6",
  Qualified: "#f59e0b",
  Proposal: "#f97316",
  Negotiation: "#6366f1",
  Won: "#22c55e",
  Lost: "#ef4444",
}

const kanbanColumns: KanbanColumnConfig[] = LEAD_STAGES.map((stage) => ({
  id: stage,
  label: stage,
  color: stageColors[stage],
}))

function groupLeadsByStage(leadList: Lead[]): Record<string, Lead[]> {
  const grouped: Record<string, Lead[]> = {}
  for (const stage of LEAD_STAGES) {
    grouped[stage] = []
  }
  for (const lead of leadList) {
    grouped[lead.stage]?.push(lead)
  }
  return grouped
}

// List view config
const listTab: TabConfig = {
  id: "leads",
  label: "All Leads",
  columns: [
    { key: "name", label: "Name", sortable: true },
    { key: "company", label: "Company", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "value", label: "Value", sortable: true, align: "right" },
    { key: "owner", label: "Owner", sortable: true },
    { key: "source", label: "Source", sortable: true },
    { key: "lastContact", label: "Last Contact", sortable: true },
  ],
  data: leads.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    stage: l.stage,
    value: l.value,
    owner: l.owner,
    source: l.source,
    lastContact: l.lastContact,
  })),
}

const listCellFormatter: CellFormatter = (value, key, row) => {
  if (key === "name" && typeof value === "string") {
    return {
      display: <Link to={`/crm/leads/${row["id"]}`} className="text-primary hover:underline font-medium">{value}</Link>,
    }
  }
  if (key === "value" && typeof value === "number") {
    return { display: formatCurrency(value) }
  }
  if (key === "stage" && typeof value === "string") {
    const variant = stageVariant[value] ?? "neutral"
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  if (key === "stage") return null
  const stage = row["stage"]
  if (stage === "Lost") {
    return { className: "text-destructive" }
  }
  if (stage === "Won") {
    return { className: "text-status-success-text" }
  }
  return null
}

function LeadsPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [kanbanItems, setKanbanItems] = useState(() =>
    groupLeadsByStage(leads)
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
        const updated = { ...movedItem, stage: toColumn as Lead["stage"] }
        const toItems = [...(prev[toColumn] ?? []), updated]
        return { ...prev, [fromColumn]: fromItems, [toColumn]: toItems }
      })
    },
    []
  )

  const renderLeadCard = (lead: Lead) => (
    <div className="cursor-pointer" onClick={() => navigate(`/crm/leads/${lead.id}`)}>
    <Card size="sm">
      <CardContent className="space-y-2">
        <div>
          <p className="font-medium text-sm">{lead.name}</p>
          <p className="text-xs text-muted-foreground">{lead.company}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold font-sans">
            {formatCurrency(lead.value)}
          </span>
          <StatusBadge variant={stageVariant[lead.stage] ?? "neutral"}>
            {lead.stage}
          </StatusBadge>
        </div>
        <p className="text-xs text-muted-foreground">{lead.owner}</p>
      </CardContent>
    </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Leads</h2>
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
          <Button onClick={() => navigate("/crm/leads/new")}>
            <Plus className="mr-1 size-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "kanban" ? (
        <KanbanBoard<Lead>
          columns={kanbanColumns}
          items={kanbanItems}
          renderCard={renderLeadCard}
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

export default LeadsPage
