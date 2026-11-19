import { Inbox } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { PageHeader } from '@/components/page-shells'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

import { formatINR as formatCurrency } from '@/lib/currency'
import { formatDate, vendors, vendorStatementData } from "../../hooks/vendor/useVendorReconciliation"
import type { VendorReconciliationController } from "../../hooks/vendor/useVendorReconciliation"
import { VENDOR_RECONCILIATION_STRINGS as S } from "./vendor-reconciliation.strings"

export function VendorReconciliationBody({ f }: { f: VendorReconciliationController }) {
  const {
    selectedVendor,
    setSelectedVendor,
    vendorInvoices,
    ourTotal,
    ourPaid,
    vendorStatementTotal,
    discrepancy,
  } = f

  return (
    <div className="space-y-6">
      <PageHeader
        title={S.page.title}
        subtitle={S.page.subtitle}
        breadcrumbs={[{ label: S.page.breadcrumbs.reconciliation }, { label: S.page.breadcrumbs.vendor }]}
      />

      <div className="max-w-sm">
        <Select value={selectedVendor} onValueChange={(v) => setSelectedVendor(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder={S.vendorSelect.placeholder} />
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
              <CardTitle>{S.ourRecords.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border max-h-[350px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow>
                      <TableHead>{S.ourRecords.columns.ref}</TableHead>
                      <TableHead>{S.ourRecords.columns.date}</TableHead>
                      <TableHead className="text-right">{S.ourRecords.columns.total}</TableHead>
                      <TableHead className="text-right">{S.ourRecords.columns.paid}</TableHead>
                      <TableHead>{S.ourRecords.columns.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0">
                          <EmptyState
                            icon={Inbox}
                            title={S.ourRecords.empty.title}
                            description={S.ourRecords.empty.description}
                          />
                        </TableCell>
                      </TableRow>
                    )}
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
                <span>{S.ourRecords.totalInvoiced} {formatCurrency(ourTotal)}</span>
                <span>{S.ourRecords.totalPaid} {formatCurrency(ourPaid)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Vendor Statement */}
          <Card>
            <CardHeader>
              <CardTitle>{S.vendorStatement.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedVendor === 'VEN-001' ? (
                <div className="overflow-x-auto rounded-md border max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                      <TableRow>
                        <TableHead>{S.vendorStatement.columns.ref}</TableHead>
                        <TableHead>{S.vendorStatement.columns.date}</TableHead>
                        <TableHead>{S.vendorStatement.columns.description}</TableHead>
                        <TableHead className="text-right">{S.vendorStatement.columns.amount}</TableHead>
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
                  <Typography tone="muted">{S.vendorStatement.notUploaded}</Typography>
                  <Button variant="outline" size="sm" className="mt-2">{S.vendorStatement.uploadStatement}</Button>
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
            <CardTitle>{S.discrepancies.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {discrepancy === 0 ? (
              <div className="rounded-lg bg-status-success-bg p-4 text-center">
                <p className="text-sm font-medium text-status-success-text">{S.discrepancies.noDiscrepancy}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{S.discrepancies.columns.item}</TableHead>
                      <TableHead className="text-right">{S.discrepancies.columns.ourAmount}</TableHead>
                      <TableHead className="text-right">{S.discrepancies.columns.vendorAmount}</TableHead>
                      <TableHead className="text-right">{S.discrepancies.columns.difference}</TableHead>
                      <TableHead>{S.discrepancies.columns.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{S.discrepancies.totalInvoiceAmount}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(ourTotal)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(vendorStatementTotal)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive font-medium">
                        {formatCurrency(discrepancy)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant="error">{S.discrepancies.mismatch}</StatusBadge>
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
