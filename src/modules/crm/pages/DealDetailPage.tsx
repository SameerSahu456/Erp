import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Pencil,
  Trash2,
  Building2,
  IndianRupee,
  CalendarDays,
  Mail,
  Phone,
  TrendingUp,
  Target,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EntityHeader } from '../components/EntityHeader'
import { DetailTabs } from '../components/DetailTabs'
import { ActivityFeed } from '../components/ActivityFeed'
import { NotesSection } from '../components/NotesSection'
import { deals } from '../data/deals'
import { accounts } from '../data/accounts'
import { quotes } from '../data/quotes'
import { invoices } from '../data/invoices'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'
import { DEAL_STAGES } from '../types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getDealStageVariant(stage: string): StatusBadgeVariant {
  switch (stage) {
    case 'Closed Won':
      return 'success'
    case 'Closed Lost':
      return 'error'
    case 'Negotiation':
      return 'warning'
    default:
      return 'info'
  }
}

function getQuoteStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft':
      return 'neutral'
    case 'Sent':
      return 'info'
    case 'Accepted':
      return 'success'
    case 'Rejected':
      return 'error'
    case 'Expired':
      return 'warning'
    default:
      return 'neutral'
  }
}

function getInvoiceStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft':
      return 'neutral'
    case 'Sent':
      return 'info'
    case 'Partially Paid':
      return 'warning'
    case 'Paid':
      return 'success'
    case 'Overdue':
      return 'error'
    case 'Void':
      return 'error'
    default:
      return 'neutral'
  }
}

const MOCK_MANAGERS: Record<string, { email: string; phone: string; role: string }> = {
  'Amit Patel': { email: 'amit.patel@comprint.in', phone: '+91 98200 11111', role: 'Senior Account Manager' },
  'Sneha Desai': { email: 'sneha.desai@comprint.in', phone: '+91 98200 22222', role: 'Account Manager' },
  'Rahul Verma': { email: 'rahul.verma@comprint.in', phone: '+91 98200 33333', role: 'Account Manager' },
}

function DealDetailPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const deal = deals.find((d) => d.id === dealId)

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">Deal not found</h2>
        <p className="text-sm text-muted-foreground">
          The deal you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" render={<Link to="/crm/deals" />}>
          Back to Deals
        </Button>
      </div>
    )
  }

  const account = accounts.find((a) => a.id === deal.accountId)

  const activityCount = mockActivities.filter(
    (a) => a.entityType === 'deal' && a.entityId === deal.id
  ).length

  const noteCount = mockNotes.filter(
    (n) => n.entityType === 'deal' && n.entityId === deal.id
  ).length

  // Related quotes and invoices by account
  const relatedQuotes = quotes.filter((q) => q.accountId === deal.accountId)
  const relatedInvoices = invoices.filter((i) => i.accountId === deal.accountId)

  const managerInfo = MOCK_MANAGERS[deal.owner]

  // Stage progress
  const pipelineStages = DEAL_STAGES.filter((s) => s !== 'Closed Lost')
  const currentStageIndex = pipelineStages.indexOf(deal.stage as typeof pipelineStages[number])
  const isClosedLost = deal.stage === 'Closed Lost'

  // Calculated metrics
  const expectedRevenue = (deal.value * deal.probability) / 100
  const daysOpen = Math.max(
    0,
    Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  )

  function handleDelete() {
    setDeleteDialogOpen(false)
    navigate('/crm/deals')
  }

  const overviewContent = (
    <div className="space-y-6">
      {/* Deal Info Card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Deal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Account</dt>
                <dd className="text-sm">
                  <Link
                    to={`/crm/accounts/${deal.accountId}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {deal.accountName}
                  </Link>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Stage</dt>
                <dd>
                  <StatusBadge variant={getDealStageVariant(deal.stage)}>{deal.stage}</StatusBadge>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <IndianRupee className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Value</dt>
                <dd className="text-sm font-medium">{formatCurrency(deal.value)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Probability</dt>
                <dd className="text-sm">{deal.probability}%</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Close Date</dt>
                <dd className="text-sm">{formatDate(deal.closeDate)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Created</dt>
                <dd className="text-sm">{formatDate(deal.createdAt)}</dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Stage Progress */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Stage Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {isClosedLost ? (
            <div className="flex items-center gap-2">
              <StatusBadge variant="error">Closed Lost</StatusBadge>
              <span className="text-sm text-muted-foreground">This deal has been closed as lost.</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {pipelineStages.map((stage, index) => {
                const isActive = index === currentStageIndex
                const isCompleted = index < currentStageIndex
                return (
                  <div key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'h-2 w-full rounded-full transition-colors',
                        isCompleted && 'bg-primary',
                        isActive && 'bg-primary',
                        !isCompleted && !isActive && 'bg-muted'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-ui leading-tight',
                        isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {stage}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Expected Revenue</dt>
              <dd className="mt-1 text-lg font-semibold">{formatCurrency(expectedRevenue)}</dd>
              <p className="text-[10px] text-muted-foreground">Value x Probability</p>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Days Open</dt>
              <dd className="mt-1 text-lg font-semibold">{daysOpen}</dd>
              <p className="text-[10px] text-muted-foreground">Since creation</p>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )

  const relatedContent = (
    <div className="space-y-6">
      {/* Linked Quotes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Linked Quotes</h3>
        {relatedQuotes.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell className="text-right">{formatCurrency(quote.total)}</TableCell>
                    <TableCell>
                      <StatusBadge variant={getQuoteStatusVariant(quote.status)}>{quote.status}</StatusBadge>
                    </TableCell>
                    <TableCell>{formatDate(quote.validUntil)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">No quotes linked to this deal</p>
          </div>
        )}
      </div>

      {/* Linked Invoices */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Linked Invoices</h3>
        {relatedInvoices.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge variant={getInvoiceStatusVariant(invoice.status)}>
                        {invoice.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className={cn(invoice.status === 'Overdue' && 'text-destructive')}>
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">No invoices linked to this deal</p>
          </div>
        )}
      </div>
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    {
      id: 'activities',
      label: 'Activities',
      count: activityCount,
      content: <ActivityFeed entityType="deal" entityId={deal.id} />,
    },
    {
      id: 'notes',
      label: 'Notes',
      count: noteCount,
      content: <NotesSection entityType="deal" entityId={deal.id} />,
    },
    {
      id: 'related',
      label: 'Related',
      count: relatedQuotes.length + relatedInvoices.length,
      content: relatedContent,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={deal.name}
        subtitle={deal.accountName}
        status={{ label: deal.stage, variant: getDealStageVariant(deal.stage) }}
        owner={{ name: deal.owner, role: 'Account Manager' }}
        backHref="/crm/deals"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link to={`/crm/deals/${deal.id}/edit`} />}
            >
              <Pencil className="size-3.5" data-icon="inline-start" />
              Edit
            </Button>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2 className="size-3.5" data-icon="inline-start" />
                Delete
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete Deal</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{deal.name}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - 2/3 */}
        <div className="lg:col-span-2">
          <DetailTabs tabs={tabs} defaultTab="overview" />
        </div>

        {/* Right column - 1/3 */}
        <div className="space-y-4">
          {/* Account Manager Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Account Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {deal.owner
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{deal.owner}</p>
                  {managerInfo && (
                    <>
                      <p className="text-xs text-muted-foreground">{managerInfo.role}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="size-3" />
                        <span>{managerInfo.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" />
                        <span>{managerInfo.phone}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deal Summary Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Deal Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Value</dt>
                  <dd className="text-sm font-medium">{formatCurrency(deal.value)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Probability</dt>
                  <dd className="text-sm">{deal.probability}%</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Expected Close</dt>
                  <dd className="text-sm">{formatDate(deal.closeDate)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Days Open</dt>
                  <dd className="text-sm">{daysOpen}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Account Info Card */}
          {account && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Account Info</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Account</dt>
                    <dd className="text-sm">
                      <Link
                        to={`/crm/accounts/${account.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {account.name}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Industry</dt>
                    <dd className="text-sm">{account.industry}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Type</dt>
                    <dd className="text-sm">{account.type}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export { DealDetailPage }

export default DealDetailPage
