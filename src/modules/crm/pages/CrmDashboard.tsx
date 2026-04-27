import { useState, useMemo } from "react"
import {
  Users,
  Handshake,
  IndianRupee,
  TrendingUp,
  CheckSquare,
  CalendarClock,
  Building2,
  Phone,
  Target,
  ShieldAlert,
  CalendarDays,
} from "lucide-react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { format, parseISO, isToday, isBefore } from "date-fns"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatsRow } from "@/components/common/StatsRow"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"
import { PageHeader } from "@/components/page"

import { leads } from "@/modules/crm/data/leads"
import { deals } from "@/modules/crm/data/deals"
import { accounts } from "@/modules/crm/data/accounts"
import { mockTasks } from "@/modules/crm/data/tasks"
import { mockMeetings } from "@/modules/crm/data/meetings"
import { mockActivities } from "@/modules/crm/data/activities"
import { DEAL_STAGES, MOCK_USERS } from "@/modules/crm/types"
import {
  type DateFilterPreset,
  type DateRange,
  getDateRange,
  isDateInRange,
  CURRENT_USER,
  IS_SUPERADMIN,
} from "@/modules/crm/utils/dashboard-filters"

// ── Helpers ────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v)

const fmtShort = (v: number) => {
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return String(v)
}

const STAGE_COLORS: Record<string, string> = {
  New: "#6366f1",
  Procurement: "#8b5cf6",
  Cold: "#94a3b8",
  Proposal: "#f59e0b",
  Negotiation: "#3b82f6",
  "Closed Won": "#22c55e",
  "Closed Lost": "#ef4444",
}

const PIE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#14b8a6",
  "#ef4444",
  "#94a3b8",
  "#d946ef",
]

const dealStageVariant: Record<string, StatusBadgeVariant> = {
  New: "info",
  Procurement: "info",
  Cold: "neutral",
  Proposal: "warning",
  Negotiation: "info",
  "Closed Won": "success",
  "Closed Lost": "error",
}

const taskPriorityVariant: Record<string, StatusBadgeVariant> = {
  Urgent: "error",
  High: "warning",
  Medium: "info",
  Low: "neutral",
}

