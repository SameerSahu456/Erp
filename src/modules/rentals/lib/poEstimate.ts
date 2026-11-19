import { daysInclusive, shiftDay } from "./dateRange";

/** Days per month for ESTIMATES only — mirrors the backend's
 *  `ESTIMATE_DAYS_PER_MONTH`. The engine pro-rates on each month's real
 *  length, so every figure built from this is shown as approximate. */
export const ESTIMATE_DAYS_PER_MONTH = 30;

/** Rent for `from..to` (both included) at a monthly run rate. */
export function estimateRent(
  monthlyRunRate: number,
  from: string,
  to: string,
): number {
  if (to < from) return 0;
  return (monthlyRunRate * daysInclusive(from, to)) / ESTIMATE_DAYS_PER_MONTH;
}

/** The first day nobody has invoiced: the day after billed-through, or the
 *  agreement start when nothing has been billed. */
export function unbilledFrom(
  lastBilledDate: string | null,
  fallback: string,
): string {
  return lastBilledDate ? shiftDay(lastBilledDate, 1) : fallback;
}
