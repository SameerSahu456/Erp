// Derivation helpers for the warehouse location screen, kept here so the table
// rows and the storage summary can't drift in how they read occupancy.

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

import {
  STOCK_STATUS_LABELS,
  STOCK_STATUS_VARIANT,
  UTIL_TONE_LABELS,
} from "../../constants/location-status";

/** Rounded occupancy percentage, CLAMPED to 0–100. Returns 0 for a
 *  zero-capacity location. Occupancy can exceed capacity in the data (bulk
 *  imports, mis-counted slots) — an unclamped "44173%" is meaningless in the
 *  UI, so we cap the displayed figure and surface the overflow via
 *  {@link isOverCapacity} instead. */
export function ratioPct(occupied: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((occupied / capacity) * 100));
}

/** A share of a total to two decimals at most, clamped to 0–100: "99.35%", "100%". */
export function formatSharePct(part: number, total: number): string {
  if (total <= 0) return "0%";
  const pct = Math.min(100, Math.max(0, (part / total) * 100));
  return `${Number(pct.toFixed(2))}%`;
}

/** True when a location holds more than its capacity — the signal the clamped
 *  {@link ratioPct} hides. Views show an "over capacity" marker for these. */
export function isOverCapacity(occupied: number, capacity: number): boolean {
  return capacity > 0 && occupied > capacity;
}

export type UtilTone = "empty" | "healthy" | "filling" | "full";

/** Occupancy → tone. Empty reads neutral; colour escalates as it fills. */
export function utilTone(occupied: number, capacity: number): UtilTone {
  if (capacity === 0 || occupied <= 0) return "empty";
  if (occupied >= capacity) return "full";
  return (occupied / capacity) * 100 >= 75 ? "filling" : "healthy";
}

export interface ToneStyle {
  /** Occupancy-bar fill. */
  bar: string;
  label: string;
}

// Colours are the DESIGN.md status palette (audit green / brass warning /
// sealing-wax red). `empty` stays neutral and only filling/full surfaces
// escalate, keeping the saturated-colour budget low.
export const TONE: Record<UtilTone, ToneStyle> = {
  empty: { bar: "bg-input dark:bg-white/15", label: UTIL_TONE_LABELS.empty },
  healthy: { bar: "bg-success", label: UTIL_TONE_LABELS.healthy },
  filling: { bar: "bg-warning", label: UTIL_TONE_LABELS.filling },
  full: { bar: "bg-destructive", label: UTIL_TONE_LABELS.full },
};

// stock_items.status → operator label + badge tone. Labels + variants come from
// the shared `location-status` constants (§16.12); anything unknown falls back
// to neutral at the call site so a future status can't crash the row.
export const STOCK_STATUS: Record<
  string,
  { label: string; variant: StatusBadgeVariant }
> = Object.fromEntries(
  Object.keys(STOCK_STATUS_LABELS).map((status) => [
    status,
    {
      label: STOCK_STATUS_LABELS[status],
      variant: STOCK_STATUS_VARIANT[status] ?? "neutral",
    },
  ]),
);
