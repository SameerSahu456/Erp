// Period bucketing + the derived time series (revenue / orders / leads).
//
// TEMPORARY — see the note in `seed.ts`. Phase 2 replaces this layer with
// `/crm/dashboard/revenue` (bucketed series) and
// `/crm/dashboard/hierarchy_wise_report` (per-user rows).

import { DEMO_YEAR, MONTHS, MONTH_WINDOW } from './seed'
import { WEEKS_PER_MONTH, type RevRecord } from './records'
import { totalRevenue } from './aggregations'

export type Period = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

/** Index of a month name within the trailing window (−1 if outside). */
export const monthIdxOf = (month: string) => MONTH_WINDOW.indexOf(month)

/** Keep only records inside an inclusive From→To month range (either end
 *  optional). Powers the 'custom' period. */
export function restrictToRange(records: RevRecord[], from?: string, to?: string): RevRecord[] {
  const loIdx = from ? monthIdxOf(from) : -1
  const hiIdx = to ? monthIdxOf(to) : -1
  const lo = loIdx < 0 ? 0 : loIdx
  const hi = hiIdx < 0 ? MONTH_WINDOW.length - 1 : hiIdx
  return records.filter((r) => r.monthIdx >= lo && r.monthIdx <= hi)
}

/** The bucket a record falls into for the selected period. Weekly buckets are
 *  month-scoped ("Jan W2"); monthly & custom bucket by month name. */
export function recordBucket(r: RevRecord, period: Period): string {
  if (period === 'yearly') return DEMO_YEAR
  if (period === 'quarterly') return `Q${Math.floor(r.monthIdx / 3) + 1}`
  if (period === 'weekly') return `${r.month} W${r.weekIdx + 1}`
  return r.month
}

/** Sort key so weekly / monthly buckets order chronologically. */
const bucketOrder = (r: RevRecord, period: Period) =>
  period === 'weekly' ? r.monthIdx * WEEKS_PER_MONTH + r.weekIdx : r.monthIdx

/** Ordered, de-duplicated bucket labels for the fixed window (month-grained
 *  periods only — weekly & custom derive labels from the records). */
function periodLabels(period: Period): string[] {
  const labels: string[] = []
  for (let i = 0; i < MONTH_WINDOW.length; i++) {
    const l =
      period === 'yearly'
        ? DEMO_YEAR
        : period === 'quarterly'
          ? `Q${Math.floor(i / 3) + 1}`
          : (MONTHS[i] ?? '')
    if (!labels.includes(l)) labels.push(l)
  }
  return labels
}

/** Bucket labels for a series. For 'weekly' and 'custom' the labels span only
 *  the buckets the (already scoped) records actually cover, so those views
 *  never show empty periods outside the data. */
export function periodLabelsFor(records: RevRecord[], period: Period): string[] {
  if (period === 'monthly' || period === 'quarterly' || period === 'yearly') {
    return periodLabels(period)
  }
  if (period === 'custom') {
    if (!records.length) return []
    let lo = Infinity
    let hi = -Infinity
    for (const r of records) {
      if (r.monthIdx < lo) lo = r.monthIdx
      if (r.monthIdx > hi) hi = r.monthIdx
    }
    return MONTH_WINDOW.slice(lo, hi + 1)
  }
  const seen = new Map<string, number>()
  for (const r of records) {
    const label = recordBucket(r, period)
    if (!seen.has(label)) seen.set(label, bucketOrder(r, period))
  }
  return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([l]) => l)
}

export interface MonthRevenue {
  month: string
  revenue: number
}

/** Revenue series bucketed by the selected period. */
export function byMonth(records: RevRecord[], period: Period = 'monthly'): MonthRevenue[] {
  return periodLabelsFor(records, period).map((label) => ({
    month: label,
    revenue: totalRevenue(records.filter((r) => recordBucket(r, period) === label)),
  }))
}

export interface MonthOrders {
  month: string
  orders: number
}

/** Order (deals-closed) COUNT bucketed by period — the funnel trend cells. */
export function ordersByMonth(records: RevRecord[], period: Period = 'monthly'): MonthOrders[] {
  return periodLabelsFor(records, period).map((label) => ({
    month: label,
    orders: records.filter((r) => recordBucket(r, period) === label).length,
  }))
}

/** Top-of-funnel ratio used to derive an estimated lead count from closed
 *  orders. Mirrors the reference's `salesFunnelH` so the Leads trend and the
 *  funnel it came from agree. */
export const LEAD_RATIO = 0.16

export interface MonthLeads {
  month: string
  leads: number
}

/** Estimated leads per period, derived from the closed-order count. */
export function leadsByMonth(records: RevRecord[], period: Period = 'monthly'): MonthLeads[] {
  return ordersByMonth(records, period).map((m) => ({
    month: m.month,
    leads: Math.round(m.orders / LEAD_RATIO),
  }))
}

export interface MonthGrowth extends MonthRevenue {
  momPct: number
  share: number
}

/** Bucketed revenue with period-over-period % and revenue share — the
 *  "Monthly Breakdown" table on the Revenue by Month detail page. */
export function monthlyGrowth(records: RevRecord[], period: Period = 'monthly'): MonthGrowth[] {
  const series = byMonth(records, period)
  const grand = totalRevenue(records) || 1
  return series.map((m, i) => {
    const prev = series[i - 1]?.revenue ?? 0
    return {
      month: m.month,
      revenue: m.revenue,
      momPct: prev ? ((m.revenue - prev) / prev) * 100 : 0,
      share: (m.revenue / grand) * 100,
    }
  })
}
