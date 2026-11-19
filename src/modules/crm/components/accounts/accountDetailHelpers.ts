import { format, isSameDay, isSameMonth, isSameYear, isValid, parseISO } from "date-fns"

import type { AccountTagWire } from "../../api"

// Single source for the account status → badge tone mapping (Coding-guideline
// §16.12). Re-exported under the original name so existing consumers
// (AccountDetailPage, AccountHierarchyCards) keep working.
export { ACCOUNT_STATUS_VARIANT as STATUS_VARIANT_BY_AC } from "../../constants/account-status"

export const TAG_TONE_BY_TAG: Record<AccountTagWire, string> = {
  Hunting:
    "border-violet-300/70 bg-violet-50 text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200",
  Farming:
    "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
  Cold:
    "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200",
}

// Compact label for the window the 360° KPI strip is reporting on — the text
// that leads each tile's sub-line ("Jul 2026", "Q3 2026", "2026", …).
//
// Built from the `start` / `end` the KPI endpoint ECHOES BACK rather than
// re-derived from the picker: the server owns the IST calendar boundaries, so
// re-computing them here is how a tile and its own figures drift apart.
//
// `parseISO` rather than `new Date(...)`: on a date-only string the latter
// parses as UTC midnight, which in a behind-UTC timezone renders the PREVIOUS
// day and would label a July window "Jun 2026". `parseISO` reads it as LOCAL
// midnight, so the label always matches the day the server sent.
//
// Not `formatIST` / `formatIST_date` (shared/lib/date): those exist to project
// a UTC *instant* onto the IST calendar. These bounds are already bare calendar
// dates with no time and no zone, so converting them would be a second,
// unwanted shift.
// Financial year runs Apr → Mar (matches the backend's `fiscal_year.py`):
// Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar. date-fns' `Q` token is the
// CALENDAR quarter, which labelled October as Q4.
const FY_START_MONTH = 3 // April, 0-based

function fyStartYear(d: Date): number {
  return d.getMonth() >= FY_START_MONTH ? d.getFullYear() : d.getFullYear() - 1
}

function fyLabel(d: Date): string {
  const y = fyStartYear(d)
  return `FY ${y}-${String((y + 1) % 100).padStart(2, "0")}`
}

function fyQuarter(d: Date): number {
  return Math.floor(((d.getMonth() - FY_START_MONTH + 12) % 12) / 3) + 1
}

// Label for a `months` chip array (`YYYY-MM` tokens) when the toolbar
// Month filter is active. Returns `null` for an unset / empty array so
// callers fall through to the Period picker label.
//
// A single chip reads as the month ("Jun 2026") — the same shape the
// Period picker uses for Monthly, so the sub-line reads consistently
// whether the window came from the picker or the chip. Multiple chips
// collapse to "N months" because a two-month label ("Jun, Jul 2026")
// drifts into the next tile at the strip's narrowest breakpoint.
export function monthsFilterLabel(months: string[] | undefined): string | null {
  if (!months || months.length === 0) return null
  if (months.length === 1) {
    const [y, m] = months[0].split("-").map(Number)
    const d = new Date(y, m - 1, 1)
    return isValid(d) ? format(d, "MMM yyyy") : null
  }
  return `${months.length} months`
}

export function kpiWindowLabel(
  period: "weekly" | "monthly" | "quarterly" | "yearly" | "custom",
  start: string | undefined,
  end: string | undefined,
): string {
  if (!start || !end) return ""

  const from = parseISO(start)
  const to = parseISO(end)
  if (!isValid(from) || !isValid(to)) return ""

  switch (period) {
    case "yearly":
      return fyLabel(from)
    case "quarterly":
      return `Q${fyQuarter(from)} ${fyLabel(from)}`
    case "monthly":
      return format(from, "MMM yyyy")
    default:
      // Weekly + custom both render a range. Drop the repeated half when the
      // two ends share it, so a same-month range reads "12 – 18 Jul 2026"
      // rather than "12 Jul 2026 – 18 Jul 2026". A single day collapses to
      // one date ("3 Nov 2026"), never "3 – 3 Nov 2026".
      if (isSameDay(from, to)) return format(from, "d MMM yyyy")
      if (isSameMonth(from, to)) return `${format(from, "d")} – ${format(to, "d MMM yyyy")}`
      if (isSameYear(from, to)) return `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`
      return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`
  }
}
