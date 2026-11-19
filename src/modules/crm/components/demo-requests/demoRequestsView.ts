import { AlertTriangle, ClipboardList, Hourglass, Truck } from "lucide-react"

import type { StatCardData } from "@/components/common/display/StatsRow"

import type {
  DemoRequestListItemWire,
  DemoRequestStatsWire,
  DemoRequestStatusWire,
} from "../../api"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import { formatDate, requestableTypeLabel, statusToLabel, sumStatuses } from "./demoRequestsConfig"

const MS_PER_DAY = 1000 * 60 * 60 * 24

// One wire row → the table's row model. `now` is passed in (not read here) so
// the caller controls when "days overdue" is evaluated.
export function toDemoRow(d: DemoRequestListItemWire, now: number) {
  return {
    id: d.id,
    demoNumber: d.demo_number,
    requestType: requestableTypeLabel(d.requestable_type),
    accountId: d.account_id,
    accountName: d.account_name ?? "",
    requestedBy: d.requested_by_name ?? "",
    items: d.items_count ?? 0,
    returnDate: formatDate(d.expected_return_date),
    overdue: d.is_overdue,
    overdueByDays: d.is_overdue
      ? Math.max(0, Math.ceil((now - new Date(d.expected_return_date).getTime()) / MS_PER_DAY))
      : 0,
    status: statusToLabel(d.status, d.is_overdue),
    created: formatDate(d.created_at),
  }
}

// KPI cards — filter-aware server counts over the whole set, so they stay put
// across pages and tabs and move only when search / created-on range changes.
// Statuses where the unit has left our warehouse and not yet come back.
const IN_THE_FIELD_STATUSES: DemoRequestStatusWire[] = [
  "PartiallyDispatched",
  "Dispatched",
  "WithCustomer",
  "PartiallyReturned",
]

export function buildDemoKpiStats(stats: DemoRequestStatsWire | undefined): StatCardData[] {
  const overdue = stats?.overdue ?? 0
  return [
    { label: S.list.stats.total, value: stats?.total ?? 0, icon: ClipboardList, accent: "primary" },
    {
      label: S.list.stats.pendingApproval,
      value: sumStatuses(stats, ["Pending for Approval"]),
      icon: Hourglass,
      accent: "warning",
    },
    {
      label: S.list.stats.inTheField,
      value: sumStatuses(stats, IN_THE_FIELD_STATUSES),
      icon: Truck,
      accent: "info",
    },
    {
      label: S.list.stats.overdueReturns,
      value: overdue,
      icon: AlertTriangle,
      accent: overdue > 0 ? "danger" : "primary",
    },
  ]
}
