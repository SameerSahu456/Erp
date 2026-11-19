import type { RentalSettings } from "../../api/settings";

export type ScheduleDraft = Pick<RentalSettings, "billing_enabled" | "billing_hour" | "billing_minute">;

export function toScheduleDraft(s: RentalSettings): ScheduleDraft {
  return {
    billing_enabled: s.billing_enabled,
    billing_hour: s.billing_hour,
    billing_minute: s.billing_minute,
  };
}

// ── The run time, shown on a 12-hour clock (2026-11-16) ──────────────────
// Stored as 24-hour `billing_hour` / `billing_minute`; only the display is
// 12-hour. Every option is a fixed two-digit (or AM/PM) string, so a typed
// value is parsed onto exactly one option or refused.

export type Meridiem = "AM" | "PM";

const pad2 = (n: number) => String(n).padStart(2, "0");

export const HOUR_12_OPTIONS: readonly string[] = Array.from({ length: 12 }, (_, i) => pad2(i + 1));
export const MINUTE_OPTIONS: readonly string[] = Array.from({ length: 60 }, (_, i) => pad2(i));
export const MERIDIEM_OPTIONS: readonly Meridiem[] = ["AM", "PM"];

/** 0–23 → its 12-hour face: 0 → 12 AM, 12 → 12 PM, 13 → 01 PM. */
export function to12Hour(hour24: number): { hour: string; meridiem: Meridiem } {
  return { hour: pad2(hour24 % 12 === 0 ? 12 : hour24 % 12), meridiem: hour24 < 12 ? "AM" : "PM" };
}

/** The 12-hour face back to 0–23. */
export function to24Hour(hour12: string, meridiem: Meridiem): number {
  const h = Number(hour12) % 12;
  return meridiem === "PM" ? h + 12 : h;
}

/** A typed number onto its option in `min..max`, or null when it is not one. */
function parseNumber(raw: string, min: number, max: number): string | null {
  if (!/^\d{1,2}$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return n >= min && n <= max ? pad2(n) : null;
}

export const parseHour12 = (raw: string) => parseNumber(raw, 1, 12);
export const parseMinute = (raw: string) => parseNumber(raw, 0, 59);

/** "a", "am", "P", "pm" … → AM / PM. */
export function parseMeridiem(raw: string): Meridiem | null {
  const first = raw.trim().charAt(0).toUpperCase();
  if (first === "A") return "AM";
  if (first === "P") return "PM";
  return null;
}
