import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import {
  CHART_COLORS,
  ChartDefs,
  PREMIUM_TOOLTIP_CURSOR_BAR,
  PREMIUM_TOOLTIP_CURSOR_LINE,
  PremiumTooltip,
  horizontalFill,
} from '@/components/common/display/chartTheme'

import type { ReportChart as ReportChartConfig, ReportColumn, ReportRow } from '../types'
import { formatCompact, formatValue } from '../utils/report-format'
import { buildInsights } from '../utils/report-insights'
import { ReportInsights } from './ReportInsights'
import { REPORT_BUILDER_STRINGS as S } from './report-builder.strings'

interface ReportChartProps {
  chart: ReportChartConfig
  columns: ReportColumn[]
  rows: ReportRow[]
}

const ROW_HEIGHT = 36
const MIN_HEIGHT = 200
const LINE_HEIGHT = 280
const MAX_LABEL = 26
// Category-axis gutter sized to the longest label, so short names don't leave
// a wide empty margin and long ones still fit.
const LABEL_CHAR_PX = 8.2
const LABEL_MIN_PX = 72
const LABEL_MAX_PX = 200
const TICK = { fontSize: 12 }

const truncateLabel = (v: unknown) => {
  const s = String(v ?? '')
  return s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1)}…` : s
}

/** The report's picture: a titled card with the "At a glance" takeaways on
 *  top and one chart below — horizontal bars for categorical breakdowns, a
 *  line for month-over-month trends. Driven by the report's `chart` config. */
export function ReportChart({ chart, columns, rows }: ReportChartProps) {
  const accent = chart.accent ?? 'primary'
  const yFormat = chart.yFormat ?? 'number'
  const label = (key: string) => columns.find((c) => c.key === key)?.label ?? key
  const seriesName = label(chart.yKey)
  const categoryName = label(chart.xKey)
  const isLine = chart.type === 'line'
  const hasData = rows.some((r) => typeof r[chart.yKey] === 'number')

  const insights = useMemo(() => buildInsights(rows, chart), [rows, chart])

  const labelWidth = useMemo(() => {
    const longest = rows.reduce(
      (n, r) => Math.max(n, truncateLabel(r[chart.xKey]).length),
      0,
    )
    return Math.min(LABEL_MAX_PX, Math.max(LABEL_MIN_PX, Math.ceil(longest * LABEL_CHAR_PX) + 16))
  }, [rows, chart.xKey])

  const tooltip = (
    <Tooltip
      cursor={isLine ? PREMIUM_TOOLTIP_CURSOR_LINE : PREMIUM_TOOLTIP_CURSOR_BAR}
      content={
        <PremiumTooltip
          formatter={(value, name) => [formatValue(Number(value), yFormat), name]}
          labelFormatter={(l) => String(l)}
        />
      }
    />
  )

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-3.5">
        <Typography variant="card-title">{S.chart.title(seriesName, categoryName)}</Typography>
        <Typography variant="helper" tone="muted">
          {isLine ? S.chart.lineHint : S.chart.barHint}
        </Typography>
      </div>

      <ReportInsights insights={insights} rowCount={rows.length} />

      {!hasData ? (
        <div className="px-5 py-10 text-center">
          <Typography tone="muted">{S.chart.noNumericColumn}</Typography>
        </div>
      ) : isLine ? (
        <div className="px-3 pt-5 pb-3">
          <ResponsiveContainer width="100%" height={LINE_HEIGHT}>
            <LineChart data={rows} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
              <ChartDefs accents={[accent]} />
              <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-border/60" />
              <XAxis
                dataKey={chart.xKey}
                tick={TICK}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompact(v, yFormat)}
                tick={TICK}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
                width={72}
              />
              {tooltip}
              <Line
                type="monotone"
                dataKey={chart.yKey}
                name={seriesName}
                stroke={CHART_COLORS[accent].via}
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: CHART_COLORS[accent].via,
                  strokeWidth: 2,
                  stroke: 'var(--card)',
                }}
                activeDot={{
                  r: 6,
                  fill: CHART_COLORS[accent].via,
                  strokeWidth: 3,
                  stroke: 'var(--card)',
                }}
                filter="url(#cpt-chart-shadow)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="px-3 pt-4 pb-2">
          <ResponsiveContainer
            width="100%"
            height={Math.max(MIN_HEIGHT, rows.length * ROW_HEIGHT + 36)}
          >
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 72, left: 8, bottom: 0 }}
            >
              <ChartDefs accents={[accent]} />
              <CartesianGrid
                strokeDasharray="3 6"
                horizontal={false}
                className="stroke-border/60"
              />
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatCompact(v, yFormat)}
                tick={TICK}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey={chart.xKey}
                width={labelWidth}
                tickFormatter={truncateLabel}
                tick={TICK}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              {tooltip}
              <Bar
                dataKey={chart.yKey}
                name={seriesName}
                fill={horizontalFill(accent)}
                radius={[0, 6, 6, 0]}
                maxBarSize={20}
                filter="url(#cpt-chart-shadow)"
              >
                {/* Value printed at the end of each bar, so the chart reads
                    without hovering. */}
                <LabelList
                  dataKey={chart.yKey}
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(v: unknown) =>
                    typeof v === 'number' ? formatCompact(v, yFormat) : ''
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
