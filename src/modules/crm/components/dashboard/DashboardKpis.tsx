import {
  Building2,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  Handshake,
  IndianRupee,
  Phone,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"

import { StatsRow } from "@/components/common/display/StatsRow"

import { fmt } from "../../utils/dashboard/dashboard-format"
import type { CrmDashboardController } from "../../hooks/dashboard/useCrmDashboard"
import { DASHBOARD_STRINGS } from "./dashboard.strings"

export function DashboardKpis({ dash }: { dash: CrmDashboardController }) {
  const {
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
  } = dash

  return (
    <>
      {/* ── Row 1: Primary KPIs ─────────────────────────────────── */}
      <StatsRow
        stats={[
          {
            label: DASHBOARD_STRINGS.kpis.openDeals,
            value: openDeals.length,
            icon: Handshake,
            trend: { value: 8, isPositive: true },
            accent: "primary",
          },
          {
            label: DASHBOARD_STRINGS.kpis.untouchedDeals,
            value: untouchedDeals.length,
            icon: ShieldAlert,
            trend: {
              value: untouchedDeals.length,
              isPositive: untouchedDeals.length === 0,
            },
            accent: untouchedDeals.length > 0 ? "danger" : "success",
          },
          {
            label: DASHBOARD_STRINGS.kpis.myLeads,
            value: myLeads.length,
            icon: Users,
            trend: { value: 12, isPositive: true },
            accent: "info",
          },
          {
            label: DASHBOARD_STRINGS.kpis.callsToday,
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
            label: DASHBOARD_STRINGS.kpis.openTasks,
            value: `${openTasks.length}${overdueTasks.length > 0 ? DASHBOARD_STRINGS.kpis.overdueSuffix(overdueTasks.length) : ""}`,
            icon: CheckSquare,
            trend: overdueTasks.length > 0
              ? { value: overdueTasks.length, isPositive: false }
              : undefined,
            accent: overdueTasks.length > 0 ? "warning" : "primary",
          },
          {
            label: DASHBOARD_STRINGS.kpis.upcomingMeetings,
            value: scheduledMeetings.length,
            icon: CalendarClock,
            accent: "info",
          },
          {
            label: DASHBOARD_STRINGS.kpis.closingThisMonth,
            value: closingThisMonth.length,
            icon: Target,
            trend: {
              value: closingThisMonth.length,
              isPositive: closingThisMonth.length > 0,
            },
            accent: "teal",
          },
          {
            label: DASHBOARD_STRINGS.kpis.revenueWon,
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
            label: DASHBOARD_STRINGS.kpis.totalAccounts,
            value: filteredAccounts.length,
            icon: Building2,
            accent: "primary",
          },
          {
            label: DASHBOARD_STRINGS.kpis.conversionRate,
            value: DASHBOARD_STRINGS.kpis.percentValue(conversionRate),
            icon: TrendingUp,
            trend: { value: 3, isPositive: true },
            accent: "teal",
          },
          {
            label: DASHBOARD_STRINGS.kpis.dealsClosingThisMonth,
            value: fmt(
              closingThisMonth.reduce((s, d) => s + d.value, 0)
            ),
            icon: CalendarDays,
            accent: "violet",
          },
          {
            label: DASHBOARD_STRINGS.kpis.pipelineValue,
            value: fmt(openDeals.reduce((s, d) => s + d.value, 0)),
            icon: Handshake,
            accent: "success",
          },
        ]}
      />
    </>
  )
}
