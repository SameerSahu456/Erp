import type { ReportChart, ReportFormat, ReportRow } from '../types'

export type InsightKind = 'highest' | 'lowest' | 'average' | 'peak' | 'latest' | 'change'

export interface ReportInsight {
  kind: InsightKind
  /** Row label the number belongs to (customer, month…). Absent for averages. */
  name?: string
  value: number
  format: ReportFormat
  /** 0–100 share of the column total. Only set when a total is meaningful. */
  sharePct?: number
  /** For `change`: the labels of the first and last points compared. */
  fromName?: string
  toName?: string
}

interface Point {
  name: string
  value: number
}

/** Totals only make sense for amounts and counts — never for %, or days. */
const isSummable = (format: ReportFormat) => format === 'currency' || format === 'number'

function toPoints(rows: ReportRow[], chart: ReportChart): Point[] {
  const points: Point[] = []
  for (const row of rows) {
    const value = row[chart.yKey]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    points.push({ name: String(row[chart.xKey] ?? ''), value })
  }
  return points
}

/** Plain-language takeaways derived from the same column the chart plots.
 *
 *  Categorical (bar) reports answer "who is biggest / smallest / typical";
 *  time-series (line) reports answer "when did it peak, where is it now and
 *  which way is it heading". Returns [] when there is nothing to compare. */
export function buildInsights(rows: ReportRow[], chart: ReportChart): ReportInsight[] {
  const format = chart.yFormat ?? 'number'
  const points = toPoints(rows, chart)
  if (points.length < 2) return []

  const highest = points.reduce((a, b) => (b.value > a.value ? b : a))
  const lowest = points.reduce((a, b) => (b.value < a.value ? b : a))
  const total = points.reduce((s, p) => s + p.value, 0)

  if (chart.type === 'line') {
    const first = points[0]
    const last = points[points.length - 1]
    const insights: ReportInsight[] = [
      { kind: 'peak', name: highest.name, value: highest.value, format },
      { kind: 'latest', name: last.name, value: last.value, format },
    ]
    if (first.value !== 0) {
      insights.push({
        kind: 'change',
        value: ((last.value - first.value) / Math.abs(first.value)) * 100,
        format: 'percent',
        fromName: first.name,
        toName: last.name,
      })
    }
    return insights
  }

  const canShare = isSummable(format) && total > 0 && points.every((p) => p.value >= 0)
  const share = (v: number) => (canShare ? (v / total) * 100 : undefined)

  return [
    {
      kind: 'highest',
      name: highest.name,
      value: highest.value,
      format,
      sharePct: share(highest.value),
    },
    { kind: 'lowest', name: lowest.name, value: lowest.value, format, sharePct: share(lowest.value) },
    { kind: 'average', value: total / points.length, format },
  ]
}
