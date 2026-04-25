import { useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"
import { ListPageShell } from "@/components/page"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

import { invoices } from "@/modules/crm/data/invoices"
import type { Invoice } from "@/modules/crm/types"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const formatCurrencyShort = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const statusVariant: Record<string, StatusBadgeVariant> = {
  Draft: "neutral",
  Sent: "info",
  "Partially Paid": "warning",
  Paid: "success",
  Overdue: "red-cell",
  Void: "error",
}

const invoicesTab: TabConfig = {
  id: "invoices",
  label: "All Invoices",
  columns: [
    { key: "invoiceNumber", label: "Invoice #", sortable: true },
    { key: "accountName", label: "Account", sortable: true },
    { key: "amount", label: "Amount", sortable: true, align: "right" },
    { key: "status", label: "Status", sortable: true },
    { key: "issueDate", label: "Issue Date", sortable: true },
    { key: "dueDate", label: "Due Date", sortable: true },
  ],
  data: invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    accountName: inv.accountName,
    amount: inv.amount,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
  })),
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "amount" && typeof value === "number") {
    return { display: formatCurrencyShort(value) }
  }
  if (key === "status" && typeof value === "string") {
    const variant = statusVariant[value] ?? "neutral"
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  // Row-level styling
  const status = row["status"]
  if (status === "Overdue") {
    return { className: "text-destructive" }
  }
  if (status === "Paid") {
    return { className: "text-status-success-text" }
  }
  return null
}

function InvoiceDetailDialog({
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
          <DialogTitle className="sr-only">Invoice {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription className="sr-only">
            Invoice details for {invoice.accountName}
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Preview */}
        <div className="space-y-6 print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-display font-bold tracking-tight">
                comprinttech
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                IT Infrastructure Solutions
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-display font-semibold text-muted-foreground/60 uppercase tracking-widest">
                Invoice
              </span>
            </div>
          </div>

          <Separator />

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-ui font-medium text-muted-foreground uppercase tracking-wide">
                  Bill To
                </span>
                <p className="font-medium mt-1">{invoice.accountName}</p>
                <p className="text-muted-foreground text-xs">
                  123 Business Park, Suite 456
                  <br />
                  Mumbai, Maharashtra 400001
                </p>
              </div>
            </div>
            <div className="space-y-2 text-right">
              <div className="flex justify-end gap-2 items-center">
                <span className="text-muted-foreground">Invoice #:</span>
                <span className="font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-end gap-2 items-center">
                <span className="text-muted-foreground">Issue Date:</span>
                <span>{invoice.issueDate}</span>
              </div>
              <div className="flex justify-end gap-2 items-center">
                <span className="text-muted-foreground">Due Date:</span>
                <span>{invoice.dueDate}</span>
              </div>
              <div className="flex justify-end gap-2 items-center">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge variant={statusVariant[invoice.status] ?? "neutral"}>
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
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-left px-3 py-2 font-medium">Description</th>
                  <th className="text-right px-3 py-2 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 font-medium">Rate</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
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
                      {formatCurrency(li.rate)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(li.amount)}
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
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>{formatCurrency(gst)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button
            variant="outline"
            onClick={() => window.print()}
          >
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InvoicesPage() {
  const navigate = useNavigate()
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleRowClick = (invoiceNumber: string) => {
    const inv = invoices.find((i) => i.invoiceNumber === invoiceNumber)
    if (inv) {
      setSelectedInvoice(inv)
      setDialogOpen(true)
    }
  }

  const invoiceCellFormatter: CellFormatter = (value, key, row) => {
    // Make invoice number clickable
    if (key === "invoiceNumber" && typeof value === "string") {
      return {
        display: (
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline cursor-pointer font-medium"
            onClick={() => handleRowClick(value)}
          >
            {value}
          </button>
        ),
      }
    }
    return cellFormatter(value, key, row)
  }

  return (
    <>
      <ListPageShell
        title="Invoices"
        subtitle="Tax invoices raised against customer sales orders."
        breadcrumbs={[{ label: 'CRM' }, { label: 'Invoices' }]}
        actions={
          <Button onClick={() => navigate("/crm/invoices/new")}>
            <Plus className="mr-1 size-4" />
            Create Invoice
          </Button>
        }
      >
        <BusinessMetricsTable
          tabs={[invoicesTab]}
          cellFormatter={invoiceCellFormatter}
          pageSize={10}
          persistKey="crm-invoices"
          onRowClick={(row) => navigate(`/crm/invoices/${row.id}/edit`)}
          emptyState={{
            title: 'No invoices yet',
            description: 'Create an invoice to bill a customer for a confirmed order.',
            action: {
              label: 'Create Invoice',
              onClick: () => navigate('/crm/invoices/new'),
            },
          }}
        />
      </ListPageShell>

      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}

export default InvoicesPage
