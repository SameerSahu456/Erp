import { format as formatDate, isValid, parseISO } from 'date-fns'

import { formatINR, formatINRShort } from '@/lib/currency'

import type { ReportAggregate, ReportFormat, ReportKpi, ReportRow } from '../types'

const numberFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
const percentFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 })

/** Full-precision display for table cells. */
export function formatValue(value: unknown, format: ReportFormat = 'text'): string {
  if (value === null || value === undefined || value === '') return '—'
  switch (format) {
    case 'currency':
      return typeof value === 'number' ? formatINR(value) : String(value)
    case 'number':
      return typeof value === 'number' ? numberFmt.format(value) : String(value)
    case 'percent':
      return typeof value === 'number' ? `${percentFmt.format(value)}%` : String(value)
    case 'days':
      return typeof value === 'number' ? `${numberFmt.format(value)} d` : String(value)
    case 'date': {
      if (typeof value !== 'string') return String(value)
      const d = parseISO(value)
      return isValid(d) ? formatDate(d, 'dd MMM yyyy') : value
    }
    default:
      return String(value)
  }
}

/** Compact display for KPI tiles and chart axes (₹1.2Cr, 45.3%). */
export function formatCompact(value: number, format: ReportFormat = 'number'): string {
  switch (format) {
    case 'currency':
      return formatINRShort(value)
    case 'percent':
      return `${percentFmt.format(value)}%`
    case 'days':
      return `${percentFmt.format(value)} d`
    default:
      return numberFmt.format(value)
  }
}

function numericColumn(rows: ReportRow[], column: string): number[] {
  return rows
    .map((r) => r[column])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

export function aggregate(rows: ReportRow[], agg: ReportAggregate, column?: string): number {
  if (agg === 'count' || !column) return rows.length
  const values = numericColumn(rows, column)
  if (values.length === 0) return 0
  switch (agg) {
    case 'sum':
      return values.reduce((s, v) => s + v, 0)
    case 'avg':
      return values.reduce((s, v) => s + v, 0) / values.length
    case 'max':
      return Math.max(...values)
    case 'min':
      return Math.min(...values)
    default:
      return 0
  }
}

export function computeKpi(rows: ReportRow[], kpi: ReportKpi): string {
  const value = aggregate(rows, kpi.agg, kpi.column)
  const format = kpi.format ?? (kpi.agg === 'count' ? 'number' : 'number')
  return formatCompact(value, format)
}

export const isNumericFormat = (format?: ReportFormat) =>
  format === 'currency' || format === 'number' || format === 'percent' || format === 'days'
