import { formatINR } from "@/lib/currency"

import { type PoSnapshotLine } from "../../api"

export function money(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—"
  return formatINR(Number(v))
}

export const PM_STATUS: Record<
  PoSnapshotLine["pm_status"],
  { label: string; variant: "warning" | "success" | "error" }
> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
}
