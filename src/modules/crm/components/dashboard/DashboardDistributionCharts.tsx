import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartDefs,
  PREMIUM_TOOLTIP_CURSOR_BAR,
  PremiumTooltip,
  radialFill,
  verticalFill,
} from "@/components/common/display/chartTheme"

import { PIE_ACCENTS, STAGE_ACCENTS, fmt } from "../../utils/dashboard/dashboard-format"
import type { CrmDashboardController } from "../../hooks/dashboard/useCrmDashboard"
import { DASHBOARD_STRINGS } from "./dashboard.strings"

export function DashboardDistributionCharts({ dash }: { dash: CrmDashboardController }) {
  const { stageDistribution, leadDistribution } = dash

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Stage Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{DASHBOARD_STRINGS.charts.stageDistributionTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageDistribution}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-border/50" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
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
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="count" name={DASHBOARD_STRINGS.charts.series.deals} radius={[6, 6, 0, 0]} filter="url(#cpt-chart-shadow)">
                {stageDistribution.map((entry) => (
                  <Cell
                    key={entry.stage}
                    fill={verticalFill(STAGE_ACCENTS[entry.stage] ?? "indigo")}
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
          <CardTitle>{DASHBOARD_STRINGS.charts.leadSourceTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <ChartDefs />
              <Pie
                data={leadDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                stroke="hsl(var(--card))"
                strokeWidth={2}
                label={({ name, value }) => DASHBOARD_STRINGS.charts.pieLabel(name, value)}
              >
                {leadDistribution.map((_, i) => (
                  <Cell
                    key={i}
                    fill={radialFill(PIE_ACCENTS[i % PIE_ACCENTS.length]!)}
                  />
                ))}
              </Pie>
              <Tooltip content={<PremiumTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
