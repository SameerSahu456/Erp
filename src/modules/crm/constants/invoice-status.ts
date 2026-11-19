import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { Invoice } from "../types"

type InvoiceStatus = Invoice["status"]

// Domain label map (Coding-guideline §16.12 bucket 2): the single source for
// how an invoice's `status` wire value is shown to the user. Today most labels
// equal the wire value, but routing display through this map means any future
// copy change lives in one place and can't drift across the list table badge,
// the detail dialog status, and the form status dropdown.
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  Draft: "Draft",
  Sent: "Sent",
  "Partially Paid": "Partially Paid",
  Paid: "Paid",
  Overdue: "Overdue",
  Void: "Void",
}

// Ordered list of statuses for the form's Status dropdown options.
export const INVOICE_STATUSES: InvoiceStatus[] = [
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Void",
]

// StatusBadge tone per invoice status — consolidated here so the list table
// (InvoicesTable) and the detail dialog (InvoiceDetailDialog) share one mapping
// (was previously `statusVariant` in components/invoices/invoiceStatus.ts).
export const INVOICE_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  Draft: "neutral",
  Sent: "info",
  "Partially Paid": "warning",
  Paid: "success",
  Overdue: "error",
  Void: "error",
}
