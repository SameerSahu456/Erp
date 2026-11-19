import { formatINRCompact } from "@/lib/currency"

import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import type { PurchaseOrder, POCreditRollup, PurchaseReturn } from "../../api"

export const CLOSE_S = PURCHASE_ORDERS_STRINGS.detail.closeDialog
export const CANCEL_S = PURCHASE_ORDERS_STRINGS.detail.cancelDialog
export const LINES_S = PURCHASE_ORDERS_STRINGS.detail.lineItemsTable

export interface TerminalDialogProps {
  po: PurchaseOrder
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Close confirmation. When any line still has pending quantity this is a
 *  SHORT CLOSE: the pending lines are listed and a reason is mandatory —
 *  the record that the user deliberately force-closed without amending
 *  (spec-po-close-cancel-and-documents §B). */
export interface CloseDialogProps extends TerminalDialogProps {
  // From the PO detail's `?include=returns` fetch — drives the hard blocks.
  rollup?: POCreditRollup | null
  returns?: PurchaseReturn[]
}

export function money(v: string): string {
  return formatINRCompact(Number(v))
}
