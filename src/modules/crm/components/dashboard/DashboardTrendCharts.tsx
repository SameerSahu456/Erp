import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CHART_COLORS,
  ChartDefs,
  PREMIUM_TOOLTIP_CURSOR_BAR,
  PREMIUM_TOOLTIP_CURSOR_LINE,
  PremiumTooltip,
  horizontalFill,
} from "@/components/common/display/chartTheme"

import { STAGE_ACCENTS, fmt, fmtShort } from "../../utils/dashboard/dashboard-format"
import type { CrmDashboardController } from "../../hooks/dashboard/useCrmDashboard"
import { DASHBOARD_STRINGS } from "./dashboard.strings"

export function DashboardTrendCharts({ dash }: { dash: CrmDashboardController }) {
  const { revenueTrend, kanbanData } = dash

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Revenue Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{DASHBOARD_STRINGS.charts.revenueTrendTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <ChartDefs />
              <defs>
                <linearGradient id="crm-revenue-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.emerald.via} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS.emerald.via} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-border/50" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtShort}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={PREMIUM_TOOLTIP_CURSOR_LINE}
                content={
                  <PremiumTooltip
                    formatter={(value, name) => [fmt(Number(value)), name]}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name={DASHBOARD_STRINGS.charts.series.revenue}
                stroke={`url(#${"cpt-grad-h"}-emerald)`}
                strokeWidth={3}
                dot={{ r: 4, fill: CHART_COLORS.emerald.via, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                activeDot={{ r: 7, fill: CHART_COLORS.emerald.via, strokeWidth: 3, stroke: "hsl(var(--card))" }}
                filter="url(#cpt-chart-shadow)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pipeline Kanban Bar */}
      <Card>
        <CardHeader>
          <CardTitle>{DASHBOARD_STRINGS.charts.pipelineKanbanTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kanbanData} layout="vertical">
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 6" horizontal={false} className="stroke-border/50" />
              <XAxis
                type="number"
                tickFormatter={fmtShort}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="stage"
                width={100}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={PREMIUM_TOOLTIP_CURSOR_BAR}
                content={
                  <PremiumTooltip
                    formatter={(value, name) =>
                      name === "value" ? [fmt(Number(value)), name] : [value, name]
                    }
                  />
                }
              />
              <Bar dataKey="value" name={DASHBOARD_STRINGS.charts.series.pipelineValue} radius={[0, 6, 6, 0]} filter="url(#cpt-chart-shadow)">
                {kanbanData.map((entry) => (
                  <Cell
                    key={entry.stage}
                    fill={horizontalFill(STAGE_ACCENTS[entry.stage] ?? "indigo")}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
