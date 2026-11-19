import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatINRCompact } from "@/lib/currency"

import type { Invoice } from "@/modules/crm/types"
import { INVOICE_STATUS_VARIANT } from "../../constants/invoice-status"
import { CRM_INVOICES_STRINGS } from "./invoices.strings"

const S = CRM_INVOICES_STRINGS.detail

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!invoice) return null

  const subtotal = invoice.lineItems.reduce((sum, li) => sum + li.amount, 0)
  const gst = subtotal * 0.18
  const total = subtotal + gst

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">{S.dialogTitle(invoice.invoiceNumber)}</DialogTitle>
          <DialogDescription className="sr-only">
            {S.dialogDescription(invoice.accountName)}
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Preview */}
        <div className="space-y-6 print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-display font-bold tracking-tight">
                {S.companyName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {S.companyTagline}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-display font-semibold text-muted-foreground/60 uppercase tracking-widest">
                {S.invoiceLabel}
              </span>
            </div>
          </div>

          <Separator />

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-ui font-medium text-muted-foreground uppercase tracking-wide">
                  {S.billTo}
                </span>
                <p className="font-medium mt-1">{invoice.accountName}</p>
                <p className="text-muted-foreground text-xs">
                  {S.billToAddressLine1}
                  <br />
                  {S.billToAddressLine2}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-right">
              <div className="flex justify-end gap-2 items-center">
                <span className="text-muted-foreground">{S.invoiceNumberLabel}</span>
                <span className="font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-end gap-2 items-center">
                <span className="text-muted-foreground">{S.issueDateLabel}</span>
                <span>{invoice.issueDate}</span>
              </div>
              <div className="flex justify-end gap-2 items-center">
                <span className="text-muted-foreground">{S.dueDateLabel}</span>
                <span>{invoice.dueDate}</span>
              </div>
              <div className="flex justify-end gap-2 items-center">
                <span className="text-muted-foreground">{S.statusLabel}</span>
                <StatusBadge variant={INVOICE_STATUS_VARIANT[invoice.status] ?? "neutral"}>
                  {invoice.status}
                </StatusBadge>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2 font-medium">{S.columns.item}</th>
                  <th className="text-left px-3 py-2 font-medium">{S.columns.description}</th>
                  <th className="text-right px-3 py-2 font-medium">{S.columns.qty}</th>
                  <th className="text-right px-3 py-2 font-medium">{S.columns.rate}</th>
                  <th className="text-right px-3 py-2 font-medium">{S.columns.amount}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li) => (
                  <tr key={li.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{li.item}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {li.description}
                    </td>
                    <td className="px-3 py-2 text-right">{li.qty}</td>
                    <td className="px-3 py-2 text-right">
                      {formatINRCompact(li.rate, { decimals: true })}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatINRCompact(li.amount, { decimals: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{S.subtotal}</span>
                <span>{formatINRCompact(subtotal, { decimals: true })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{S.gst}</span>
                <span>{formatINRCompact(gst, { decimals: true })}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-base">
                <span>{S.total}</span>
                <span>{formatINRCompact(total, { decimals: true })}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button
            variant="outline"
            onClick={() => window.print()}
          >
            {S.print}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
