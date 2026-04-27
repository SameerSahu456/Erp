import { useState, useMemo, useCallback, useRef } from "react"
import { Plus, LayoutGrid, List, Search, X, TrendingUp, Users, Target, DollarSign, Filter } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { toast } from "sonner"
import { parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
    <div
      className="cpt-kcard cursor-pointer"
      onClick={() => navigate(`/crm/leads/${lead.id}`)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
            {lead.company}
          </p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {lead.name}
          </p>
        </div>
        <Badge
          variant={priorityVariant(lead.priority)}
          className="shrink-0 px-1.5 py-0 text-[10px] leading-[1.6]"
        >
          {lead.priority}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[13.5px] font-semibold tabular-nums text-foreground">
          {formatCurrency(lead.value)}
        </span>
        {lead.customerType && (
          <span className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {lead.customerType}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-accent text-[9px] font-semibold uppercase text-foreground">
          {(lead.assignedTo ?? lead.owner).slice(0, 1)}
        </span>
        <span className="truncate">{lead.assignedTo ?? lead.owner}</span>
      </div>
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
      { key: "company", label: "Company", sortable: true, width: "200px" },
      { key: "contactName", label: "Contact Name", sortable: true, width: "160px" },
      { key: "phone", label: "Phone", width: "140px" },
      { key: "email", label: "Email", width: "200px" },
      { key: "source", label: "Source", sortable: true, filterable: true, width: "110px" },
      { key: "location", label: "Location", sortable: true, filterable: true, width: "120px" },
      { key: "categories", label: "Categories", sortable: true, filterable: true, width: "160px" },
      { key: "requirement", label: "Requirement", width: "260px" },
      { key: "stage", label: "Stage", sortable: true, filterable: true, width: "130px" },
      { key: "priority", label: "Priority", sortable: true, filterable: true, width: "100px" },
      { key: "type", label: "Type", sortable: true, filterable: true, width: "130px" },
      { key: "assignedTo", label: "Assigned To", sortable: true, filterable: true, width: "140px" },
    ],
    data: searchFilteredLeads.map((l) => ({
      id: l.id,
      company: l.company,
      contactName: l.name,
      phone: l.phone,
      email: l.email,
      source: l.source,
      location: l.location ?? "—",
      categories: l.categories.join(", "),
      requirement: l.description,
      stage: l.stage,
      priority: l.priority,
      type: l.customerType ?? "—",
      assignedTo: l.assignedTo ?? l.owner,
    })),
  }), [searchFilteredLeads])

  const TRUNCATE_KEYS: Record<string, number> = {
    email: 180,
    categories: 140,
    requirement: 240,
    company: 180,
    contactName: 140,
  }

  const listCellFormatter: CellFormatter = (value, key, row) => {
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
    const max = TRUNCATE_KEYS[key]
    if (max && typeof value === "string" && value) {
      return {
        display: (
          <div
            title={value}
            style={{ maxWidth: max, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {value}
          </div>
        ),
      }
    }
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
      <div className="relative max-w-md flex-1 min-w-[240px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          placeholder="Search by company, contact, or owner..."
          value={kanbanSearch}
          onChange={(e) => setKanbanSearch(e.target.value)}
          className="h-9 pl-9 pr-8 text-[13px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        />
        {kanbanSearch && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={() => setKanbanSearch("")}
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Button
        variant={filtersOpen || activeFilterCount > 0 ? "default" : "outline"}
        size="sm"
        onClick={() => setFiltersOpen((v) => !v)}
        className="h-9 text-[13px]"
      >
        <Filter className="mr-1.5 size-3.5" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-[18px] min-w-[18px] justify-center px-1.5 text-[10px] font-semibold">
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </div>
  )

  const filterPanel = (
    <aside className="h-fit w-64 shrink-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-muted-foreground" />
          <h3 className="text-[13px] font-semibold tracking-tight">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-[18px] min-w-[18px] justify-center px-1.5 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        <button
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          onClick={() => setFiltersOpen(false)}
          aria-label="Close filters"
        >
          <X className="size-3.5" />
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
      <div
        className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        role="tablist"
        aria-label="View mode"
      >
        <button
          type="button"
          onClick={() => setView("kanban")}
          aria-label="Kanban view"
          aria-pressed={view === "kanban"}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-all",
            view === "kanban"
              ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutGrid className="size-3.5" />
          Kanban
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          aria-label="List view"
          aria-pressed={view === "list"}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-all",
            view === "list"
              ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <List className="size-3.5" />
          List
        </button>
      </div>
      <Button onClick={() => navigate("/crm/leads/new")} className="h-9">
        <Plus className="mr-1 size-4" />
        Add Lead
      </Button>
    </>
  )

  const kpiStats = [
    { label: "Total Leads", value: summaryStats.total, icon: Users, accent: "primary" as const },
    { label: "Active", value: summaryStats.active, icon: Target, accent: "info" as const },
    {
      label: "Pipeline Value",
      value: formatCurrency(summaryStats.totalValue),
      icon: DollarSign,
      accent: "violet" as const,
    },
    {
      label: "Won Value",
      value: formatCurrency(summaryStats.wonValue),
      icon: DollarSign,
      accent: "success" as const,
    },
    {
      label: "Win Rate",
      value: `${summaryStats.convRate.toFixed(0)}%`,
      icon: TrendingUp,
      accent: "teal" as const,
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
                className="cpt-compact"
                tabs={[listTab]}
                cellFormatter={listCellFormatter}
                pageSize={10}
                searchable={false}
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
