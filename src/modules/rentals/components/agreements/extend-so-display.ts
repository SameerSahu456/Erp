import { formatINR } from "@/lib/currency";

import type { LineRateTarget } from "../../api/sales-orders";
import type { TargetsState } from "../../hooks/agreements/useExtendSoForm";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const E = S.actions.extend;

/** The rates a line's units sit at today, dearest first — "₹80,000, ₹71,000". */
export function rateList(target: LineRateTarget): string {
  return target.unit_rates.map((group) => formatINR(Number(group.monthly_rate))).join(", ");
}

/** The typed rate as it will be charged. Junk stays as typed rather than a
 *  confident "₹0" — the server rejects it either way. */
export function asRate(typed: string): string {
  const value = Number(typed);
  return Number.isFinite(value) && typed !== "" ? formatINR(value) : typed;
}

/** What sits under a line's rate box: what its UNITS charge today. */
export function lineHelp(state: TargetsState, target: LineRateTarget | undefined, contracted: string | number) {
  if (state === "loading") return E.unitsLoading;
  if (state === "error") return E.unitsUnavailable;
  return target ? E.unitsOnRent(target.units_on_rent, rateList(target)) : E.noUnitsOnRent(formatINR(Number(contracted)));
}
