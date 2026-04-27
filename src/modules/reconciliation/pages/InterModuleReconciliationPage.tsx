import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/page'
import { CheckCircle, AlertTriangle, FileText, Inbox } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { formatINR as formatCurrency } from '@/lib/currency'

type MatchStatus = 'Full Match' | 'Partial Match' | 'Mismatch' | 'Pending GRN' | 'Pending Invoice'

function getMatchStatusVariant(status: MatchStatus): StatusBadgeVariant {
  switch (status) {
    case 'Full Match': return 'success'
    case 'Partial Match': return 'warning'
    case 'Mismatch': return 'error'
    case 'Pending GRN': return 'info'
    case 'Pending Invoice': return 'info'
    default: return 'neutral'
  }
}

interface ThreeWayMatch {
  id: string
  poNumber: string
  vendor: string
  poAmount: number
  grnAmount: number | null
  invoiceAmount: number | null
  matchStatus: MatchStatus
}

const threeWayMatches: ThreeWayMatch[] = [
  {
    id: 'TWM-001',
    poNumber: 'PO-2026-001',
    vendor: 'Dell India Pvt Ltd',
    poAmount: 11357500,
    grnAmount: 11357500,
    invoiceAmount: 11357500,
    matchStatus: 'Full Match',
  },
  {
    id: 'TWM-002',
    poNumber: 'PO-2026-002',
    vendor: 'HP India Sales Pvt Ltd',
    poAmount: 23718000,
    grnAmount: 23718000,
    invoiceAmount: 23718000,
    matchStatus: 'Full Match',
  },
  {
    id: 'TWM-003',
    poNumber: 'PO-2026-003',
    vendor: 'Cisco Systems India Pvt Ltd',
    poAmount: 2773000,
    grnAmount: 2773000,
    invoiceAmount: 2773000,
    matchStatus: 'Full Match',
  },
  {
    id: 'TWM-004',
    poNumber: 'PO-2026-006',
    vendor: 'APC by Schneider Electric India',
    poAmount: 1351100,
    grnAmount: 1351100,
    invoiceAmount: 1351100,
    matchStatus: 'Full Match',
  },
  {
    id: 'TWM-005',
    poNumber: 'PO-2026-007',
    vendor: 'D-Link India Ltd',
    poAmount: 619500,
    grnAmount: 619500,
    invoiceAmount: 660800,
    matchStatus: 'Mismatch',
  },
  {
    id: 'TWM-006',
    poNumber: 'PO-2026-008',
    vendor: 'Synology Asia Pacific',
    poAmount: 731600,
    grnAmount: 731600,
    invoiceAmount: null,
    matchStatus: 'Pending Invoice',
  },
  {
    id: 'TWM-007',
    poNumber: 'PO-2026-009',
    vendor: 'Fortinet India Pvt Ltd',
    poAmount: 5106000,
    grnAmount: null,
    invoiceAmount: null,
    matchStatus: 'Pending GRN',
  },
]

const fullMatches = threeWayMatches.filter((m) => m.matchStatus === 'Full Match').length
const mismatches = threeWayMatches.filter((m) => m.matchStatus === 'Mismatch').length
const pending = threeWayMatches.filter(
  (m) => m.matchStatus === 'Pending GRN' || m.matchStatus === 'Pending Invoice'
).length

function InterModuleReconciliationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="PO / GRN / Invoice Matching"
        subtitle="Three-way matching across purchase orders, goods receipts, and invoices."
        breadcrumbs={[{ label: 'Reconciliation' }, { label: 'Three-Way Match' }]}
      />

      <StatsRow
        stats={[
          { label: 'Total Entries', value: threeWayMatches.length, icon: FileText },
          { label: 'Full Match', value: fullMatches, icon: CheckCircle },
          { label: 'Mismatches', value: mismatches, icon: AlertTriangle },
          { label: 'Pending', value: pending, icon: FileText },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Three-Way Matching: PO vs GRN vs Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO#</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">PO Amount</TableHead>
                  <TableHead className="text-right">GRN Amount</TableHead>
                  <TableHead className="text-right">Invoice Amount</TableHead>
                  <TableHead>Match Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {threeWayMatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={Inbox}
                        title="No PO entries to match"
                        description="Once purchase orders are received, the GRN and invoice three-way match will appear here."
                      />
                    </TableCell>
                  </TableRow>
                )}
                {threeWayMatches.map((match) => {
                  const isMismatch = match.matchStatus === 'Mismatch'
                  return (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">{match.poNumber}</TableCell>
                      <TableCell>{match.vendor}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(match.poAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {match.grnAmount != null ? formatCurrency(match.grnAmount) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          isMismatch && 'bg-destructive/10 text-destructive font-medium'
                        )}
                      >
                        {match.invoiceAmount != null ? formatCurrency(match.invoiceAmount) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={getMatchStatusVariant(match.matchStatus)}>
                          {match.matchStatus}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InterModuleReconciliationPage
