import { useState, useMemo, useCallback, useRef } from "react"
import { Plus, LayoutGrid, List, Search, X, TrendingUp, Users, Target, DollarSign, Filter } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { usePersistedState } from "@/hooks/use-persisted-state"
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
import { StatsRow } from "@/components/common/StatsRow"
import { ListPageShell } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
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

function LeadsPage() {
  const navigate = useNavigate()
  const [view, setView] = usePersistedState<"kanban" | "list">("leads:view", "kanban")

  // Filters
  const [preset, setPreset] = usePersistedState<DateFilterPreset>("leads:preset", "yearly")
  const [customFrom, setCustomFrom] = usePersistedState("leads:customFrom", "")
  const [customTo, setCustomTo] = usePersistedState("leads:customTo", "")
  const [selectedUser, setSelectedUser] = usePersistedState<string>(
    "leads:selectedUser",
    IS_SUPERADMIN ? "__all__" : CURRENT_USER
  )
  const [selectedStage, setSelectedStage] = usePersistedState<string>("leads:selectedStage", "__all__")
  const [selectedPriority, setSelectedPriority] = usePersistedState<string>("leads:selectedPriority", "__all__")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount =
    (selectedStage !== "__all__" ? 1 : 0) +
    (selectedPriority !== "__all__" ? 1 : 0) +
    (IS_SUPERADMIN && selectedUser !== "__all__" ? 1 : 0) +
    (preset !== "yearly" ? 1 : 0)

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
          isDateInRange(l.createdAt, dateRange) &&
          (selectedStage === "__all__" || l.stage === selectedStage) &&
          (selectedPriority === "__all__" || l.priority === selectedPriority)
      ),
    [selectedUser, dateRange, selectedStage, selectedPriority]
  )

  // Summary cards data
  const summaryStats = useMemo(() => {
    const activeLeads = filteredLeads.filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost')
    const totalValue = filteredLeads.reduce((s, l) => s + l.value, 0)
    const wonLeads = filteredLeads.filter(l => l.stage === 'Closed Won')
    const wonValue = wonLeads.reduce((s, l) => s + l.value, 0)
    const closedLeads = filteredLeads.filter(l => l.stage === 'Closed Won' || l.stage === 'Closed Lost')
    const convRate = closedLeads.length > 0 ? (wonLeads.length / closedLeads.length) * 100 : 0
    return { total: filteredLeads.length, active: activeLeads.length, totalValue, wonValue, convRate }
  }, [filteredLeads])


  const [kanbanItems, setKanbanItems] = useState(() =>
    groupLeadsByStage(leads.filter((l) => l.stage !== 'Rejected'))
  )

  // Re-group when filters change
  useMemo(() => {
    setKanbanItems(groupLeadsByStage(filteredLeads))
  }, [filteredLeads])

  const [kanbanSearch, setKanbanSearch] = usePersistedState("leads:search", "")

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

  // Closed Lost reason state
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [pendingClosedLost, setPendingClosedLost] = useState<{ lead: Lead; fromColumn: string } | null>(null)

  // Use a ref so the callback always sees the latest kanbanItems without causing re-renders
  const kanbanItemsRef = useRef(kanbanItems)
  kanbanItemsRef.current = kanbanItems

  const handleMoveAcross = useCallback(
    (itemId: string, fromColumn: string, toColumn: string) => {
      // Intercept Closed Won — navigate to full-page form
      if (toColumn === 'Closed Won') {
        const lead = (kanbanItemsRef.current[fromColumn] ?? []).find((i) => i.id === itemId)
        if (lead) {
          navigate(`/crm/leads/${lead.id}/close-won?type=lead`)
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
          <p className="text-xs text-muted-foreground">{lead.assignedTo ?? lead.owner}</p>
          {lead.customerType && (
            <span className="text-[10px] text-muted-foreground">{lead.customerType}</span>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  )

  // Search-filtered leads for list view
  const searchFilteredLeads = useMemo(() => {
    if (!kanbanSearch.trim()) return filteredLeads
    const q = kanbanSearch.toLowerCase()
    return filteredLeads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || (l.assignedTo ?? l.owner).toLowerCase().includes(q)
    )
  }, [filteredLeads, kanbanSearch])

  // List view config
  const listTab: TabConfig = useMemo(() => ({
    id: "leads",
    label: "All Leads",
    columns: [
      { key: "name", label: "Name", sortable: true },
      { key: "company", label: "Company", sortable: true },
      { key: "stage", label: "Stage", sortable: true, filterable: true },
      { key: "value", label: "Value", sortable: true, align: "right" },
      { key: "priority", label: "Priority", sortable: true, filterable: true },
      { key: "assignedTo", label: "Assigned To", sortable: true, filterable: true },
      { key: "source", label: "Source", sortable: true, filterable: true },
      { key: "lastContact", label: "Last Contact", sortable: true },
    ],
    data: searchFilteredLeads.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      stage: l.stage,
      value: l.value,
      priority: l.priority,
      assignedTo: l.assignedTo ?? l.owner,
      source: l.source,
      lastContact: l.lastContact,
    })),
  }), [searchFilteredLeads])

  const listCellFormatter: CellFormatter = (value, key, row) => {
    if (key === "value" && typeof value === "number") {
      return { display: formatCurrency(value) }
    }
    if (key === "stage" && typeof value === "string") {
      const variant = stageVariant[value] ?? "neutral"
      return {
        display: <StatusBadge variant={variant}>{value}</StatusBadge>,
      }
    }
    if (key === "priority" && typeof value === "string") {
      return {
        display: <Badge variant={priorityVariant(value)} className="text-[10px]">{value}</Badge>,
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

  const resetFilters = () => {
    setSelectedStage("__all__")
    setSelectedPriority("__all__")
    setSelectedUser(IS_SUPERADMIN ? "__all__" : CURRENT_USER)
    setPreset("yearly")
    setCustomFrom("")
    setCustomTo("")
  }

  // Search + Filters toggle (shared between views)
  const searchBar = (
    <div className="flex items-center gap-2">
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
      <Button
        variant={filtersOpen ? "default" : "outline"}
        size="sm"
        onClick={() => setFiltersOpen((v) => !v)}
        className="h-8 text-[13px]"
      >
        <Filter className="size-4 mr-1" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </div>
  )

  const filterPanel = (
    <aside className="w-60 shrink-0 space-y-4 rounded-md border bg-card p-4 h-fit">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setFiltersOpen(false)}
          aria-label="Close filters"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Stage</label>
        <Select value={selectedStage} onValueChange={setSelectedStage}>
          <SelectTrigger className="w-full h-8 text-[13px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Stages</SelectItem>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Priority</label>
        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
          <SelectTrigger className="w-full h-8 text-[13px]">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Priority</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {IS_SUPERADMIN && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">User</label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-full h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Users</SelectItem>
              {MOCK_USERS.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Date Range</label>
        <Select value={preset} onValueChange={(v) => setPreset(v as DateFilterPreset)}>
          <SelectTrigger className="w-full h-8 text-[13px]">
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
      </div>
      {preset === "custom" && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full h-8 text-[13px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full h-8 text-[13px]"
            />
          </div>
        </div>
      )}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="w-full h-8 text-[13px]"
        >
          Clear all
        </Button>
      )}
    </aside>
  )

  const headerActions = (
    <>
      <div className="flex overflow-hidden rounded-md border border-border">
        <Button
          variant={view === "kanban" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("kanban")}
          className="rounded-none border-0"
          aria-label="Kanban view"
          aria-pressed={view === "kanban"}
        >
          <LayoutGrid className="size-4" />
        </Button>
        <Button
          variant={view === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("list")}
          className="rounded-none border-0"
          aria-label="List view"
          aria-pressed={view === "list"}
        >
          <List className="size-4" />
        </Button>
      </div>
      <Button onClick={() => navigate("/crm/leads/new")}>
        <Plus className="mr-1 size-4" />
        Add Lead
      </Button>
    </>
  )

  const kpiStats = [
    { label: "Total Leads", value: summaryStats.total, icon: Users },
    { label: "Active", value: summaryStats.active, icon: Target },
    {
      label: "Pipeline Value",
      value: formatCurrency(summaryStats.totalValue),
      icon: DollarSign,
    },
    {
      label: "Won Value",
      value: formatCurrency(summaryStats.wonValue),
      icon: DollarSign,
    },
    {
      label: "Win Rate",
      value: `${summaryStats.convRate.toFixed(0)}%`,
      icon: TrendingUp,
    },
  ]

  return (
    <>
      <ListPageShell
        title="Leads"
        subtitle="Pipeline of qualified and in-progress opportunities."
        breadcrumbs={[{ label: 'CRM' }, { label: 'Leads' }]}
        actions={headerActions}
        stats={<StatsRow stats={kpiStats} />}
        toolbar={searchBar}
      >
        <div className="flex gap-3">
          {filtersOpen && filterPanel}
          <div className="flex-1 min-w-0">
            {view === "kanban" ? (
              <KanbanBoard<Lead>
                columns={kanbanColumns}
                items={filteredKanbanItems}
                renderCard={renderLeadCard}
                onMoveAcross={handleMoveAcross}
              />
            ) : (
              <BusinessMetricsTable
                tabs={[listTab]}
                cellFormatter={listCellFormatter}
                pageSize={10}
                persistKey="crm-leads"
                onRowClick={(row) => navigate(`/crm/leads/${row.id}`)}
                emptyState={{
                  title: 'No leads yet',
                  description: 'Create your first lead to start tracking opportunities.',
                  action: {
                    label: 'Add Lead',
                    onClick: () => navigate('/crm/leads/new'),
                  },
                }}
              />
            )}
          </div>
        </div>
      </ListPageShell>

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
    </>
  )
}

export default LeadsPage
