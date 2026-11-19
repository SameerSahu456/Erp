import { formatIST } from "@shared/lib/date";
import type { PMAssignment } from "../../api";

// All badges now route through the shared `<StatusBadge>` design-system
// component (`@/components/common/display/StatusBadge`) so the PM list matches the
// rest of IMS (OEM, Category, Part, HSN, PM detail) — same pill shape,
// same dot, same colour tokens. The variant mapping mirrors the detail
// page (PMAssignmentDetailPage `STATUS_BADGE_VARIANT` + the inline
// `conditionPillVariant` switch) so both surfaces of the same row read
// the same.

export const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  refurbished: "Refurbished",
  new_pull: "New Pull",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  revoked: "Revoked",
};

export const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "info" | "neutral" | "error"
> = {
  active: "success",
  scheduled: "info",
  expired: "warning",
  revoked: "error",
};

// Backend embeds these denorm + computed fields on PMAssignmentResponse —
// schema.gen.ts hasn't been regenerated yet. Extend the type locally so
// columns can read straight off the row (no extra lookups, no client joins).
export type PMRow = PMAssignment & {
  user_name?: string | null;
  user_email?: string | null;
  category_name?: string | null;
  oem_name?: string | null;
  status?: "active" | "scheduled" | "expired" | "revoked";
  updated_at?: string;
  revoked_at?: string | null;
};

// Date-only formatter for the "Last Updated" column — mirrors the helper
// on `PMAssignmentDetailPage` so both surfaces render the same shape
// ("29 May 2026"). `formatIST` returns "DD MMM YYYY, HH:mm"; splitting on
// the comma strips the time portion. Returns "—" for null/missing input
// so the cell never reads as blank-empty.
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatIST(iso).split(",")[0] ?? iso;
}
