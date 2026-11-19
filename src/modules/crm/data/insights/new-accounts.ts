// New-account cohort aggregations over the seeded records.
//
// TEMPORARY — see the note in `seed.ts`. These back the four New Accounts
// insight cells that have no endpoint yet (by period, by vertical, new vs
// repeat, what-they-buy). The swap plan, cell by cell, is
// `comprint-erp-docs/modules/crm/dashboard/new-accounts-insight-plan.md`.
//
// RULE A, the same one the live `/crm/dashboard/new-accounts` endpoint uses:
// an account is "new" in a bucket when its FIRST order (earliest record in the
// scoped set) falls in that bucket. "Current window" for the seeded layer is
// the LAST bucket of the selected period — the seeded analogue of the live
// endpoint's period-to-date window.

import type { CategoryOemPivot, CategoryOemCell } from '../../api/dashboard'
import { type RevRecord, type Vertical, VERTICALS } from './core'
import { type Period, periodLabelsFor, recordBucket } from './periods'

/** Each account's earliest record in the scoped set. Ties on month break on
 *  week, so the Weekly period picks the same opener as the others. */
export function firstOrderByAccount(records: RevRecord[]): Map<string, RevRecord> {
  const first = new Map<string, RevRecord>()
  for (const r of records) {
    const f = first.get(r.account)
    if (!f || r.monthIdx < f.monthIdx || (r.monthIdx === f.monthIdx && r.weekIdx < f.weekIdx)) {
      first.set(r.account, r)
    }
  }
  return first
}

/** The seeded "current window": the last bucket label of the period, or
 *  `undefined` when the scoped set is empty. */
export function currentBucket(records: RevRecord[], period: Period): string | undefined {
  const labels = periodLabelsFor(records, period)
  return labels[labels.length - 1]
}

/** Accounts whose first order falls in the current (last) bucket. */
export function newAccountsInCurrentBucket(records: RevRecord[], period: Period): Set<string> {
  const cur = currentBucket(records, period)
  const out = new Set<string>()
  if (!cur) return out
  for (const [account, opener] of firstOrderByAccount(records)) {
    if (recordBucket(opener, period) === cur) out.add(account)
  }
  return out
}

export interface NewAccountsPeriodPoint {
  label: string
  accounts: number
}

/** Count of accounts whose first order falls in each bucket of the period. */
export function newAccountsByPeriod(records: RevRecord[], period: Period): NewAccountsPeriodPoint[] {
  const openers = [...firstOrderByAccount(records).values()]
  return periodLabelsFor(records, period).map((label) => ({
    label,
    accounts: openers.filter((f) => recordBucket(f, period) === label).length,
  }))
}

export interface NewAccountsVerticalSlice {
  vertical: Vertical
  accounts: number
}

/** New accounts in the current bucket, split by vertical. Verticals with no
 *  new logo are omitted, as the reference board does. */
export function newAccountsByVertical(records: RevRecord[], period: Period): NewAccountsVerticalSlice[] {
  const cohort = newAccountsInCurrentBucket(records, period)
  const openers = firstOrderByAccount(records)
  return VERTICALS.map((vertical) => ({
    vertical,
    accounts: [...cohort].filter((a) => openers.get(a)?.vertical === vertical).length,
  })).filter((s) => s.accounts > 0)
}

export interface NewVsRepeatRow {
  label: string
  newValue: number
  repeatValue: number
}

/** Revenue per bucket split into first-period (new) vs later (repeat) orders.
 *  A record is "new" revenue when it lands in the account's first MONTH — every
 *  order of that opening month counts, matching the reference's reading. */
export function newVsRepeatByPeriod(records: RevRecord[], period: Period): NewVsRepeatRow[] {
  const openers = firstOrderByAccount(records)
  return periodLabelsFor(records, period).map((label) => {
    let newValue = 0
    let repeatValue = 0
    for (const r of records) {
      if (recordBucket(r, period) !== label) continue
      if (r.monthIdx === openers.get(r.account)?.monthIdx) newValue += r.value
      else repeatValue += r.value
    }
    return { label, newValue, repeatValue }
  })
}

/** Category × OEM pivot over the orders of the current bucket's new accounts,
 *  in the SAME shape `/crm/revenue/by-category-oem` returns, so the live
 *  `CategoryOemPivotTable` renders it unchanged. Seeded records carry names,
 *  not ids, so the name doubles as the id. */
export function newAccountsCategoryOemPivot(records: RevRecord[], period: Period): CategoryOemPivot {
  const cohort = newAccountsInCurrentBucket(records, period)
  const rows = records.filter((r) => cohort.has(r.account))

  const grand = rows.reduce((a, r) => a + r.value, 0)
  const cell = (rs: RevRecord[]): CategoryOemCell => {
    const value = rs.reduce((a, r) => a + r.value, 0)
    return { value_closed: value, order_count: rs.length, share: grand > 0 ? (value / grand) * 100 : 0 }
  }
  const byKey = (key: (r: RevRecord) => string) => {
    const m = new Map<string, RevRecord[]>()
    for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r])
    return [...m.entries()].sort((a, b) => cell(b[1]).value_closed - cell(a[1]).value_closed)
  }
  const categories = byKey((r) => r.category)
  const oems = byKey((r) => r.oem)

  return {
    rows: categories.map(([name, rs]) => ({
      category_id: name,
      category_name: name,
      parent_category_id: null,
      total: cell(rs),
    })),
    columns: oems.map(([name, rs]) => ({ oem_id: name, oem_name: name, total: cell(rs) })),
    cells: categories.map(([category]) =>
      oems.map(([oem]) => cell(rows.filter((r) => r.category === category && r.oem === oem))),
    ),
    grand_total: cell(rows),
  }
}
