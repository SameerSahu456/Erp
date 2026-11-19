import { subDays } from "date-fns";

import { parseDateParam, toDateParam } from "@/shared/lib/date";

import type { LineRateTarget, RentalSalesOrderExtendPayload } from "../../api/sales-orders";

/** The latest day new rates may start: the day BEFORE the new end date —
 *  rates starting on the last day would price only that day. The server
 *  refuses a rate date on or after the end date. */
export function lastRateFromDay(newEndDate: string): string | undefined {
  const end = parseDateParam(newEndDate);
  return end ? toDateParam(subDays(end, 1)) : undefined;
}

/** A rate date the new end date has since moved onto or before. */
export function isRateFromTooLate(rateFrom: string, newEndDate: string): boolean {
  return !!rateFrom && !!newEndDate && rateFrom >= newEndDate;
}

/** One line's unit selection, derived once per render (not per keystroke per row). */
export interface LineSelection {
  target: LineRateTarget;
  allIds: string[];
  /** The explicit tick list, else every unit (absent means a whole-line reprice). */
  chosen: string[];
  chosenSet: ReadonlySet<string>;
  /** Distinct rates the SELECTED units sit at today — >1 means a flatten. */
  rates: string[];
}

export function deriveLineSelections(
  targets: readonly LineRateTarget[],
  picked: Readonly<Record<string, string[]>>,
): Map<string, LineSelection> {
  const out = new Map<string, LineSelection>();
  for (const target of targets) {
    const allIds = target.units.map((unit) => unit.id);
    const chosen = picked[target.sales_order_item_id] ?? allIds;
    const chosenSet = new Set(chosen);
    const rates = [
      ...new Set(target.units.filter((unit) => chosenSet.has(unit.id)).map((unit) => unit.monthly_rate)),
    ];
    out.set(target.sales_order_item_id, { target, allIds, chosen, chosenSet, rates });
  }
  return out;
}

export interface ExtendGuardInput {
  priced: ReadonlyArray<[string, string]>;
  lines: ReadonlyMap<string, LineSelection>;
  flattenOk: Readonly<Record<string, boolean>>;
  rateFrom: string;
  newEndDate: string;
  /** Targets still loading or failed: an empty map must not wave rates through. */
  targetsUnavailable: boolean;
}

/** What still blocks the submit, one flag per inline message. */
export function extendGuards(input: ExtendGuardInput) {
  const { priced, lines, flattenOk, rateFrom, newEndDate, targetsUnavailable } = input;
  const anyPriced = priced.length > 0;
  const guards = {
    ratesIncomplete: anyPriced && !rateFrom,
    rateFromTooLate: anyPriced && isRateFromTooLate(rateFrom, newEndDate),
    targetsUnknown: anyPriced && targetsUnavailable,
    emptySelection: priced.some(([lineId]) => lines.get(lineId)?.chosen.length === 0),
    unacknowledged: priced.some(([lineId]) => (lines.get(lineId)?.rates.length ?? 0) > 1 && !flattenOk[lineId]),
  };
  return { ...guards, blocked: Object.values(guards).some(Boolean) };
}

/** Where the line-rate targets stand, for each line's help text. */
export function targetsStateOf(query: { isPending: boolean; isError: boolean }): "loading" | "error" | "ready" {
  if (query.isPending) return "loading";
  return query.isError ? "error" : "ready";
}

export interface ExtendPayloadInput {
  newEndDate: string;
  reason: string;
  rateFrom: string;
  priced: ReadonlyArray<[string, string]>;
  lines: ReadonlyMap<string, LineSelection>;
}

export function buildExtendPayload(input: ExtendPayloadInput): RentalSalesOrderExtendPayload {
  const { newEndDate, reason, rateFrom, priced, lines } = input;
  return {
    new_end_date: newEndDate,
    reason: reason.trim() || null,
    rate_effective_date: priced.length > 0 ? rateFrom : null,
    line_rates: priced.map(([sales_order_item_id, monthly_rate]) => {
      const line = lines.get(sales_order_item_id);
      const total = line?.allIds.length ?? 0;
      const chosen = line?.chosen ?? [];
      // Ids omitted when every unit is ticked: a WHOLE-LINE reprice also moves
      // the line's contracted rate, which a full id list would not.
      return {
        sales_order_item_id,
        monthly_rate: monthly_rate.trim(),
        device_ids: total > 0 && chosen.length < total ? chosen : undefined,
      };
    }),
  };
}
