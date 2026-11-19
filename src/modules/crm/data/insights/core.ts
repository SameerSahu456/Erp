// Core insight record shape + deterministic generation.
//
// TEMPORARY — see the note in `seed.ts`. Phase 2 replaces this layer with
// `/crm/dashboard/revenue` (bucketed series) and
// `/crm/dashboard/hierarchy_wise_report` (per-user rows).
//
// Dependency root: filters / periods / aggregations all import from here, so
// this file must not import them back.

import {
  KEY_ACCOUNT_NAMES,
  MONTH_WINDOW,
  OEMS,
  PARTNER_NAMES,
  PRODUCT_CATEGORIES,
  seed,
} from './seed'
import { USERS } from './hierarchy'

export type Vertical = 'Channel Partner' | 'End Customer'
export type Condition = 'New' | 'Refurbished' | 'New Pull'

export const CONDITIONS: Condition[] = ['New', 'Refurbished', 'New Pull']
export const VERTICALS: Vertical[] = ['Channel Partner', 'End Customer']

export interface RevRecord {
  id: string
  monthIdx: number
  /** Week within the record's month (0…WEEKS_PER_MONTH-1), for the Weekly period. */
  weekIdx: number
  month: string
  vertical: Vertical
  condition: Condition
  category: string
  oem: string
  account: string
  owner: string
  value: number
}

/** Weeks each month is split into for the Weekly period. The demo data is
 *  month-granular, so the week is synthesized deterministically per record. */
export const WEEKS_PER_MONTH = 4

const PER_USER = 16

/** One user's closed-revenue records — seeded by name, so a manager's roll-up
 *  is exactly the union of their team's records. */
function userRecords(name: string): RevRecord[] {
  const u = USERS[name]
  if (!u) return []
  const vertical: Vertical = u.vertical === 'channel' ? 'Channel Partner' : 'End Customer'
  const pool: readonly string[] = u.vertical === 'channel' ? PARTNER_NAMES : KEY_ACCOUNT_NAMES
  const recs: RevRecord[] = []
  for (let i = 0; i < PER_USER; i++) {
    const k = (d: string) => seed(`rev-${name}-${i}-${d}`)
    const monthIdx = Math.min(Math.floor(k('m') * MONTH_WINDOW.length), MONTH_WINDOW.length - 1)
    const cRoll = k('c')
    const condition: Condition = cRoll < 0.62 ? 'New' : cRoll < 0.86 ? 'Refurbished' : 'New Pull'
    recs.push({
      id: `${name}-${i}`,
      monthIdx,
      weekIdx: Math.min(Math.floor(k('w') * WEEKS_PER_MONTH), WEEKS_PER_MONTH - 1),
      month: MONTH_WINDOW[monthIdx] ?? '',
      vertical,
      condition,
      category: PRODUCT_CATEGORIES[Math.floor(k('cat') * PRODUCT_CATEGORIES.length)] ?? '',
      oem: OEMS[Math.floor(k('o') * OEMS.length)] ?? '',
      account: pool[Math.floor(k('a') * pool.length)] ?? 'Unassigned',
      owner: name,
      value: Math.round(80_000 + k('val') * 1_150_000),
    })
  }
  return recs
}

export function revRecords(users: string[]): RevRecord[] {
  return users.flatMap(userRecords)
}
