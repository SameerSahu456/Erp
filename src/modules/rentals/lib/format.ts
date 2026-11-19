import { EMPTY_VALUE } from "@/shared/constants"

import type { BillingMode, BillingType } from "../api/agreements"
import { BILLING_MODE_PHRASES, BILLING_TYPE_LABELS } from "../constants/billing"
import { isCustomCadence } from "./cadence"
import { FORMAT_STRINGS as S } from "./format.strings"

// Built once: `toLocaleDateString` constructs a formatter per call.
const DAY_SHORT = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "2-digit" })
const DAY_LONG = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" })

/** A bare `YYYY-MM-DD` as a LOCAL date — it has no timezone, so the IST
 *  instant formatters would shift it by a day near midnight. */
function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Render a `YYYY-MM-DD` calendar date for a table cell ("31 Dec 30"). */
export function formatRentalDay(value: string | null | undefined): string {
  const day = parseDay(value)
  return day ? DAY_SHORT.format(day) : EMPTY_VALUE
}

/** The same date with a FOUR-digit year, for prose — "31 Dec 30" mid-sentence
 *  reads as a second day number. */
export function formatRentalDayLong(value: string | null | undefined): string {
  const day = parseDay(value)
  return day ? DAY_LONG.format(day) : EMPTY_VALUE
}

/** Longest account name shown in a list cell before it is cut. */
export const ACCOUNT_NAME_MAX = 25

/** Cap a name at `ACCOUNT_NAME_MAX` characters, appending an ellipsis.
 *
 *  Done on the STRING rather than with CSS `text-overflow` so the cut is
 *  the same width on every row and at every zoom level — a CSS ellipsis
 *  lands wherever the pixel width happens to fall, which makes a column
 *  of names ragged. Callers pass the full value as a `title` so the whole
 *  name is still one hover away.
 */
export function truncateName(value: string | null | undefined, max = ACCOUNT_NAME_MAX): string {
  if (!value) return ""
  return value.length > max ? `${value.slice(0, max)}…` : value
}

/** How long a rental line runs, as a human phrase.
 *
 *  Both bounds are INCLUSIVE calendar dates — a 1 Apr → 30 Apr line is one
 *  month, not 29 days — which is why the month test looks at `end + 1 day`
 *  rather than at `end` itself. Expressed in months only when it lands on a
 *  whole number of them; anything else reads in days, because "1.4 months"
 *  is not a duration anybody signed.
 *
 *  Returns null when either bound is missing. A line with no dates is never
 *  billed, and the caller says so explicitly rather than printing a dash.
 */
export function rentalDuration(
  start: string | null | undefined,
  end: string | null | undefined,
): { months: number } | { days: number } | null {
  if (!start || !end) return null
  const [sy, sm, sd] = start.split("-").map(Number)
  const [ey, em, ed] = end.split("-").map(Number)
  if (!sy || !sm || !sd || !ey || !em || !ed) return null

  const from = new Date(sy, sm - 1, sd)
  const to = new Date(ey, em - 1, ed)
  if (to < from) return null

  // `+1` because both ends are inclusive.
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1

  // The exclusive end — the first day NOT covered. A whole-month line has
  // this landing on the same day-of-month it started on.
  const exclusive = new Date(ey, em - 1, ed + 1)
  if (exclusive.getDate() === from.getDate()) {
    const months =
      (exclusive.getFullYear() - from.getFullYear()) * 12 +
      (exclusive.getMonth() - from.getMonth())
    if (months >= 1) return { months }
  }
  return { days }
}

/** "Monthly, billed in arrears" — the one-line reading of a cadence.
 *
 *  Shared by the line-items card and the cycle dialog's "follow the
 *  order" help text, because the two must phrase the same cycle
 *  identically; two spellings of one cycle on one screen is the confusion
 *  the per-line override was added to remove.
 */
export function describeCadence(
  billingType: BillingType,
  billingMode: BillingMode,
  customDays?: number | null,
): string {
  const cycle = isCustomCadence(billingType)
    ? S.everyNDays(customDays ?? 0)
    : BILLING_TYPE_LABELS[billingType]
  return `${cycle}, ${BILLING_MODE_PHRASES[billingMode]}`
}
