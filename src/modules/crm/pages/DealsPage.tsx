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

// List view config
const listTab: TabConfig = {
  id: "deals",
  label: "All Deals",
  columns: [
    { key: "deal", label: "Deal", sortable: true },
    { key: "account", label: "Account", sortable: true },
    { key: "stage", label: "Stage", sortable: true, filterable: true },
    { key: "value", label: "Value", sortable: true, align: "right" },
    { key: "probability", label: "Probability", sortable: true, align: "right" },
    { key: "closeDate", label: "Close Date", sortable: true },
    { key: "owner", label: "Owner", sortable: true, filterable: true },
  ],
  data: deals.map((d) => ({
    id: d.id,
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
  if (key === "deal" && typeof value === "string") {
    return {
      display: <Link to={`/crm/deals/${row["id"]}`} className="text-primary hover:underline font-medium">{value}</Link>,
    }
  }
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

  // Apply date + user filter to source data, then group for kanban
  const filteredDeals = useMemo(
    () =>
      deals.filter(
        (d) => isMyData(d.owner) && isDateInRange(d.createdAt, dateRange)
      ),
    [selectedUser, dateRange]
  )

  const [kanbanItems, setKanbanItems] = useState(() =>
    groupDealsByStage(deals)
  )

  // Re-group when filters change
  useMemo(() => {
    setKanbanItems(groupDealsByStage(filteredDeals))
  }, [filteredDeals])

  const [kanbanSearch, setKanbanSearch] = useState("")

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

  // Closed Won wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingClosedWon, setPendingClosedWon] = useState<{ deal: Deal; fromColumn: string } | null>(null)

  // Closed Lost reason state
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [pendingClosedLost, setPendingClosedLost] = useState<{ deal: Deal; fromColumn: string } | null>(null)

  const kanbanItemsRef = useRef(kanbanItems)
  kanbanItemsRef.current = kanbanItems

  const handleMoveAcross = useCallback(
    (itemId: string, fromColumn: string, toColumn: string) => {
      // Intercept Closed Won — open wizard (SO form only, account already exists)
      if (toColumn === 'Closed Won') {
        const deal = (kanbanItemsRef.current[fromColumn] ?? []).find((i) => i.id === itemId)
        if (deal) {
          setPendingClosedWon({ deal, fromColumn })
          setWizardOpen(true)
        }
        return
      }

      // Intercept Closed Lost — open lost reason dialog
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

  function handleClosedWonComplete(result: ClosedWonResult) {
    if (!pendingClosedWon) return
    const { deal, fromColumn } = pendingClosedWon

    // Update deal value to match the SO line items total
    const soTotal = result.salesOrder.lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0)

    setKanbanItems((prev) => {
      const fromItems = (prev[fromColumn] ?? []).filter((i) => i.id !== deal.id)
      const updated = { ...deal, stage: 'Closed Won' as Deal['stage'], value: soTotal, probability: 100 }
      const toItems = [...(prev['Closed Won'] ?? []), updated]
      return { ...prev, [fromColumn]: fromItems, 'Closed Won': toItems }
    })

    toast.success(`Deal "${deal.name}" closed won — ${formatCurrency(soTotal)}`)
    setPendingClosedWon(null)
    setWizardOpen(false)
  }

  const priorityVariant = (p: string) => p === 'High' ? 'destructive' as const : p === 'Medium' ? 'warning' as const : 'secondary' as const

  const renderDealCard = (deal: Deal) => (
    <div className="cursor-pointer" onClick={() => navigate(`/crm/deals/${deal.id}`)}>
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
          <Badge variant={priorityVariant(deal.priority)} className="text-[10px]">
            {deal.priority}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {deal.customerType && <span>{deal.customerType}</span>}
          <span>{deal.closeDate}</span>
        </div>
      </CardContent>
    </Card>
    </div>
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

      {/* Content */}
      {view === "kanban" ? (
        <div className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3">
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
          <KanbanBoard<Deal>
            columns={kanbanColumns}
            items={filteredKanbanItems}
            renderCard={renderDealCard}
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
          entityType="deal"
          entityName={pendingClosedWon.deal.name}
          entityValue={pendingClosedWon.deal.value}
          existingAccountId={pendingClosedWon.deal.accountId}
          existingAccountName={pendingClosedWon.deal.accountName}
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
          entityType="deal"
          entityName={pendingClosedLost.deal.name}
          onConfirm={handleClosedLostConfirm}
        />
      )}
    </div>
  )
}

export default DealsPage
