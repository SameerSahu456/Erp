import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
} from "date-fns";

/** Shared date-range presets + helpers, reusable across modules (CRM, WMS, …).
 *  Pair with the shared `<DateRangeFilter>` (components/common/forms). */
export type DateFilterPreset = "today" | "monthly" | "quarterly" | "yearly" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

export function getDateRange(preset: DateFilterPreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "monthly":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "quarterly":
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "yearly":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "custom":
      // Default to the current month; the caller overrides with explicit from/to.
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  try {
    return isWithinInterval(parseISO(dateStr), { start: range.from, end: range.to });
  } catch {
    return false;
  }
}

// ── Filter value + resolution (used by the shared <DateRangeFilter>) ──────────

/** `all` means "no date filtering". */
export type DateRangePreset = "all" | DateFilterPreset;

export interface DateRangeValue {
  preset: DateRangePreset;
  /** ISO yyyy-mm-dd, only meaningful when preset === "custom". */
  from?: string;
  to?: string;
}

export const DEFAULT_DATE_RANGE: DateRangeValue = { preset: "all" };

/** Resolve a DateRangeValue to a concrete {from,to}, or `null` for no filtering. */
export function resolveDateRange(
  value: DateRangeValue,
  now: Date = new Date(),
): DateRange | null {
  if (!value || value.preset === "all") return null;
  if (value.preset === "custom") {
    if (!value.from && !value.to) return null;
    const from = value.from ? new Date(`${value.from}T00:00:00`) : new Date(-8640000000000000);
    const to = value.to ? new Date(`${value.to}T23:59:59.999`) : new Date(8640000000000000);
    return { from, to };
  }
  return getDateRange(value.preset, now);
}

/** Is `dateStr` inside the resolved range? A `null` range matches everything. */
export function matchesDateRange(
  dateStr: string | undefined | null,
  range: DateRange | null,
): boolean {
  if (!range) return true;
  if (!dateStr) return false;
  return isDateInRange(dateStr, range);
}
