import type { DateRange } from "@/components/common/pickers/DateRangePicker";
import {
  dateRangeToParams,
  orderDateRange,
  parseDateParam,
  toDateParam,
} from "@/shared/lib/date";

/** Bridge between a `DateRangePicker` (`Date`) and the persisted / API
 *  `YYYY-MM-DD` strings — a `Date` does not survive `useMemoryState`. */
export function toRange(v: { from?: string; to?: string }): DateRange | undefined {
  if (!v.from && !v.to) return undefined;
  // A remembered / URL range may be inverted — the API 422s that.
  return orderDateRange({ from: parseDateParam(v.from), to: parseDateParam(v.to) });
}

export function fromRange(r: DateRange | undefined): { from?: string; to?: string } {
  if (!r) return {};
  const { date_from, date_to } = dateRangeToParams(r);
  return { from: date_from, to: date_to };
}

/** `value` when it is a real calendar day (`2026-13-45` is not), else
 *  undefined — `parseDateParam` alone rolls an overflowing day over. */
function realYmd(value: string | undefined): string | undefined {
  const date = parseDateParam(value);
  return date && toDateParam(date) === value ? value : undefined;
}

/** The persisted `{ from, to }` strings, validated and ordered — for code that
 *  sends them to the API straight from memory (§11.1: drop a bad end, never 422). */
export function orderedYmd(v: { from?: string; to?: string }): { from?: string; to?: string } {
  const from = realYmd(v.from);
  const to = realYmd(v.to);
  return from && to && from > to ? { from: to, to: from } : { from, to };
}

/** `YYYY-MM-DD` shifted by whole days in local calendar time (DST-safe). */
export function shiftDay(day: string, days: number): string {
  const date = parseDateParam(day);
  if (!date) return day;
  date.setDate(date.getDate() + days);
  return toDateParam(date);
}

/** Inclusive day count of `from..to`; 1 for a single day. */
export function daysInclusive(from: string, to: string): number {
  const start = parseDateParam(from) ?? new Date(Number.NaN);
  const end = parseDateParam(to) ?? new Date(Number.NaN);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
