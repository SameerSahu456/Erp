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

import { deals } from "@/modules/crm/data/deals"
import { contacts } from "@/modules/crm/data/contacts"
import { leads } from "@/modules/crm/data/leads"
import { DEAL_STAGES, MOCK_USERS } from "@/modules/crm/types"
import type { Deal } from "@/modules/crm/types"
import {
  type DateFilterPreset,
  type DateRange,
  getDateRange,
  isDateInRange,
  CURRENT_USER,
  IS_SUPERADMIN,
} from "@/modules/crm/utils/dashboard-filters"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const formatCurrencyShort = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const stageVariant: Record<string, StatusBadgeVariant> = {
  New: "info",
  Procurement: "info",
  Cold: "neutral",
  Proposal: "warning",
  Negotiation: "info",
  "Closed Won": "success",
  "Closed Lost": "error",
}

const stageColors: Record<string, string> = {
  New: "#1379f0",
  Procurement: "#0d4b94",
  Cold: "#a1a5b7",
  Proposal: "#f6c000",
  Negotiation: "#7239ea",
  "Closed Won": "#50cd89",
  "Closed Lost": "#f1416c",
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

function DealsPage() {
  const navigate = useNavigate()
  const [view, setView] = usePersistedState<"kanban" | "list">("deals:view", "kanban")

  // Filters
  const [preset, setPreset] = usePersistedState<DateFilterPreset>("deals:preset", "yearly")
  const [customFrom, setCustomFrom] = usePersistedState("deals:customFrom", "")
  const [customTo, setCustomTo] = usePersistedState("deals:customTo", "")
  const [selectedUser, setSelectedUser] = usePersistedState<string>(
    "deals:selectedUser",
    IS_SUPERADMIN ? "__all__" : CURRENT_USER
  )
  const [selectedStage, setSelectedStage] = usePersistedState<string>("deals:selectedStage", "__all__")
  const [selectedPriority, setSelectedPriority] = usePersistedState<string>("deals:selectedPriority", "__all__")
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

  // Apply all filters
  const filteredDeals = useMemo(
    () =>
      deals.filter(
        (d) =>
          isMyData(d.owner) &&
          isDateInRange(d.createdAt, dateRange) &&
          (selectedStage === "__all__" || d.stage === selectedStage) &&
          (selectedPriority === "__all__" || d.priority === selectedPriority)
      ),
    [selectedUser, dateRange, selectedStage, selectedPriority]
  )

  // Summary cards data
  const summaryStats = useMemo(() => {
    const activeDeals = filteredDeals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
    const totalValue = filteredDeals.reduce((s, d) => s + d.value, 0)
    const wonDeals = filteredDeals.filter(d => d.stage === 'Closed Won')
    const wonValue = wonDeals.reduce((s, d) => s + d.value, 0)
    const closedDeals = filteredDeals.filter(d => d.stage === 'Closed Won' || d.stage === 'Closed Lost')
    const convRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0
    return { total: filteredDeals.length, active: activeDeals.length, totalValue, wonValue, convRate }
  }, [filteredDeals])


  const [kanbanItems, setKanbanItems] = useState(() =>
    groupDealsByStage(deals)
  )

  // Re-group when filters change
  useMemo(() => {
    setKanbanItems(groupDealsByStage(filteredDeals))
  }, [filteredDeals])

  const [kanbanSearch, setKanbanSearch] = usePersistedState("deals:search", "")

  const filteredKanbanItems = useMemo(() => {
    if (!kanbanSearch.trim()) return kanbanItems
    const q = kanbanSearch.toLowerCase()
    const filtered: Record<string, Deal[]> = {}
    for (const [stage, items] of Object.entries(kanbanItems)) {
      filtered[stage] = items.filter(
        (d) => d.name.toLowerCase().includes(q) || d.accountName.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [kanbanItems, kanbanSearch])

  // Closed Lost reason state
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [pendingClosedLost, setPendingClosedLost] = useState<{ deal: Deal; fromColumn: string } | null>(null)

  const kanbanItemsRef = useRef(kanbanItems)
  kanbanItemsRef.current = kanbanItems

  const handleMoveAcross = useCallback(
    (itemId: string, fromColumn: string, toColumn: string) => {
      if (toColumn === 'Closed Won') {
        const deal = (kanbanItemsRef.current[fromColumn] ?? []).find((i) => i.id === itemId)
        if (deal) {
          navigate(`/crm/deals/${deal.id}/close-won`)
        }
        return
      }

      if (toColumn === 'Closed Lost') {
        const deal = (kanbanItemsRef.current[fromColumn] ?? []).find((i) => i.id === itemId)
        if (deal) {
          setPendingClosedLost({ deal, fromColumn })
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
        const updated = { ...movedItem, stage: toColumn as Deal["stage"] }
        const toItems = [...(prev[toColumn] ?? []), updated]
        return { ...prev, [fromColumn]: fromItems, [toColumn]: toItems }
      })
    },
    []
  )

  function handleClosedLostConfirm(reason: string, notes: string) {
    if (!pendingClosedLost) return
    const { deal, fromColumn } = pendingClosedLost

    setKanbanItems((prev) => {
      const fromItems = (prev[fromColumn] ?? []).filter((i) => i.id !== deal.id)
      const updated = { ...deal, stage: 'Closed Lost' as Deal['stage'] }
      const toItems = [...(prev['Closed Lost'] ?? []), updated]
      return { ...prev, [fromColumn]: fromItems, 'Closed Lost': toItems }
    })

    toast.success(`Deal "${deal.name}" marked as lost — ${reason}`)
    setPendingClosedLost(null)
    setLostReasonOpen(false)
  }

  const priorityVariant = (p: string) => p === 'High' ? 'destructive' as const : p === 'Medium' ? 'warning' as const : 'secondary' as const

  const renderDealCard = (deal: Deal) => {
    const spocName = contacts.find((c) => c.accountId === deal.accountId)?.name
    const owner = deal.assignedTo ?? deal.owner
    return (
      <div
        className="cpt-kcard cursor-pointer"
        onClick={() => navigate(`/crm/deals/${deal.id}`)}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
              {deal.accountName}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {spocName ?? deal.name}
            </p>
          </div>
          <Badge
            variant={priorityVariant(deal.priority)}
            className="shrink-0 px-1.5 py-0 text-[10px] leading-[1.6]"
          >
            {deal.priority}
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13.5px] font-semibold tabular-nums text-foreground">
            {formatCurrency(deal.value)}
          </span>
          <span className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {deal.closeDate}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-accent text-[9px] font-semibold uppercase text-foreground">
            {owner.slice(0, 1)}
          </span>
          <span className="truncate">{owner}</span>
        </div>
      </div>
    )
  }

  // Search-filtered deals for list view
  const searchFilteredDeals = useMemo(() => {
    if (!kanbanSearch.trim()) return filteredDeals
    const q = kanbanSearch.toLowerCase()
    return filteredDeals.filter(
      (d) => d.name.toLowerCase().includes(q) || d.accountName.toLowerCase().includes(q) || (d.assignedTo ?? d.owner).toLowerCase().includes(q)
    )
  }, [filteredDeals, kanbanSearch])

  // List view config — account name first, rename deal to Name, remove probability
  const listTab: TabConfig = useMemo(() => ({
    id: "deals",
    label: "All Deals",
    columns: [
      { key: "company", label: "Company", sortable: true, width: "200px" },
      { key: "overdue", label: "Overdue", sortable: true, align: "right", width: "90px" },
      { key: "contactName", label: "Contact Name", sortable: true, width: "160px" },
      { key: "phone", label: "Phone", width: "140px" },
      { key: "designation", label: "Designation", sortable: true, filterable: true, width: "150px" },
      { key: "email", label: "Email", width: "200px" },
      { key: "source", label: "Source", sortable: true, filterable: true, width: "110px" },
      { key: "location", label: "Location", sortable: true, filterable: true, width: "120px" },
      { key: "categories", label: "Categories", sortable: true, filterable: true, width: "160px" },
      { key: "requirement", label: "Requirement", width: "260px" },
      { key: "stage", label: "Stage", sortable: true, filterable: true, width: "130px" },
      { key: "priority", label: "Priority", sortable: true, filterable: true, width: "100px" },
      { key: "type", label: "Type", sortable: true, filterable: true, width: "130px" },
      { key: "orderType", label: "Order Type", sortable: true, filterable: true, width: "120px" },
      { key: "assignedTo", label: "Assigned To", sortable: true, filterable: true, width: "140px" },
    ],
    data: searchFilteredDeals.map((d) => {
      const spoc = contacts.find((c) => c.accountId === d.accountId)
      const sourceLead = d.leadId ? leads.find((l) => l.id === d.leadId) : undefined
      const today = new Date()
      const close = parseISO(d.closeDate)
      const daysOverdue = Math.floor((today.getTime() - close.getTime()) / (1000 * 60 * 60 * 24))
      const isClosed = d.stage === "Closed Won" || d.stage === "Closed Lost"
      return {
        id: d.id,
        company: d.accountName,
        overdue: !isClosed && daysOverdue > 0 ? daysOverdue : 0,
        contactName: spoc?.name ?? "—",
        phone: spoc?.phone ?? "—",
        designation: spoc?.designation ?? "—",
        email: spoc?.email ?? "—",
        source: sourceLead?.source ?? "—",
        location: d.location ?? "—",
        categories: d.categories.join(", "),
        requirement: d.description,
        stage: d.stage,
        priority: d.priority,
        type: d.customerType ?? "—",
        orderType: d.orderType ?? "—",
        assignedTo: d.assignedTo ?? d.owner,
      }
    }),
  }), [searchFilteredDeals])

  const TRUNCATE_KEYS: Record<string, number> = {
    email: 180,
    designation: 130,
    categories: 140,
    requirement: 240,
    company: 180,
    contactName: 140,
  }

  const listCellFormatter: CellFormatter = (value, key, row) => {
    if (key === "overdue" && typeof value === "number") {
      if (value <= 0) return { display: <span className="text-muted-foreground">—</span> }
      return {
        display: <span className="text-destructive font-medium">{value}d</span>,
      }
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
            {DEAL_STAGES.map((s) => (
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
      <Button onClick={() => navigate("/crm/deals/new")} className="h-9">
        <Plus className="mr-1 size-4" />
        Add Deal
      </Button>
    </>
  )

  const kpiStats = [
    { label: "Total Deals", value: summaryStats.total, icon: Users, accent: "primary" as const },
    { label: "Active", value: summaryStats.active, icon: Target, accent: "info" as const },
    {
      label: "Pipeline Value",
      value: formatCurrencyShort(summaryStats.totalValue),
      icon: DollarSign,
      accent: "violet" as const,
    },
    {
      label: "Won Value",
      value: formatCurrencyShort(summaryStats.wonValue),
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
        title="Deals"
        subtitle="Opportunities progressing from qualification through close."
        breadcrumbs={[{ label: 'CRM' }, { label: 'Deals' }]}
        actions={headerActions}
        stats={<StatsRow stats={kpiStats} />}
        toolbar={searchBar}
      >
        <div className="flex gap-3">
          {filtersOpen && filterPanel}
          <div className="flex-1 min-w-0">
            {view === "kanban" ? (
              <KanbanBoard<Deal>
                columns={kanbanColumns}
                items={filteredKanbanItems}
                renderCard={renderDealCard}
                onMoveAcross={handleMoveAcross}
              />
            ) : (
              <BusinessMetricsTable
                className="cpt-compact"
                tabs={[listTab]}
                cellFormatter={listCellFormatter}
                pageSize={10}
                searchable={false}
                persistKey="crm-deals"
                onRowClick={(row) => navigate(`/crm/deals/${row.id}`)}
                emptyState={{
                  title: 'No deals yet',
                  description: 'Create your first deal to start tracking opportunities through the pipeline.',
                  action: {
                    label: 'Add Deal',
                    onClick: () => navigate('/crm/deals/new'),
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
          entityType="deal"
          entityName={pendingClosedLost.deal.name}
          onConfirm={handleClosedLostConfirm}
        />
      )}
    </>
  )
}

export default DealsPage
