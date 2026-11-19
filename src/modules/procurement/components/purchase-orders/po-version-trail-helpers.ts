import { formatINR } from "@/lib/currency"

import { isRejectedSnapshot, type PoSnapshotLine, type PoVersionSnapshot } from "../../api"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

export const REJ_S = PURCHASE_ORDERS_STRINGS.detail.amendmentRejection

export function money(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—"
  return formatINR(Number(v))
}

/** A PO line's Item cell (version history and the open amendment share it).
 *  Description is its own column, so a description-only line has an empty item
 *  label — the cell shows a dash rather than repeating the description. */
export function lineLabel(r: PoSnapshotLine): { primary: string; secondary: string } {
  if (r.part_number || r.part_name) {
    return {
      primary: [r.part_number, r.part_name].filter(Boolean).join(" — "),
      secondary: [r.variant_name, r.condition].filter(Boolean).join(" · "),
    }
  }
  return { primary: "", secondary: "" }
}

export const VS = PURCHASE_ORDERS_STRINGS.detail.versionStatus

/** The timeline node colour, matching the status badge: green applied, red
 *  rejected, amber pending, neutral for the draft / v1 baseline. */
export function nodeClass(v: PoVersionSnapshot): string {
  if (v.status === "draft") return "bg-muted-foreground/50"
  if (v.status === "pending") return "bg-warning"
  if (isRejectedSnapshot(v)) return "bg-destructive"
  if (v.version_number === 1) return "bg-muted-foreground"
  return "bg-success"
}

/** Pre-tax value of a revision (sum of its line totals) — shown in the header
 *  so the order's worth is scannable across versions without expanding each. */
export function versionTotal(lines: PoSnapshotLine[]): number {
  return lines.reduce((s, l) => s + Number(l.line_total_with_tax || 0), 0)
}
