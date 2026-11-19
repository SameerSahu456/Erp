import { Clock, Hash, IndianRupee, Percent, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { StatsRow } from '@/components/common/display/StatsRow'

import type { ReportFormat, ReportKpi, ReportRow } from '../types'
import { computeKpi } from '../utils/report-format'
import { REPORT_BUILDER_STRINGS as S } from './report-builder.strings'

interface ReportSummaryProps {
  kpis: ReportKpi[]
  rows: ReportRow[]
}

/** The icon says what kind of number it is (money, a rate, a duration, a count). */
const FORMAT_ICON: Partial<Record<ReportFormat, LucideIcon>> = {
  currency: IndianRupee,
  percent: Percent,
  days: Clock,
  number: Hash,
}

function kpiHint(kpi: ReportKpi, rowCount: number): string {
  switch (kpi.agg) {
    case 'sum':
      return S.kpi.hint.sum(rowCount)
    case 'avg':
      return S.kpi.hint.avg
    case 'max':
      return S.kpi.hint.max
    case 'min':
      return S.kpi.hint.min
    default:
      return S.kpi.hint.count
  }
}

// Literal class strings (not built at runtime) so Tailwind can see them.
const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 xl:grid-cols-4',
}

/** Headline tiles computed from the report rows (sum / avg / count / max / min),
 *  each with a one-line note on how the number was worked out. */
export function ReportSummary({ kpis, rows }: ReportSummaryProps) {
  if (kpis.length === 0) return null
  return (
    <StatsRow
      className={cn('cpt-kpi-grid--compact grid', GRID_COLS[Math.min(kpis.length, 4)])}
      stats={kpis.map((k) => ({
        label: k.label,
        value: computeKpi(rows, k),
        icon: FORMAT_ICON[k.format ?? 'number'] ?? Hash,
        sub: kpiHint(k, rows.length),
        accent: k.accent ?? 'primary',
      }))}
    />
  )
}
