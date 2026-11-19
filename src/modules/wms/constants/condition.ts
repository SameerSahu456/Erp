// Canonical display labels for a stock/variant `condition` wire value
// (new / refurbished / new_pull). The backend sends the lowercase code; the UI
// must never render it raw. Several WMS surfaces historically kept their own
// copy of this map — this is the shared source for new code and the fix-ups.

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

export const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  refurbished: "Refurbished",
  new_pull: "New Pull",
};

export const CONDITION_VARIANT: Record<string, StatusBadgeVariant> = {
  new: "success",
  new_pull: "warning",
  refurbished: "info",
};

/** Human label for a condition code. Falls back to Title-Casing any unknown
 *  snake_case value (`some_new_code` → "Some New Code") so a future condition
 *  never leaks a raw lowercase token to the UI. Empty string for null/undefined. */
export function formatCondition(condition: string | null | undefined): string {
  if (!condition) return "";
  return (
    CONDITION_LABELS[condition] ??
    condition
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}
