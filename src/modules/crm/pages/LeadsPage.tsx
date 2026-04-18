import { useState, useMemo, useCallback, useRef } from "react"
import { Plus, LayoutGrid, List, Search, X } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "sonner"
import { parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { KanbanBoard } from "@/components/common/KanbanBoard"
import type { KanbanColumnConfig } from "@/components/common/KanbanBoard"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { ClosedWonWizardDialog } from "../components/ClosedWonWizardDialog"
import type { ClosedWonResult } from "../components/ClosedWonWizardDialog"
import { LostReasonDialog } from "../components/LostReasonDialog"

import { leads } from "@/modules/crm/data/leads"
import { LEAD_STAGES, MOCK_USERS } from "@/modules/crm/types"
import type { Lead } from "@/modules/crm/types"
import {
  type DateFilterPreset,
  type DateRange,
  getDateRange,
  isDateInRange,
  CURRENT_USER,
  IS_SUPERADMIN,
} from "@/modules/crm/utils/dashboard-filters"

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const stageVariant: Record<string, StatusBadgeVariant> = {
  New: "info",
  Contacted: "neutral",
  Qualified: "success",
  Procurement: "info",
  Cold: "neutral",
  Proposal: "warning",
  Negotiation: "info",
  "Closed Won": "success",
  "Closed Lost": "error",
}

const stageColors: Record<string, string> = {
  New: "#1379f0",
  Contacted: "#7239ea",
  Qualified: "#50cd89",
  Procurement: "#0d4b94",
  Cold: "#a1a5b7",
  Proposal: "#f6c000",
  Negotiation: "#7239ea",
  "Closed Won": "#50cd89",
  "Closed Lost": "#f1416c",
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
    { key: "stage", label: "Stage", sortable: true, filterable: true },
    { key: "value", label: "Value", sortable: true, align: "right" },
    { key: "owner", label: "Owner", sortable: true, filterable: true },
    { key: "source", label: "Source", sortable: true, filterable: true },
    { key: "lastContact", label: "Last Contact", sortable: true },
  ],
  data: leads
    .filter((l) => l.stage !== 'Rejected')
    .map((l) => ({
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
  if (stage === "Closed Lost") {
    return { className: "text-destructive" }
  }
  if (stage === "Closed Won") {
    return { className: "text-status-success-text" }
  }
  return null
}

function LeadsPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<"kanban" | "list">("kanban")

  // Filters
  const [preset, setPreset] = useState<DateFilterPreset>("yearly")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [selectedUser, setSelectedUser] = useState<string>(
    IS_SUPERADMIN ? "__all__" : CURRENT_USER
  )

  const dateRange: DateRange = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: parseISO(customFrom), to: parseISO(customTo) }
    }
    return getDateRange(preset)
  }, [preset, customFrom, customTo])

  const isMyData = (owner: string) =>
    selectedUser === "__all__" || owner === selectedUser

  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.stage !== "Rejected" &&
          isMyData(l.owner) &&
          isDateInRange(l.createdAt, dateRange)
      ),
    [selectedUser, dateRange]
  )

  const [kanbanItems, setKanbanItems] = useState(() =>
    groupLeadsByStage(leads.filter((l) => l.stage !== 'Rejected'))
  )

  // Re-group when filters change
  useMemo(() => {
    setKanbanItems(groupLeadsByStage(filteredLeads))
  }, [filteredLeads])

  const [kanbanSearch, setKanbanSearch] = useState("")

  // Filtered kanban items for display
  const filteredKanbanItems = useMemo(() => {
    if (!kanbanSearch.trim()) return kanbanItems
    const q = kanbanSearch.toLowerCase()
    const filtered: Record<string, Lead[]> = {}
    for (const [stage, items] of Object.entries(kanbanItems)) {
      filtered[stage] = items.filter(
        (l) => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.owner.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [kanbanItems, kanbanSearch])

  // Closed Won wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingClosedWon, setPendingClosedWon] = useState<{ lead: Lead; fromColumn: string } | null>(null)

  // Closed Lost reason state
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [pendingClosedLost, setPendingClosedLost] = useState<{ lead: Lead; fromColumn: string } | null>(null)

  // Use a ref so the callback always sees the latest kanbanItems without causing re-renders
  const kanbanItemsRef = useRef(kanbanItems)
  kanbanItemsRef.current = kanbanItems

  const handleMoveAcross = useCallback(
    (itemId: string, fromColumn: string, toColumn: string) => {
      // Intercept Closed Won — open wizard instead of immediate move
      if (toColumn === 'Closed Won') {
        const lead = (kanbanItemsRef.current[fromColumn] ?? []).find((i) => i.id === itemId)
        if (lead) {
          setPendingClosedWon({ lead, fromColumn })
          setWizardOpen(true)
        }
        return
      }

      // Intercept Closed Lost — open lost reason dialog
      if (toColumn === 'Closed Lost') {
        const lead = (kanbanItemsRef.current[fromColumn] ?? []).find((i) => i.id === itemId)
        if (lead) {
          setPendingClosedLost({ lead, fromColumn })
          setLostReasonOpen(true)
        }
        return
      }

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

  function handleClosedLostConfirm(reason: string, notes: string) {
    if (!pendingClosedLost) return
    const { lead, fromColumn } = pendingClosedLost

    setKanbanItems((prev) => {
      const fromItems = (prev[fromColumn] ?? []).filter((i) => i.id !== lead.id)
      const updated = { ...lead, stage: 'Closed Lost' as Lead['stage'] }
      const toItems = [...(prev['Closed Lost'] ?? []), updated]
      return { ...prev, [fromColumn]: fromItems, 'Closed Lost': toItems }
    })

    toast.success(`Lead "${lead.name}" marked as lost — ${reason}`)
    setPendingClosedLost(null)
    setLostReasonOpen(false)
  }

  function handleClosedWonComplete(_result: ClosedWonResult) {
    if (!pendingClosedWon) return
    const { lead, fromColumn } = pendingClosedWon

    setKanbanItems((prev) => {
      const fromItems = (prev[fromColumn] ?? []).filter((i) => i.id !== lead.id)
      const updated = { ...lead, stage: 'Closed Won' as Lead['stage'] }
      const toItems = [...(prev['Closed Won'] ?? []), updated]
      return { ...prev, [fromColumn]: fromItems, 'Closed Won': toItems }
    })

    toast.success(`Lead "${lead.name}" closed won — Account & Sales Order created`)
    setPendingClosedWon(null)
    setWizardOpen(false)
  }

  const priorityVariant = (p: string) => p === 'High' ? 'destructive' as const : p === 'Medium' ? 'warning' as const : 'secondary' as const

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
          <Badge variant={priorityVariant(lead.priority)} className="text-[10px]">
            {lead.priority}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{lead.owner}</p>
          {lead.customerType && (
            <span className="text-[10px] text-muted-foreground">{lead.customerType}</span>
          )}
        </div>
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
        <div className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={kanbanSearch}
                onChange={(e) => setKanbanSearch(e.target.value)}
                className="h-8 pl-8 pr-8 text-[13px]"
              />
              {kanbanSearch && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setKanbanSearch("")}>
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Select
              value={preset}
              onValueChange={(v) => setPreset(v as DateFilterPreset)}
            >
              <SelectTrigger className="w-[140px] h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="quarterly">This Quarter</SelectItem>
                <SelectItem value="yearly">This Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {preset === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-[140px] h-8 text-[13px]"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-[140px] h-8 text-[13px]"
                />
              </div>
            )}
            {IS_SUPERADMIN && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[170px] h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Users</SelectItem>
                  {MOCK_USERS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <KanbanBoard<Lead>
            columns={kanbanColumns}
            items={filteredKanbanItems}
            renderCard={renderLeadCard}
            onMoveAcross={handleMoveAcross}
          />
        </div>
      ) : (
        <BusinessMetricsTable
          tabs={[listTab]}
          cellFormatter={listCellFormatter}
          pageSize={10}
        />
      )}
      {/* Closed Won Wizard */}
      {pendingClosedWon && (
        <ClosedWonWizardDialog
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open)
            if (!open) setPendingClosedWon(null)
          }}
          entityType="lead"
          entityName={pendingClosedWon.lead.name}
          entityValue={pendingClosedWon.lead.value}
          entityCompany={pendingClosedWon.lead.company}
          onComplete={handleClosedWonComplete}
        />
      )}
      {/* Closed Lost Reason */}
      {pendingClosedLost && (
        <LostReasonDialog
          open={lostReasonOpen}
          onOpenChange={(open) => {
            setLostReasonOpen(open)
            if (!open) setPendingClosedLost(null)
          }}
          entityType="lead"
          entityName={pendingClosedLost.lead.name}
          onConfirm={handleClosedLostConfirm}
        />
      )}
    </div>
  )
}

export default LeadsPage
