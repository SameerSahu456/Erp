import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { formatINR } from "@/lib/currency"
import { EMPTY_VALUE } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"

import type { CreditNoteRegisterRow } from "../../api/credit-notes"
import type { RentalBillingAdjustment } from "../../api/swaps"
import { adjustmentStatusLabel } from "../../constants/swaps"
import { formatRentalDay } from "../../lib/format"
import { BILLING_ADJUSTMENT_STRINGS as A } from "./billing-adjustments.strings"

export const ADJUSTMENT_COLUMNS = [
  { key: "total", label: A.columns.total, width: "25%", align: "right" as const },
  { key: "lines", label: A.columns.lines, width: "20%" },
  { key: "status", label: A.columns.status, width: "25%" },
  { key: "raised", label: A.columns.raised, width: "30%" },
]

export const ADJUSTMENT_TABS = [
  { id: "pending_accounts", label: A.tabs.pending_accounts, status: ["pending_accounts"] },
  { id: "issued", label: A.tabs.issued, status: ["issued"] },
  { id: "cancelled", label: A.tabs.cancelled, status: ["cancelled"] },
  { id: "all", label: A.tabs.all, status: undefined },
] as const

/** The extra tab: every credit note, whatever raised it. */
export const CREDIT_NOTES_TAB = { id: "credit_notes", label: A.tabs.credit_notes } as const
export const ADJUSTMENT_PAGE_TABS = [...ADJUSTMENT_TABS, CREDIT_NOTES_TAB] as const

const CN = A.creditNotes

// The `status` key carries the source so the list shows it as a badge.
export const CREDIT_NOTE_COLUMNS = [
  { key: "cnNumber", label: CN.columns.cnNumber, width: "16%" },
  { key: "cnDate", label: CN.columns.cnDate, width: "12%" },
  { key: "invoice", label: CN.columns.invoice, width: "18%" },
  { key: "account", label: CN.columns.account, width: "24%" },
  { key: "amount", label: CN.columns.amount, width: "12%", align: "right" as const },
  { key: "status", label: CN.columns.source, width: "18%" },
]

export function toCreditNoteListRow(n: CreditNoteRegisterRow): Record<string, unknown> {
  const fromSwap = n.rental_billing_adjustment_id != null
  return {
    id: n.id,
    cnNumber: n.cn_number ?? CN.notIssued,
    cnDate: formatRentalDay(n.cn_date),
    invoice: n.invoice_number,
    account: n.account ?? EMPTY_VALUE,
    amount: formatINR(Number(n.amount)),
    status: fromSwap ? CN.source.adjustment : CN.source.manual,
    _status: fromSwap ? "adjustment" : "manual",
  }
}

export const creditNoteSourceVariant = (source: string): StatusBadgeVariant =>
  source === "adjustment" ? "info" : "neutral"

export function toAdjustmentRow(a: RentalBillingAdjustment): Record<string, unknown> {
  return {
    id: a.id,
    total: formatINR(Number(a.total)),
    lines: A.lines(a.lines.length),
    status: adjustmentStatusLabel(a.status),
    raised: formatIST_date(a.created_at),
    _status: a.status,
  }
}
