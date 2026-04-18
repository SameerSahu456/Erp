import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Monitor,
  IndianRupee,
  AlertTriangle,
  Activity,
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import { mockRentalContracts } from '../data/contracts'

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from)
  const b = new Date(to)
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

const TODAY = '2026-04-15'

export default function RentalDashboard() {
  const activeContracts = useMemo(
    () => mockRentalContracts.filter((c) => c.status === 'Active' || c.status === 'Extended'),
    [],
  )

  const overdueContracts = useMemo(
    () => mockRentalContracts.filter((c) => c.status === 'Overdue'),
    [],
  )

  const totalDevicesOnRent = useMemo(
    () =>
      [...activeContracts, ...overdueContracts].reduce(
        (sum, c) => sum + c.devices.filter((d) => !d.returnedDate).length,
        0,
      ),
    [activeContracts, overdueContracts],
  )

  const monthlyRevenue = useMemo(
    () => activeContracts.reduce((sum, c) => sum + c.monthlyRental, 0),
    [activeContracts],
  )

  const overdueDevices = useMemo(() => {
    let count = 0
    for (const c of mockRentalContracts) {
      for (const d of c.devices) {
        if (!d.returnedDate && d.returnDueDate < TODAY) count++
      }
    }
    return count
  }, [])

  const utilizationRate = useMemo(() => {
    const total = mockRentalContracts.reduce((s, c) => s + c.devices.length, 0)
    if (total === 0) return 0
    return Math.round((totalDevicesOnRent / total) * 100)
  }, [totalDevicesOnRent])

  // Contracts expiring within 30 days
  const expiringSoon = useMemo(() => {
    const cutoff = new Date(TODAY)
    cutoff.setDate(cutoff.getDate() + 30)
    const cutoffStr = cutoff.toISOString().split('T')[0]!
    return mockRentalContracts
      .filter(
        (c) =>
          (c.status === 'Active' || c.status === 'Extended') &&
          c.endDate >= TODAY &&
          c.endDate <= cutoffStr,
      )
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
  }, [])

  // Overdue billing entries
  const overduePayments = useMemo(() => {
    const entries: {
      contractNumber: string
      period: string
      amount: number
      dueDate: string
      daysOverdue: number
    }[] = []
    for (const c of mockRentalContracts) {
      for (const b of c.billingHistory) {
        if (b.status === 'Overdue') {
          entries.push({
            contractNumber: c.contractNumber,
            period: b.period,
            amount: b.amount,
            dueDate: b.dueDate,
            daysOverdue: daysBetween(b.dueDate, TODAY),
          })
        }
      }
    }
    return entries.sort((a, b) => b.daysOverdue - a.daysOverdue)
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="cpt-page-title">
        Rental Management
      </h1>

      <StatsRow
        stats={[
          {
            label: 'Active Rentals',
            value: activeContracts.length,
            icon: FileText,
          },
          {
            label: 'Devices on Rent',
            value: totalDevicesOnRent,
            icon: Monitor,
          },
          {
            label: 'Monthly Revenue',
            value: formatCurrency(monthlyRevenue),
            icon: IndianRupee,
          },
          {
            label: 'Overdue Returns',
            value: overdueDevices,
            icon: AlertTriangle,
            className: overdueDevices > 0 ? 'border-destructive/40' : undefined,
          },
          {
            label: 'Utilization Rate',
            value: `${utilizationRate}%`,
            icon: Activity,
          },
        ]}
        className="lg:grid-cols-5"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Contracts Expiring Soon */}
        <Card>
          <CardHeader>
            <CardTitle>Contracts Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contracts expiring in the next 30 days.
              </p>
            ) : (
              expiringSoon.map((c) => {
                const daysRemaining = daysBetween(TODAY, c.endDate)
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <Link
                        to={`/rentals/contracts/${c.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {c.contractNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.devices.length} devices &middot; Ends {c.endDate}
                      </p>
                    </div>
                    <StatusBadge
                      variant={daysRemaining < 7 ? 'error' : 'warning'}
                    >
                      {daysRemaining} days
                    </StatusBadge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Right: Overdue Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {overduePayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No overdue payments.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overduePayments.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {entry.contractNumber}
                        </TableCell>
                        <TableCell>{entry.period}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>{entry.dueDate}</TableCell>
                        <TableCell className="text-right bg-destructive/10 text-destructive font-medium">
                          {entry.daysOverdue}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
