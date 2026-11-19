import { LINE_ITEMS_STRINGS } from "./line-items.strings"
import type { RentalPeriod } from "./types"

/** Rentals bill MONTHLY: a device carries a `monthly_rate` and the
 *  billing engine's cycles are monthly. `rental_period` is still written
 *  onto every rental line because the `rental_consistency` CHECK wants
 *  it alongside `is_rental` and both dates — but it is NOT an operator
 *  choice. The real cadence (monthly / quarterly / custom, cycle day,
 *  arrears vs advance) is set per ORDER on the rentals module's
 *  Configure SO page and lives on `so_configure`.
 *
 *  This used to be a local `"day"` inside SOLineCard, which disagreed
 *  with how the rentals module actually prices a unit. */
export const RENTAL_PERIOD_DEFAULT: RentalPeriod = "month"

/** The rate column's label on a rental line. The header is the only
 *  place the per-month nature is visible while typing. */
export const RENTAL_RATE_LABEL = LINE_ITEMS_STRINGS.billingPeriod.rateMonthly

/** The line grid's rate column label: "Monthly Rate" on a rental document,
 *  else the default "Price". */
export function lineRateColumnLabel(isRental: boolean): string | undefined {
  return isRental ? LINE_ITEMS_STRINGS.grid.columns.monthlyRate : undefined
}
