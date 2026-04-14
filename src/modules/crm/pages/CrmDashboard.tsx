import { Users, Handshake, IndianRupee, TrendingUp } from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StatsRow } from "@/components/common/StatsRow"
import { Timeline } from "@/components/common/Timeline"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import type { TimelineEntry } from "@/components/common/Timeline"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"

import { leads } from "@/modules/crm/data/leads"
import { deals } from "@/modules/crm/data/deals"
import { notifications } from "@/modules/crm/data/notifications"
import { DEAL_STAGES } from "@/modules/crm/types"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const totalLeads = leads.length
const activeDeals = deals.filter(
  (d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost"
).length
const wonLeads = leads.filter((l) => l.stage === "Won")
const revenueThisMonth = wonLeads.reduce((sum, l) => sum + l.value, 0)
const conversionRate =
  totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0"

const notificationVariantMap: Record<string, TimelineEntry["variant"]> = {
  lead: "default",
  deal: "success",
  order: "warning",
  system: "error",
}

const timelineEntries: TimelineEntry[] = notifications.slice(0, 5).map((n) => ({
  id: n.id,
  title: n.title,
  description: n.description,
  timestamp: n.timestamp,
  variant: notificationVariantMap[n.type] ?? "default",
}))

// Pipeline summary
const pipelineData = DEAL_STAGES.map((stage) => {
  const stageDeals = deals.filter((d) => d.stage === stage)
  return {
    stage,
    count: stageDeals.length,
    value: formatCurrency(stageDeals.reduce((sum, d) => sum + d.value, 0)),
  }
})

const pipelineTab: TabConfig = {
  id: "pipeline",
  label: "Sales Pipeline",
  columns: [
    { key: "stage", label: "Stage", sortable: true },
    { key: "count", label: "Deals", sortable: true, align: "right" },
    { key: "value", label: "Value", align: "right" },
  ],
  data: pipelineData,
}

// Top deals
const dealStageVariant: Record<string, StatusBadgeVariant> = {
  Discovery: "info",
  Proposal: "warning",
  Negotiation: "neutral",
  "Closed Won": "success",
  "Closed Lost": "error",
}

const topDeals = [...deals]
  .sort((a, b) => b.value - a.value)
  .slice(0, 5)
  .map((d) => ({
    deal: d.name,
    account: d.accountName,
    value: d.value,
    stage: d.stage,
    probability: `${d.probability}%`,
    closeDate: d.closeDate,
  }))

const topDealsTab: TabConfig = {
  id: "top-deals",
  label: "Top Deals",
  columns: [
    { key: "deal", label: "Deal", sortable: true },
    { key: "account", label: "Account", sortable: true },
    { key: "value", label: "Value", sortable: true, align: "right" },
    { key: "stage", label: "Stage" },
    { key: "probability", label: "Probability", align: "right" },
    { key: "closeDate", label: "Close Date", sortable: true },
  ],
  data: topDeals,
}

const topDealsCellFormatter: CellFormatter = (value, key, row) => {
  if (key === "value" && typeof value === "number") {
    return { display: formatCurrency(value) }
  }
  if (key === "stage" && typeof value === "string") {
    const variant = dealStageVariant[value] ?? "neutral"
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  if (key === "stage" && typeof row["stage"] === "string" && row["stage"] === "Closed Lost") {
    return { className: "text-destructive" }
  }
  return null
}

function CrmDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-semibold">CRM Dashboard</h2>

      <StatsRow
        stats={[
          {
            label: "Total Leads",
            value: totalLeads,
            icon: Users,
            trend: { value: 12, isPositive: true },
          },
          {
            label: "Active Deals",
            value: activeDeals,
            icon: Handshake,
            trend: { value: 8, isPositive: true },
          },
          {
            label: "Revenue (Won)",
            value: formatCurrency(revenueThisMonth),
            icon: IndianRupee,
            trend: { value: 15, isPositive: true },
          },
          {
            label: "Conversion Rate",
            value: `${conversionRate}%`,
            icon: TrendingUp,
            trend: { value: 3, isPositive: true },
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sales Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessMetricsTable tabs={[pipelineTab]} pageSize={10} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline entries={timelineEntries} />
          </CardContent>
        </Card>
      </div>

      {/* Top Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Top Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessMetricsTable
            tabs={[topDealsTab]}
            cellFormatter={topDealsCellFormatter}
            pageSize={5}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default CrmDashboard
