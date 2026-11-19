import type { BillingSettings } from "../../lib/cadence";

export interface CadenceFieldGroupProps {
  value: BillingSettings;
  onChange: (next: BillingSettings) => void;
  disabled?: boolean;
  /** Prefix for the generated input ids, so two instances on one page never collide. */
  idPrefix: string;
}

/** Empty or non-numeric box -> null. */
export function toNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Empty box -> 0, for the never-null grace field (clearing means "bill from
 *  the dispatch day"); junk also lands on 0 rather than NaN. */
export function toNumberOrZero(raw: string): number {
  const n = Number(raw);
  return raw.trim() === "" || Number.isNaN(n) ? 0 : n;
}
