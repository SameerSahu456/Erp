import { useCallback, useMemo, useState } from "react"
import { format, isBefore, isToday, parseISO } from "date-fns"

import { useAuth } from "@shared/auth/use-auth"
import { fullName } from "@shared/auth/AuthContext"

import { leads } from "../../data/leads"
import { deals } from "../../data/deals"
import { accounts } from "../../data/accounts"
import { mockTasks } from "../../data/tasks"
import { mockMeetings } from "../../data/meetings"
import { sourceLabel } from "../../components/leads/leadForm.constants"
import { mockActivities } from "../../data/activities"
import { DEAL_STAGES, MOCK_USERS } from "../../types"
import {
  type DateFilterPreset,
  type DateRange,
  getDateRange,
  isDateInRange,
} from "../../utils/dashboard/dashboard-filters"

// Container logic for the CRM dashboard: owns the period/user filter state and
// derives every KPI, chart series, and list shown on the page from the mock
// CRM datasets. Pure aggregation — no JSX.
export function useCrmDashboard() {
  const { user } = useAuth()
  const isSuperadmin = !!user?.is_superuser
  const currentUserName = user ? fullName(user) : ""

  // Filter state
  const [preset, setPreset] = useState<DateFilterPreset>("monthly")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [selectedUser, setSelectedUser] = useState<string>(
    isSuperadmin ? "__all__" : currentUserName,
  )

  // Compute date range
  const dateRange: DateRange = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: parseISO(customFrom), to: parseISO(customTo) }
    }
    return getDateRange(preset)
  }, [preset, customFrom, customTo])

  // ── Filtered data ──────────────────────────────────────────────────
  // Stable per selectedUser so the memoized selectors below don't recompute on
  // every render (and so their dependency arrays are honest).
  const isMyData = useCallback(
    (owner: string) => selectedUser === "__all__" || owner === selectedUser,
    [selectedUser]
  )

  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.stage !== "Rejected" &&
          isMyData(l.owner) &&
          isDateInRange(l.createdAt, dateRange)
      ),
    [isMyData, dateRange]
  )

  const filteredDeals = useMemo(
    () =>
      deals.filter(
        (d) => isMyData(d.owner) && isDateInRange(d.createdAt, dateRange)
      ),
    [isMyData, dateRange]
  )

  const filteredTasks = useMemo(
    () =>
      mockTasks.filter(
        (t) =>
          isMyData(t.assignedTo) && isDateInRange(t.createdAt, dateRange)
      ),
    [isMyData, dateRange]
  )

  const filteredMeetings = useMemo(
    () =>
      mockMeetings.filter(
        (m) => isMyData(m.organizer) && isDateInRange(m.date, dateRange)
      ),
    [isMyData, dateRange]
  )

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => isMyData(a.owner)),
    [isMyData]
  )

  const filteredActivities = useMemo(
    () =>
      mockActivities.filter(
        (a) =>
          isMyData(a.user) && isDateInRange(a.timestamp, dateRange)
      ),
    [isMyData, dateRange]
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
    ([source, count]) => ({ name: sourceLabel(source), value: count })
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

  return {
    // filter state
    isSuperadmin,
    preset, setPreset,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    selectedUser, setSelectedUser,
    mockUsers: MOCK_USERS,
    // kpis
    openDeals,
    untouchedDeals,
    myLeads,
    callsToday,
    openTasks,
    overdueTasks,
    scheduledMeetings,
    closingThisMonth,
    totalRevenue,
    conversionRate,
    filteredAccounts,
    // chart data
    stageDistribution,
    topAccounts,
    recentSales,
    revenueTrend,
    leadDistribution,
    tasksByStatus,
    kanbanData,
  }
}

export type CrmDashboardController = ReturnType<typeof useCrmDashboard>
