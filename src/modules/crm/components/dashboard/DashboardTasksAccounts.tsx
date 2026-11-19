import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import {
  ChartDefs,
  PREMIUM_TOOLTIP_CURSOR_BAR,
  PremiumTooltip,
  verticalFill,
} from "@/components/common/display/chartTheme"

import { fmt, taskPriorityVariant } from "../../utils/dashboard/dashboard-format"
import type { CrmDashboardController } from "../../hooks/dashboard/useCrmDashboard"
import { DASHBOARD_STRINGS } from "./dashboard.strings"

export function DashboardTasksAccounts({ dash }: { dash: CrmDashboardController }) {
  const { tasksByStatus, openTasks, topAccounts } = dash

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Tasks Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{DASHBOARD_STRINGS.tasks.overviewTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tasksByStatus}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-border/50" />
              <XAxis
                dataKey="status"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={PREMIUM_TOOLTIP_CURSOR_BAR}
                content={<PremiumTooltip />}
              />
              <Bar dataKey="count" name={DASHBOARD_STRINGS.charts.series.tasks} radius={[6, 6, 0, 0]} filter="url(#cpt-chart-shadow)">
                <Cell fill={verticalFill("amber")} />
                <Cell fill={verticalFill("info")} />
                <Cell fill={verticalFill("emerald")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Open tasks list */}
          {openTasks.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {DASHBOARD_STRINGS.tasks.openTasksHeading}
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
                      {DASHBOARD_STRINGS.tasks.dueLabel(t.dueDate)}
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
          <CardTitle>{DASHBOARD_STRINGS.accounts.topAccountsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {DASHBOARD_STRINGS.accounts.empty}
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
                    {DASHBOARD_STRINGS.accounts.dealCount(acc.deals)}
                  </p>
                </div>
                <p className="font-semibold text-sm">{fmt(acc.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
