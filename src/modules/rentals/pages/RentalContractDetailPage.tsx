import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarDays,
  CreditCard,
  ArrowRightLeft,
  RotateCcw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import { CommentSection } from '@/modules/crm/components/CommentSection'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PermissionGate } from '@/components/common/PermissionGate'
import { mockRentalContracts } from '../data/contracts'
import { mockRentalReturns } from '../data/returns'
import type { RentalContractStatus, RentalBillingEntry } from '../types'

const TODAY = '2026-04-15'

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`
}

function daysBetween(from: string, to: string): number {
  return Math.ceil(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
  )
}

const STATUS_VARIANT: Record<RentalContractStatus, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  Draft: 'neutral',
  Active: 'success',
  Extended: 'info',
  Overdue: 'error',
  Returned: 'warning',
  Closed: 'neutral',
  Terminated: 'error',
}

const BILLING_VARIANT: Record<RentalBillingEntry['status'], 'success' | 'warning' | 'error' | 'info'> = {
  Pending: 'warning',
  Invoiced: 'info',
  Paid: 'success',
  Overdue: 'error',
}

export default function RentalContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const contract = mockRentalContracts.find((c) => c.id === id)
  const [status, setStatus] = useState(contract?.status)

  if (!contract) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Contract not found.</p>
      </div>
    )
  }

  const linkedReturns = mockRentalReturns.filter(
    (r) => r.contractId === contract.id || r.contractNumber === contract.contractNumber,
  )

  const balanceDue = contract.totalBilled - contract.totalPaid
  const daysRemaining = daysBetween(TODAY, contract.endDate)

  // ── Tab 1: Overview ──
  const overviewTab = (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contract Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{contract.customerName}</dd>
            <dt className="text-muted-foreground">Contact Person</dt>
            <dd>{contract.contactPerson}</dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{contract.contactPhone}</dd>
            <dt className="text-muted-foreground">Address</dt>
            <dd className="col-span-2 -mt-1">{contract.shippingAddress}</dd>
            <dt className="text-muted-foreground">Start Date</dt>
            <dd>{contract.startDate}</dd>
            <dt className="text-muted-foreground">End Date</dt>
            <dd>{contract.endDate}</dd>
            <dt className="text-muted-foreground">Duration</dt>
            <dd>{contract.duration} days</dd>
            <dt className="text-muted-foreground">Billing Cycle</dt>
            <dd>{contract.billingCycle}</dd>
            <dt className="text-muted-foreground">Auto-Renewal</dt>
            <dd>{contract.autoRenewal ? 'Yes' : 'No'}</dd>
            {contract.terms && (
              <>
                <dt className="text-muted-foreground">Terms</dt>
                <dd className="col-span-2 -mt-1">{contract.terms}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Per Unit Rate</dt>
            <dd className="font-medium">{formatCurrency(contract.perUnitRate)}</dd>
            <dt className="text-muted-foreground">Total Units</dt>
            <dd>{contract.totalUnits}</dd>
            <dt className="text-muted-foreground">Deposit</dt>
            <dd>{formatCurrency(contract.depositAmount)}</dd>
            <dt className="text-muted-foreground">Monthly Rental</dt>
            <dd className="font-semibold text-lg">{formatCurrency(contract.monthlyRental)}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  )

  // ── Tab 2: Devices ──
  const devicesTab = (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('Initiate Return flow would open here')}
        >
          <RotateCcw className="mr-2 size-4" />
          Initiate Return (Bulk)
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barcode</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Serial #</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Dispatched</TableHead>
              <TableHead>Return Due</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contract.devices.map((d) => {
              const isPastDue = !d.returnedDate && d.returnDueDate < TODAY
              return (
                <TableRow key={d.deviceId}>
                  <TableCell className="font-medium">{d.barcode}</TableCell>
                  <TableCell>{d.model}</TableCell>
                  <TableCell>{d.brand}</TableCell>
                  <TableCell className="font-mono text-xs">{d.serialNumber}</TableCell>
                  <TableCell>
                    {d.variant === 'Refurbished' ? (
                      <PermissionGate role="TECHNICAL_TEAM" fallback={<StatusBadge variant="neutral">Restricted</StatusBadge>}>
                        <StatusBadge variant="warning">{d.variant}</StatusBadge>
                      </PermissionGate>
                    ) : (
                      <StatusBadge variant="info">{d.variant}</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell>{d.grade ?? '-'}</TableCell>
                  <TableCell>{d.conditionAtDispatch}</TableCell>
                  <TableCell>{d.dispatchedDate}</TableCell>
                  <TableCell
                    className={isPastDue ? 'bg-destructive/10 text-destructive font-medium' : ''}
                  >
                    {d.returnedDate ? (
                      <span className="text-muted-foreground">Returned {d.returnedDate}</span>
                    ) : (
                      d.returnDueDate
                    )}
                  </TableCell>
                  <TableCell>
                    {!d.returnedDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toast.info(`Initiate return for ${d.barcode}`)
                        }
                      >
                        Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  // ── Tab 3: Billing ──
  const totalBilledSum = contract.billingHistory.reduce((s, b) => s + b.amount, 0)
  const totalPaidSum = contract.billingHistory
    .filter((b) => b.status === 'Paid')
    .reduce((s, b) => s + b.amount, 0)

  const billingTab = (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('Invoice generation triggered')}
        >
          <CreditCard className="mr-2 size-4" />
          Generate Invoice
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid Date</TableHead>
              <TableHead>Invoice #</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contract.billingHistory.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.period}</TableCell>
                <TableCell className="text-right">{formatCurrency(b.amount)}</TableCell>
                <TableCell className={b.status === 'Overdue' ? 'bg-destructive/10' : ''}>
                  <StatusBadge variant={BILLING_VARIANT[b.status]}>{b.status}</StatusBadge>
                </TableCell>
                <TableCell>{b.dueDate}</TableCell>
                <TableCell>{b.paidDate ?? '-'}</TableCell>
                <TableCell>
                  {b.invoiceNumber ? (
                    <span className="text-primary">{b.invoiceNumber}</span>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex gap-6 rounded-lg border bg-muted/50 p-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total Billed:</span>{' '}
          <span className="font-semibold">{formatCurrency(totalBilledSum)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Paid:</span>{' '}
          <span className="font-semibold">{formatCurrency(totalPaidSum)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Balance Due:</span>{' '}
          <span className={`font-semibold ${totalBilledSum - totalPaidSum > 0 ? 'text-destructive' : ''}`}>
            {formatCurrency(totalBilledSum - totalPaidSum)}
          </span>
        </div>
      </div>
    </div>
  )

  // ── Tab 4: Returns ──
  const returnsTab = (
    <div className="space-y-3">
      {linkedReturns.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No return records linked to this contract.
        </p>
      ) : (
        linkedReturns.map((r) => (
          <Link
            key={r.id}
            to={`/rentals/returns?selected=${r.id}`}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-1">
              <p className="font-medium text-sm">{r.returnNumber}</p>
              <p className="text-xs text-muted-foreground">
                {r.devices.length} devices &middot; Initiated {r.createdAt}
              </p>
            </div>
            <StatusBadge
              variant={
                r.status === 'Closed'
                  ? 'success'
                  : r.status === 'Initiated'
                    ? 'info'
                    : 'warning'
              }
            >
              {r.status}
            </StatusBadge>
          </Link>
        ))
      )}
    </div>
  )

  // ── Tab 5: Comments ──
  const commentsTab = (
    <CommentSection entityType="lead" entityId={contract.id} />
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewTab },
    { id: 'devices', label: 'Devices', count: contract.devices.length, content: devicesTab },
    { id: 'billing', label: 'Billing', count: contract.billingHistory.length, content: billingTab },
    { id: 'returns', label: 'Returns', count: linkedReturns.length, content: returnsTab },
    { id: 'comments', label: 'Comments', content: commentsTab },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={contract.contractNumber}
        subtitle={contract.customerName}
        status={{ label: status ?? contract.status, variant: STATUS_VARIANT[status ?? contract.status] }}
        backHref="/rentals/contracts"
        actions={
          <>
            {(status === 'Active' || status === 'Extended') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.success('Contract extended by 3 months')
                  }}
                >
                  <ArrowRightLeft className="mr-2 size-4" />
                  Extend Contract
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus('Terminated')
                    toast.info('Contract terminated')
                  }}
                >
                  Terminate
                </Button>
                <Button
                  onClick={() =>
                    toast.info('Initiate return flow for all devices')
                  }
                >
                  <RotateCcw className="mr-2 size-4" />
                  Initiate Return
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <DetailTabs cardContent tabs={tabs} />

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Contract Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <StatusBadge variant={STATUS_VARIANT[status ?? contract.status]}>
                      {status ?? contract.status}
                    </StatusBadge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="text-right text-xs">{contract.customerName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Devices</dt>
                  <dd>{contract.devices.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd>{contract.duration} days</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Monthly Rate</dt>
                  <dd className="font-medium">{formatCurrency(contract.monthlyRental)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Financial</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Billed</dt>
                  <dd>{formatCurrency(contract.totalBilled)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="text-status-success-text">{formatCurrency(contract.totalPaid)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Due</dt>
                  <dd className={balanceDue > 0 ? 'text-destructive font-medium' : ''}>
                    {formatCurrency(balanceDue)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Deposit</dt>
                  <dd>{formatCurrency(contract.depositAmount)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Key Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> Start
                  </dt>
                  <dd>{contract.startDate}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> End
                  </dt>
                  <dd>{contract.endDate}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Next Billing</dt>
                  <dd>{contract.nextBillingDate}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Days Remaining</dt>
                  <dd
                    className={
                      daysRemaining < 0
                        ? 'text-destructive font-medium'
                        : daysRemaining < 14
                          ? 'text-[#f6c000] font-medium'
                          : ''
                    }
                  >
                    {daysRemaining}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