// ── Component ──────────────────────────────────────────────────────────
function CrmDashboard() {
  // Filter state
  const [preset, setPreset] = useState<DateFilterPreset>("monthly")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [selectedUser, setSelectedUser] = useState<string>(
    IS_SUPERADMIN ? "__all__" : CURRENT_USER
  )

  // Compute date range
  const dateRange: DateRange = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: parseISO(customFrom), to: parseISO(customTo) }
    }
    return getDateRange(preset)
  }, [preset, customFrom, customTo])

  // ── Filtered data ──────────────────────────────────────────────────
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

  const filteredDeals = useMemo(
    () =>
      deals.filter(
        (d) => isMyData(d.owner) && isDateInRange(d.createdAt, dateRange)
      ),
    [selectedUser, dateRange]
  )

  const filteredTasks = useMemo(
    () =>
      mockTasks.filter(
        (t) =>
          isMyData(t.assignedTo) && isDateInRange(t.createdAt, dateRange)
      ),
    [selectedUser, dateRange]
  )

  const filteredMeetings = useMemo(
    () =>
      mockMeetings.filter(
        (m) => isMyData(m.organizer) && isDateInRange(m.date, dateRange)
      ),
    [selectedUser, dateRange]
  )

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => isMyData(a.owner)),
    [selectedUser]
  )

  const filteredActivities = useMemo(
    () =>
      mockActivities.filter(
        (a) =>
          isMyData(a.user) && isDateInRange(a.timestamp, dateRange)
      ),
    [selectedUser, dateRange]
  )

  // ── KPI Computations ───────────────────────────────────────────────
  const openDeals = filteredDeals.filter(
    (d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost"
  )
  const untouchedDeals = openDeals.filter((d) => {
    const dealActivities = filteredActivities.filter(
      (a) => a.entityId === d.id || a.entityId === d.leadId
    )
    return dealActivities.length === 0
  })

  const myLeads = filteredLeads.filter(
    (l) => l.stage !== "Closed Won" && l.stage !== "Closed Lost"
  )
  const callsToday = filteredActivities.filter(
    (a) => a.type === "call" && isToday(parseISO(a.timestamp))
  )

  const openTasks = filteredTasks.filter(
    (t) => t.status === "To Do" || t.status === "In Progress"
  )
  const overdueTasks = openTasks.filter((t) =>
    isBefore(parseISO(t.dueDate), new Date())
  )
  const scheduledMeetings = filteredMeetings.filter(
    (m) => m.status === "Scheduled"
  )

  const closingThisMonth = filteredDeals.filter((d) => {
    if (d.stage === "Closed Won" || d.stage === "Closed Lost") return false
    try {
      const close = parseISO(d.closeDate)
      const now = new Date()
      return (
        close.getMonth() === now.getMonth() &&
        close.getFullYear() === now.getFullYear()
      )
    } catch {
      return false
    }
  })

  const wonDeals = filteredDeals.filter((d) => d.stage === "Closed Won")
  const totalRevenue = wonDeals.reduce((s, d) => s + d.value, 0)
  const conversionRate =
    filteredDeals.length > 0
      ? ((wonDeals.length / filteredDeals.length) * 100).toFixed(1)
      : "0"

  // ── Chart Data ─────────────────────────────────────────────────────
  // Stage distribution (pipeline)
  const stageDistribution = DEAL_STAGES.map((stage) => {
    const stageDeals = filteredDeals.filter((d) => d.stage === stage)
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((s, d) => s + d.value, 0),
    }
  })

  // Top accounts by deal value
  const accountDealMap = new Map<string, { name: string; value: number; deals: number }>()
  for (const d of filteredDeals) {
    const existing = accountDealMap.get(d.accountId)
    if (existing) {
      existing.value += d.value
      existing.deals += 1
    } else {
      accountDealMap.set(d.accountId, {
        name: d.accountName,
        value: d.value,
        deals: 1,
      })
    }
  }
  const topAccounts = [...accountDealMap.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // Recent won deals
  const recentSales = wonDeals
    .sort(
      (a, b) =>
        new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()
    )
    .slice(0, 5)

  // Revenue trend (month-by-month from all won deals, not just filtered)
  const revenueTrend = useMemo(() => {
    const monthMap = new Map<string, number>()
    const allWon = deals.filter(
      (d) =>
        d.stage === "Closed Won" &&
        (selectedUser === "__all__" || d.owner === selectedUser)
    )
    for (const d of allWon) {
      const key = format(parseISO(d.closeDate), "MMM yyyy")
      monthMap.set(key, (monthMap.get(key) ?? 0) + d.value)
    }
    return [...monthMap.entries()]
      .sort(
        (a, b) =>
          new Date(a[0]).getTime() - new Date(b[0]).getTime()
      )
      .map(([month, revenue]) => ({ month, revenue }))
  }, [selectedUser])

  // Lead source distribution
  const leadSourceMap = new Map<string, number>()
  for (const l of filteredLeads) {
    leadSourceMap.set(l.source, (leadSourceMap.get(l.source) ?? 0) + 1)
  }
  const leadDistribution = [...leadSourceMap.entries()].map(
    ([source, count]) => ({ name: source, value: count })
  )

  // Tasks by status
  const tasksByStatus = [
    {
      status: "To Do",
      count: filteredTasks.filter((t) => t.status === "To Do").length,
    },
    {
      status: "In Progress",
      count: filteredTasks.filter((t) => t.status === "In Progress").length,
    },
    {
      status: "Completed",
      count: filteredTasks.filter((t) => t.status === "Completed").length,
    },
  ]

  // Pipeline kanban-style data
  const kanbanStages = DEAL_STAGES.filter(
    (s) => s !== "Closed Won" && s !== "Closed Lost"
  )
  const kanbanData = kanbanStages.map((stage) => {
    const stageDeals = filteredDeals.filter((d) => d.stage === stage)
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((s, d) => s + d.value, 0),
    }
  })

  // ── Render ─────────────────────────────────────────────────────────
  const dashboardActions = (
    <>
      <Select
        value={preset}
        onValueChange={(v) => setPreset(v as DateFilterPreset)}
      >
        <SelectTrigger className="w-[140px]">
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
            className="w-[150px]"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
      )}

      {IS_SUPERADMIN && (
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-[180px]">
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
    </>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Dashboard"
        subtitle="Pipeline, leads, tasks, and revenue for the selected period."
        breadcrumbs={[{ label: 'CRM' }, { label: 'Dashboard' }]}
        actions={dashboardActions}
      />

      {/* ── Row 1: Primary KPIs ─────────────────────────────────── */}
      <StatsRow
        stats={[
          {
            label: "My Open Deals",
            value: openDeals.length,
            icon: Handshake,
            trend: { value: 8, isPositive: true },
            accent: "primary",
          },
          {
            label: "Untouched Deals",
            value: untouchedDeals.length,
            icon: ShieldAlert,
            trend: {
              value: untouchedDeals.length,
              isPositive: untouchedDeals.length === 0,
            },
            accent: untouchedDeals.length > 0 ? "danger" : "success",
          },
          {
            label: "My Leads",
            value: myLeads.length,
            icon: Users,
            trend: { value: 12, isPositive: true },
            accent: "info",
          },
          {
            label: "My Calls Today",
            value: callsToday.length,
            icon: Phone,
            accent: "violet",
          },
        ]}
      />

      {/* ── Row 2: Secondary KPIs ───────────────────────────────── */}
      <StatsRow
        stats={[
          {
            label: "Open Tasks",
            value: `${openTasks.length}${overdueTasks.length > 0 ? ` (${overdueTasks.length} overdue)` : ""}`,
            icon: CheckSquare,
            trend: overdueTasks.length > 0
              ? { value: overdueTasks.length, isPositive: false }
              : undefined,
            accent: overdueTasks.length > 0 ? "warning" : "primary",
          },
          {
            label: "Upcoming Meetings",
            value: scheduledMeetings.length,
            icon: CalendarClock,
            accent: "info",
          },
          {
            label: "Closing This Month",
            value: closingThisMonth.length,
            icon: Target,
            trend: {
              value: closingThisMonth.length,
              isPositive: closingThisMonth.length > 0,
            },
            accent: "teal",
          },
          {
            label: "Revenue (Won)",
            value: fmt(totalRevenue),
            icon: IndianRupee,
            trend: { value: 15, isPositive: true },
            accent: "success",
          },
        ]}
      />

      {/* ── Row 3: More KPIs ────────────────────────────────────── */}
      <StatsRow
        stats={[
          {
            label: "Total Accounts",
            value: filteredAccounts.length,
            icon: Building2,
            accent: "primary",
          },
          {
            label: "Conversion Rate",
            value: `${conversionRate}%`,
            icon: TrendingUp,
            trend: { value: 3, isPositive: true },
            accent: "teal",
          },
          {
            label: "Deals Closing This Month",
            value: fmt(
              closingThisMonth.reduce((s, d) => s + d.value, 0)
            ),
            icon: CalendarDays,
            accent: "violet",
          },
          {
            label: "Pipeline Value",
            value: fmt(openDeals.reduce((s, d) => s + d.value, 0)),
            icon: Handshake,
            accent: "success",
          },
        ]}
      />

      {/* ── Row 4: Charts — Stage Distribution + Lead Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stage Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "value" ? fmt(value) : value
                  }
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Legend />
                <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                  {stageDistribution.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={STAGE_COLORS[entry.stage] ?? "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Source Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {leadDistribution.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5: Revenue Trend + Pipeline Kanban ──────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Kanban Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Kanban</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kanbanData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  type="number"
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={100}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "value" ? fmt(value) : value
                  }
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="value" name="Pipeline Value" radius={[0, 4, 4, 0]}>
                  {kanbanData.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={STAGE_COLORS[entry.stage] ?? "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 6: Tasks bar + Top Accounts ─────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tasksByStatus}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  <Cell fill="#f59e0b" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#22c55e" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Open tasks list */}
            {openTasks.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">
                  Open Tasks
                </p>
                {openTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-md border p-2.5 text-sm"
                  >
                    <div className="flex-1 truncate">
                      <span className="font-medium">{t.title}</span>
                      {t.entityName && (
                        <span className="ml-2 text-muted-foreground">
                          — {t.entityName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        variant={taskPriorityVariant[t.priority] ?? "neutral"}
                      >
                        {t.priority}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Due {t.dueDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Accounts by Deal Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No account data for selected filters.
                </p>
              )}
              {topAccounts.map((acc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {acc.deals} deal{acc.deals !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">{fmt(acc.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 7: Recent Sales + Upcoming Meetings ─────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Won Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No won deals in this period.
              </p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.accountName} &middot; Closed {d.closeDate}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-emerald-600 whitespace-nowrap ml-3">
                      {fmt(d.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming meetings.
              </p>
            ) : (
              <div className="space-y-3">
                {scheduledMeetings.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.date} &middot; {m.startTime}–{m.endTime}
                        {m.location && ` &middot; ${m.location}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-3 whitespace-nowrap">
                      {m.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 8: Deals Closing This Month table ───────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            Deals Closing This Month ({closingThisMonth.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {closingThisMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deals expected to close this month.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Deal</th>
                    <th className="pb-2 font-medium">Account</th>
                    <th className="pb-2 font-medium text-right">Value</th>
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium text-right">
                      Probability
                    </th>
                    <th className="pb-2 font-medium">Close Date</th>
                    <th className="pb-2 font-medium">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {closingThisMonth.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{d.name}</td>
                      <td className="py-2.5">{d.accountName}</td>
                      <td className="py-2.5 text-right">{fmt(d.value)}</td>
                      <td className="py-2.5">
                        <StatusBadge
                          variant={
                            dealStageVariant[d.stage] ?? "neutral"
                          }
                        >
                          {d.stage}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5 text-right">{d.probability}%</td>
                      <td className="py-2.5">{d.closeDate}</td>
                      <td className="py-2.5">{d.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CrmDashboard
