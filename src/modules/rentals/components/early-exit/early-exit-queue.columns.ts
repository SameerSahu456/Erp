import { formatINR } from "@/lib/currency"
import { EMPTY_VALUE } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"

import type { EarlyExitQueueRow } from "../../api/early-exit"
import { EARLY_EXIT_STRINGS } from "./early-exit.strings"

const S = EARLY_EXIT_STRINGS.queue

export const EARLY_EXIT_QUEUE_TABS = [
  { id: "pending", label: S.tabs.pending, status: ["pending"] },
  { id: "scheduled", label: S.tabs.scheduled, status: ["scheduled"] },
  { id: "approved", label: S.tabs.approved, status: ["approved"] },
  { id: "rejected", label: S.tabs.rejected, status: ["rejected"] },
  { id: "all", label: S.tabs.all, status: undefined },
] as const

export const EARLY_EXIT_QUEUE_COLUMNS = [
  { key: "kind", label: S.columns.kind, width: "11%" },
  { key: "order", label: S.columns.order, width: "13%" },
  { key: "customer", label: S.columns.customer, width: "15%" },
  { key: "what", label: S.columns.what, width: "14%" },
  { key: "charge", label: S.columns.charge, width: "10%" },
  { key: "waiver", label: S.columns.waiver, width: "10%" },
  { key: "requestedBy", label: S.columns.requestedBy, width: "11%" },
  { key: "status", label: S.columns.status, width: "8%" },
  { key: "raised", label: S.columns.raised, width: "8%" },
]

const VARIANT: Record<string, "warning" | "success" | "error" | "info" | "neutral"> = {
  pending: "warning",
  scheduled: "info",
  approved: "success",
  rejected: "error",
  cancelled: "neutral",
}

export const earlyExitQueueVariant = (status: string) => VARIANT[status] ?? "neutral"

function whatOf(r: EarlyExitQueueRow): string {
  if (r.kind === "termination") {
    return S.terminationWhat(r.effective_date ? formatIST_date(r.effective_date) : EMPTY_VALUE)
  }
  if (r.kind === "charge_waiver") return S.chargeWhat
  return S.termsWhat(r.proposed_pct ?? null, r.proposed_exempt ?? null)
}

/** Asked / waived / charge stands — the waiver column. */
function waiverOf(r: EarlyExitQueueRow): string {
  if (r.waived === true) return S.waiver.waived
  if (r.waived === false) return S.waiver.stands
  return r.waive_requested ? S.waiver.asked : S.waiver.notAsked
}

export function toEarlyExitQueueRow(r: EarlyExitQueueRow): Record<string, unknown> {
  return {
    id: r.id,
    kind: S.kinds[r.kind],
    order: r.order_number ?? EMPTY_VALUE,
    customer: r.account_name ?? EMPTY_VALUE,
    what: whatOf(r),
    charge: r.amount ? formatINR(Number(r.amount)) : EMPTY_VALUE,
    waiver: waiverOf(r),
    requestedBy: r.requested_by_name ?? EMPTY_VALUE,
    status: S.status[r.status],
    raised: formatIST_date(r.created_at),
    _status: r.status,
    _row: r,
  }
}
