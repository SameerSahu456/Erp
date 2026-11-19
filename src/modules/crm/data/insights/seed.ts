// Deterministic seeding for the CRM insight widgets' demo data.
//
// TEMPORARY — Phase 1 of comprint-erp-docs/modules/crm/dashboard/CRM_INSIGHTS_WIDGETS_PLAN.md. The whole
// `data/insights/` folder is deleted in Phase 2, when the widgets move onto the
// live endpoints (`/crm/dashboard/hierarchy_wise_report`, `/crm/dashboard/revenue`).
// Nothing outside `components/dashboard/insights/` and
// `pages/dashboard/CrmInsightDetailPage.tsx` may import from here.
//
// Values are DERIVED from a string key rather than random: the same key always
// yields the same number, so the UI is stable across re-renders and a manager's
// roll-up is exactly the union of their team's records. `Math.random()` would
// reshuffle every number on every keystroke.

/** Deterministic 0..1 from a string key (FNV-1a + xorshift finish). */
export function seed(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 15
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  return ((h >>> 0) % 100000) / 100000
}

/** Deterministic integer in [min, max]. */
export function seedInt(key: string, min: number, max: number): number {
  return Math.round(min + seed(key) * (max - min))
}

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

// The window's clock is TODAY, never a pinned demo date. Read once at module
// load: a board open across midnight on 31 Dec is a non-case, and re-reading
// per call would make the seeded records reshuffle mid-session.
const TODAY = new Date()

/** Jan of the CURRENT year through the CURRENT month, inclusive. `getMonth()`
 *  is 0-based, so `+ 1` makes the slice include this month — August (index 7)
 *  yields Jan…Aug. Derived, never a literal count: a hardcoded `slice(0, 7)`
 *  is exactly why the newest month went missing from the Month filter. */
export const MONTH_WINDOW: string[] = MONTHS.slice(0, TODAY.getMonth() + 1)

/** The year every bucket rolls up to — the current calendar year. */
export const DEMO_YEAR = String(TODAY.getFullYear())

export const PRODUCT_CATEGORIES = [
  'Servers',
  'Storage',
  'Networking',
  'Laptops',
  'Desktops',
  'Security',
  'Cloud',
  'Peripherals',
] as const

/** OEM / brand list (mirrors the brands carried on real sales-order lines). */
export const OEMS = [
  'Dell',
  'HP',
  'Cisco',
  'Samsung',
  'Lenovo',
  'APC',
  'Palo Alto',
  'Intel',
  'Synology',
  'Logitech',
] as const

/** Channel-vertical account pool. */
export const PARTNER_NAMES = [
  'Zenith Infotech',
  'Apex Systems',
  'Orbit Networks',
  'NexGen Solutions',
  'Sunrise Technologies',
  'Vertex Computing',
  'BlueChip Traders',
] as const

/** End-customer-vertical account pool. */
export const KEY_ACCOUNT_NAMES = [
  'Reliance Digital',
  'HDFC Bank',
  'Tata Consultancy',
  'Mahindra Group',
  'Apollo Hospitals',
] as const
