import { addDays, addMonths, differenceInCalendarDays } from "date-fns";

import { parseDateParam } from "@/shared/lib/date";

import { FORMAT_STRINGS as S } from "./format.strings";

export interface MonthlyRateInputs {
  /** The agreement's live rate — the sum of the units still out. */
  live: string | number | null | undefined;
  /** Σ qty × rate over the sales order's rental lines. */
  expected: string | number | null | undefined;
  /** Units provisioned on the order. */
  deviceCount: number;
}

/** Before any unit ships the live rate is 0 — the units' sum of nothing —
 *  so the sales order's figure is the only meaningful one to show. */
export function isPreDispatchRate({
  live,
  deviceCount,
}: MonthlyRateInputs): boolean {
  return deviceCount === 0 || Number(live ?? 0) === 0;
}

/** The label to pair with `MonthlyRateValue` — one name before and after
 *  dispatch, so the figure never reads as provisional. */
export function monthlyRateLabel(): string {
  return S.monthlyRate;
}

/** The monthly rent shown: the sales order's before any unit ships, the
 *  live units' sum after. */
export function shownMonthlyRent(inputs: MonthlyRateInputs): number {
  return Number((isPreDispatchRate(inputs) ? inputs.expected : inputs.live) ?? 0);
}

/** Rent for the whole tenure `start..end` (both included) at a monthly rent:
 *  whole calendar months from the start, plus the leftover days pro-rated on
 *  that month's real length — the way the engine pro-rates. 0 without dates. */
export function tenureTotal(
  monthlyRent: number,
  start: string | null | undefined,
  end: string | null | undefined,
): number {
  const from = parseDateParam(start ?? undefined);
  const to = parseDateParam(end ?? undefined);
  if (!from || !to || to < from) return 0;
  const lastDay = addDays(to, 1);
  let months = 0;
  while (addMonths(from, months + 1) <= lastDay) months += 1;
  const periodStart = addMonths(from, months);
  const leftover = differenceInCalendarDays(lastDay, periodStart);
  const monthLength = differenceInCalendarDays(addMonths(periodStart, 1), periodStart);
  return monthlyRent * (months + leftover / monthLength);
}
