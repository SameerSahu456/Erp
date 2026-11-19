// Ranked breakdowns, funnel + quotes.
//
// TEMPORARY — see the note in `seed.ts`. Phase 2 replaces this layer with
// `/crm/dashboard/revenue` (bucketed series) and
// `/crm/dashboard/hierarchy_wise_report` (per-user rows).

import { seed } from './seed'
import type { RevRecord } from './records'

const total = (rs: RevRecord[]) => rs.reduce((a, r) => a + r.value, 0)
export const totalRevenue = total

function groupSum<T extends string>(records: RevRecord[], key: (r: RevRecord) => T) {
  const m = new Map<T, { value: number; count: number }>()
  for (const r of records) {
    const k = key(r)
    const cur = m.get(k) ?? { value: 0, count: 0 }
    cur.value += r.value
    cur.count += 1
    m.set(k, cur)
  }
  return m
}


// ── ranked breakdowns ──────────────────────────────────────────────────────

export interface RankRow {
  label: string
  value: number
  count: number
  pct: number
}

function ranked<T extends string>(records: RevRecord[], key: (r: RevRecord) => T): RankRow[] {
  const grand = total(records) || 1
  return [...groupSum(records, key).entries()]
    .map(([label, v]) => ({ label, value: v.value, count: v.count, pct: (v.value / grand) * 100 }))
    .sort((a, b) => b.value - a.value)
}

export const byAccount = (r: RevRecord[]) => ranked(r, (x) => x.account)
export const byCondition = (r: RevRecord[]) => ranked(r, (x) => x.condition)
export const byCategory = (r: RevRecord[]) => ranked(r, (x) => x.category)
export const byOem = (r: RevRecord[]) => ranked(r, (x) => x.oem)
/** Products = category · OEM combinations, ranked by closed value. */
export const byProduct = (r: RevRecord[]) => ranked(r, (x) => `${x.category} · ${x.oem}`)

// ── funnel + quotes (Summary card) ─────────────────────────────────────────

/** The reference's `salesFunnelH` — stage counts back-derived from the closed
 *  order count via fixed conversion ratios. `Leads` is the top of the funnel. */
export function salesFunnelH(records: RevRecord[]): { label: string; count: number }[] {
  const orders = records.length
  const stages: { label: string; ratio: number }[] = [
    { label: 'Leads', ratio: 0.16 },
    { label: 'Qualified', ratio: 0.34 },
    { label: 'Deals', ratio: 0.55 },
    { label: 'Quotes', ratio: 0.78 },
    { label: 'Orders', ratio: 1 },
  ]
  return stages.map((st) => ({ label: st.label, count: Math.round(orders / st.ratio) }))
}

export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected'

export interface QuoteRow {
  id: string
  owner: string
  account: string
  value: number
  status: QuoteStatus
  /** Converted into a sales order. */
  converted: boolean
}

/** Quotes behind the closed records, seeded per record.
 *
 *  The reference sources these from a separate mock array (`data/quotes.ts`)
 *  scoped by role, which this project does not have — and which, in the
 *  reference, does NOT respond to the filter bar even though the Summary card
 *  shows a "Filtered view" badge. Deriving them from the (already filtered)
 *  records keeps the whole card honest about the slice it claims to describe. */
export function quoteRows(records: RevRecord[]): QuoteRow[] {
  // Quotes outnumber closed orders — the funnel's Quotes:Orders ratio is 1/0.78.
  const perRecord = (r: RevRecord): QuoteRow[] => {
    const extra = seed(`q-${r.id}-n`) < 0.28 ? 1 : 0
    return Array.from({ length: 1 + extra }, (_, i) => {
      const k = (d: string) => seed(`q-${r.id}-${i}-${d}`)
      // The first quote per record is the one that won; extras did not.
      const won = i === 0
      const roll = k('s')
      const status: QuoteStatus = won
        ? 'Accepted'
        : roll < 0.45
          ? 'Sent'
          : roll < 0.8
            ? 'Rejected'
            : 'Draft'
      return {
        id: `${r.id}-q${i}`,
        owner: r.owner,
        account: r.account,
        value: Math.round(r.value * (0.9 + k('v') * 0.35)),
        status,
        converted: won,
      }
    })
  }
  return records.flatMap(perRecord)
}

