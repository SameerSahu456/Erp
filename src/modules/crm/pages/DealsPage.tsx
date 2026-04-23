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

  const renderDealCard = (deal: Deal) => (
    <div className="cursor-pointer" onClick={() => navigate(`/crm/deals/${deal.id}`)}>
    <Card size="sm">
      <CardContent className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{deal.accountName}</p>
          <p className="font-medium text-sm">{deal.name}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold font-sans">
            {formatCurrency(deal.value)}
          </span>
          <Badge variant={priorityVariant(deal.priority)} className="text-[10px]">
            {deal.priority}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{deal.assignedTo ?? deal.owner}</span>
          <span>{deal.closeDate}</span>
        </div>
      </CardContent>
    </Card>
    </div>
  )

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
      { key: "account", label: "Account Name", sortable: true },
      { key: "name", label: "Name", sortable: true },
      { key: "stage", label: "Stage", sortable: true, filterable: true },
      { key: "value", label: "Value", sortable: true, align: "right" },
      { key: "priority", label: "Priority", sortable: true, filterable: true },
      { key: "assignedTo", label: "Assigned To", sortable: true, filterable: true },
      { key: "closeDate", label: "Close Date", sortable: true },
    ],
    data: searchFilteredDeals.map((d) => ({
      id: d.id,
      account: d.accountName,
      name: d.name,
      stage: d.stage,
      value: d.value,
      priority: d.priority,
      assignedTo: d.assignedTo ?? d.owner,
      closeDate: d.closeDate,
    })),
  }), [searchFilteredDeals])

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
      <div className="relative max-w-sm flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search deals..."
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
          <Button onClick={() => navigate("/crm/deals/new")}>
            <Plus className="mr-1 size-4" />
            Add Deal
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <p className="text-xs font-ui text-muted-foreground">Total Deals</p>
            </div>
            <p className="mt-1 text-2xl font-semibold">{summaryStats.total}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-blue-600" />
              <p className="text-xs font-ui text-muted-foreground">Active</p>
            </div>
            <p className="mt-1 text-2xl font-semibold">{summaryStats.active}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-emerald-600" />
              <p className="text-xs font-ui text-muted-foreground">Pipeline Value</p>
            </div>
            <p className="mt-1 text-2xl font-semibold">{formatCurrencyShort(summaryStats.totalValue)}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-green-600" />
              <p className="text-xs font-ui text-muted-foreground">Won Value</p>
            </div>
            <p className="mt-1 text-2xl font-semibold text-status-success-text">{formatCurrencyShort(summaryStats.wonValue)}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-purple-600" />
              <p className="text-xs font-ui text-muted-foreground">Win Rate</p>
            </div>
            <p className="mt-1 text-2xl font-semibold">{summaryStats.convRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {searchBar}
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
                tabs={[listTab]}
                cellFormatter={listCellFormatter}
                pageSize={10}
                persistKey="crm-deals"
                onRowClick={(row) => navigate(`/crm/deals/${row.id}`)}
              />
            )}
          </div>
        </div>
      </div>
      {/* Closed Lost Reason */}
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
    </div>
  )
}

export default DealsPage
