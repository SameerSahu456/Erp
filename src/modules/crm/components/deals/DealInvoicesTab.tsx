import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { cn } from "@/lib/utils"
import { formatINRCompact } from "@/lib/currency"

import { invoices } from "../../data/invoices"
import { formatDate, getInvoiceStatusVariant } from "./dealDetailHelpers"
import { DEALS_STRINGS } from "./deals.strings"

export function DealInvoicesTab({ relatedInvoices }: { relatedInvoices: typeof invoices }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {DEALS_STRINGS.detail.invoicesTab.summary(relatedInvoices.length)}
      </p>
      {relatedInvoices.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{DEALS_STRINGS.detail.invoicesTab.colInvoice}</TableHead>
                <TableHead className="text-right">{DEALS_STRINGS.detail.invoicesTab.colAmount}</TableHead>
                <TableHead>{DEALS_STRINGS.detail.invoicesTab.colStatus}</TableHead>
                <TableHead>{DEALS_STRINGS.detail.invoicesTab.colDueDate}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell className="text-right">{formatINRCompact(invoice.amount, { decimals: true })}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getInvoiceStatusVariant(invoice.status)}>
                      {invoice.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className={cn(invoice.status === "Overdue" && "text-destructive")}>
                    {formatDate(invoice.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">{DEALS_STRINGS.detail.invoicesTab.empty}</p>
        </div>
      )}
    </div>
  )
}
