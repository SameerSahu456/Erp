import { formatIST } from "@shared/lib/date";

// Shared, component-free helpers for the variant detail surface (kept in a
// `.ts` so fast-refresh stays happy — components live in their own files).

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatIST(iso).split(",")[0] ?? iso;
}

export const CONDITION_LABELS: Record<
  string,
  { label: string; variant: "success" | "info" | "warning" }
> = {
  new: { label: "New", variant: "success" },
  refurbished: { label: "Refurbished", variant: "info" },
  new_pull: { label: "New Pull", variant: "warning" },
};
