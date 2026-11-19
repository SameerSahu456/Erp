import type { LucideIcon } from 'lucide-react'

import type { ChartAccent } from '@/components/common/display/chartTheme'
import type { DataCardProps } from '@/components/common/display/DataCard'

/** How a cell / KPI value is rendered. Declared on the column so formatting is
 *  data-driven instead of guessed from the column key. */
export type ReportFormat = 'text' | 'currency' | 'number' | 'percent' | 'status' | 'days' | 'date'

export interface ReportColumn {
  key: string
  label: string
  format?: ReportFormat
  sortable?: boolean
  filterable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
}

export type ReportRow = Record<string, string | number | null>

export type ReportAggregate = 'sum' | 'avg' | 'count' | 'max' | 'min'

/** A headline number computed from the report rows. */
export interface ReportKpi {
  label: string
  /** Column to aggregate. Omit for `count`. */
  column?: string
  agg: ReportAggregate
  format?: ReportFormat
  accent?: DataCardProps['accent']
}

export interface ReportChart {
  type: 'bar' | 'line'
  /** Category axis column (usually the first text column). */
  xKey: string
  /** Value axis column. */
  yKey: string
  yFormat?: ReportFormat
  accent?: ChartAccent
}

/** What a report looks like. The rows themselves come from the backend
 *  (`GET /reports/catalog/{id}`), keyed by the column keys declared here. */
export interface ReportDefinition {
  id: string
  label: string
  /** One plain sentence: the business question this report answers. */
  description: string
  columns: ReportColumn[]
  kpis?: ReportKpi[]
  chart?: ReportChart
}

export interface ReportCategory {
  id: string
  label: string
  description: string
  icon: LucideIcon
  reports: ReportDefinition[]
}
