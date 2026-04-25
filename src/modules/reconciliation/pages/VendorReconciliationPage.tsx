import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

import { mockPurchaseInvoices } from '@/modules/invoices/data/purchase-invoices'
import { formatINR as formatCurrency } from '@/lib/currency'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// Unique vendors
const vendors = Array.from(
  new Map(mockPurchaseInvoices.map((inv) => [inv.vendorId, { id: inv.vendorId, name: inv.vendorName }])).values()
)

// Mock vendor statement data (placeholder)
const vendorStatementData = [
  { ref: 'VS-001', date: '2026-04-05', description: 'Invoice DELL-INV-2026-88421', amount: 11357500 },
  { ref: 'VS-002', date: '2026-04-18', description: 'Invoice DELL-INV-2026-88422', amount: 1032500 },
  { ref: 'VS-003', date: '2026-05-02', description: 'Payment received', amount: -11357500 },
  { ref: 'VS-004', date: '2026-04-28', description: 'Payment received', amount: -1032500 },
]

function VendorReconciliationPage() {
  const [selectedVendor, setSelectedVendor] = useState('')

  const vendorInvoices = selectedVendor
    ? mockPurchaseInvoices.filter((inv) => inv.vendorId === selectedVendor)
    : []

  const ourTotal = vendorInvoices.reduce((s, inv) => s + inv.grandTotal, 0)
  const ourPaid = vendorInvoices.reduce((s, inv) => s + inv.paidAmount, 0)

  // Simplified discrepancy: difference between our records and vendor statement
  const vendorStatementTotal = selectedVendor === 'VEN-001'
    ? vendorStatementData.filter((v) => v.amount > 0).reduce((s, v) => s + v.amount, 0)
    : ourTotal
  const discrepancy = ourTotal - vendorStatementTotal

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Reconciliation"
        subtitle="Compare your records against vendor statements and resolve discrepancies."
        breadcrumbs={[{ label: 'Reconciliation' }, { label: 'Vendor' }]}
      />

      <div className="max-w-sm">
        <Select value={selectedVendor} onValueChange={(v) => setSelectedVendor(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder="Select vendor..." />
          </SelectTrigger>
          <SelectContent>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedVendor && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Our Records */}
          <Card>
            <CardHeader>
              <CardTitle>Our Records (POs + Payments)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border max-h-[350px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow>
                      <TableHead>Ref#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(inv.receiveDate)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(inv.grandTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(inv.paidAmount)}</TableCell>
                        <TableCell>
                          <StatusBadge variant={inv.status === 'Paid' ? 'success' : inv.status === 'Disputed' ? 'error' : 'warning'}>
                            {inv.status}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex justify-between text-sm font-medium">
                <span>Total Invoiced: {formatCurrency(ourTotal)}</span>
                <span>Total Paid: {formatCurrency(ourPaid)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Vendor Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Statement</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedVendor === 'VEN-001' ? (
                <div className="overflow-x-auto rounded-md border max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                      <TableRow>
                        <TableHead>Ref</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendorStatementData.map((row) => (
                        <TableRow key={row.ref}>
                          <TableCell className="font-medium">{row.ref}</TableCell>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell className="text-muted-foreground">{row.description}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(row.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">Vendor statement not uploaded yet.</p>
                  <Button variant="outline" size="sm" className="mt-2">Upload Statement</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Discrepancy */}
      {selectedVendor && (
        <Card>
          <CardHeader>
            <CardTitle>Discrepancies</CardTitle>
          </CardHeader>
          <CardContent>
            {discrepancy === 0 ? (
              <div className="rounded-lg bg-status-success-bg p-4 text-center">
                <p className="text-sm font-medium text-status-success-text">No discrepancies found. Records match.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Our Amount</TableHead>
                      <TableHead className="text-right">Vendor Amount</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Total Invoice Amount</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(ourTotal)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(vendorStatementTotal)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive font-medium">
                        {formatCurrency(discrepancy)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant="error">Mismatch</StatusBadge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default VendorReconciliationPage
