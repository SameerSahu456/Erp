import { shiftDay } from "./dateRange";

/** What an Activity entry covered: a span of days (`to` inclusive, null while
 *  still running) or the single day it took effect. */
export type ActivityPeriod =
  | { kind: "span"; from: string; to: string | null }
  | { kind: "on"; day: string };

/** One span of the unit's `hold_history`: `to` is EXCLUSIVE (the day billing
 *  resumed) and null while the hold is open. */
interface HoldSpan {
  from: string;
  to: string | null;
}

const day = (value: unknown): string | null =>
  typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;

/** The unit's hold spans, read defensively from its untyped history JSON. */
export function readHoldSpans(history: readonly Record<string, unknown>[] | undefined): HoldSpan[] {
  const out: HoldSpan[] = [];
  for (const entry of history ?? []) {
    const from = day(entry.from);
    if (from) out.push({ from, to: day(entry.to) });
  }
  return out;
}

type After = Record<string, unknown>;
type PeriodReader = (after: After, spans: HoldSpan[]) => ActivityPeriod | null;

/** A hold: its start to its last held day — the recorded resume wins over the
 *  planned `until`, since a hold can be lifted early. */
function holdPeriod(a: After, spans: HoldSpan[]): ActivityPeriod | null {
  const from = day(a.hold_from);
  if (!from) return null;
  const resumed = spans.find((s) => s.from === from)?.to;
  const to = resumed ? shiftDay(resumed, -1) : day(a.hold_until);
  // Lifted on the day it began: nothing was held.
  if (to && to < from) return { kind: "on", day: from };
  return { kind: "span", from, to };
}

/** An un-hold: the span it closed (start to the day before resuming). */
function unholdPeriod(a: After, spans: HoldSpan[]): ActivityPeriod | null {
  const resumed = day(a.unhold_day);
  if (!resumed) return null;
  const from = day(a.hold_from) ?? spans.find((s) => s.to === resumed)?.from ?? null;
  // No start known, or lifted on the day it began (nothing was held).
  if (!from || resumed <= from) return { kind: "on", day: resumed };
  return { kind: "span", from, to: shiftDay(resumed, -1) };
}

/** A single-day action: the day it took effect, read from `key`. */
const onDay =
  (key: string): PeriodReader =>
  (a) => {
    const on = day(a[key]);
    return on ? { kind: "on", day: on } : null;
  };

const PERIOD_BY_ACTION: Record<string, PeriodReader> = {
  hold: holdPeriod,
  unhold: unholdPeriod,
  dispatch: onDay("dispatched_on"),
  delivered: onDay("delivered_date"),
};

/** The period an Activity entry covered. The unit's hold history is the
 *  authority, so entries written before the audit carried every date still
 *  resolve. Null when the entry names no date of its own. */
export function getActivityPeriod(
  action: string,
  after: After | null | undefined,
  spans: HoldSpan[],
): ActivityPeriod | null {
  return PERIOD_BY_ACTION[action]?.(after ?? {}, spans) ?? null;
}
