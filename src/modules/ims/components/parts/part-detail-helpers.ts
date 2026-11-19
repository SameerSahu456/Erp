import { formatIST } from "@shared/lib/date";

// Shared, component-free helpers for the part detail surface (kept in a
// `.ts` so fast-refresh stays happy — components live in their own files).

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatIST(iso).split(",")[0] ?? iso;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export type TabKey =
  | "overview"
  | "inventory"
  | "variants"
  | "checklist"
  | "compatible"
  | "movements"
  | "linked-orders"
  | "activity";

// `bom` was removed from the Part detail tabset — Reference BOMs are
// declared on the variant (one BOM per variant), so the editor now
// lives on the Variant detail page only.
export const TAB_KEYS: TabKey[] = [
  "overview",
  "inventory",
  "variants",
  "checklist",
  "compatible",
  "movements",
  "linked-orders",
  "activity",
];

export function isTabKey(v: string | null): v is TabKey {
  return v != null && (TAB_KEYS as string[]).includes(v);
}
