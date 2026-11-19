// Indian financial year (1 Apr → 31 Mar) helpers for the period toolbar.
//
// Mirrors the backend's `app/shared/utils/fiscal_year.py`: a date in Jan–Mar
// belongs to the FY that STARTED the previous calendar year. Kept pure so the
// option list and the selected-FY derivation are unit-testable without React.

const pad2 = (n: number) => String(n).padStart(2, '0')
const ISO_DATE_RE = /^(\d{4})-(\d{2})-\d{2}$/

/** FY start year of a calendar date — `2027-02-10` → 2026 (FY 2026-27). */
export function fyStartYearOf(d: Date): number {
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
}

/** FY start year of an ISO `yyyy-MM-dd` string; `undefined` if not ISO. */
export function fyStartYearOfIso(iso: string): number | undefined {
  const m = ISO_DATE_RE.exec(iso)
  if (!m) return undefined
  return Number(m[2]) >= 4 ? Number(m[1]) : Number(m[1]) - 1
}

/** `2026` → `"FY 2026-27"` — same shape the backend prints on window labels. */
export function fyLabel(fyStartYear: number): string {
  return `FY ${fyStartYear}-${pad2((fyStartYear + 1) % 100)}`
}

/** Inclusive ISO bounds of an FY, with the end CLAMPED to `now` for the
 *  running FY: the board reports what has happened, and the picker refuses
 *  future days (`disableFuture`), so a window ending 31 Mar next year would be
 *  a range the control cannot re-enter and the URL parser would clamp anyway. */
export function fyBounds(fyStartYear: number, now: Date = new Date()): { from: string; to: string } {
  const from = `${fyStartYear}-04-01`
  const fyEnd = `${fyStartYear + 1}-03-31`
  const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  return { from, to: fyEnd < today ? fyEnd : today }
}

/** The FYs the toolbar offers: the current one first, then the previous
 *  `count - 1` — `[2026, 2025, 2024, 2023, 2022]` on any day of FY 2026-27. */
export function recentFinancialYears(count: number, now: Date = new Date()): number[] {
  const current = fyStartYearOf(now)
  return Array.from({ length: count }, (_, i) => current - i)
}
