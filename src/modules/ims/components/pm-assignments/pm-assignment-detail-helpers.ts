import { formatIST } from "@shared/lib/date";


export const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  refurbished: "Refurbished",
  new_pull: "New Pull",
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatIST(iso).split(",")[0] ?? iso;
}

export interface PMAssignmentDenorm {
  user_name?: string | null;
  user_email?: string | null;
  category_name?: string | null;
  oem_name?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
  status?: "active" | "scheduled" | "expired" | "revoked";
  revoked_at?: string | null;
  notes?: string | null;
}

export const STATUS_BADGE_VARIANT: Record<
  string,
  "success" | "warning" | "info" | "neutral" | "error"
> = {
  active: "success",
  scheduled: "info",
  expired: "warning",
  revoked: "error",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  revoked: "Revoked",
};
