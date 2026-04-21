import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
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
  Plus,
  MapPin,
  Users,
  Briefcase,
  Download,
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
import { Badge } from '@/components/ui/badge'
import { EntityHeader } from '../components/EntityHeader'
import { DetailTabs } from '../components/DetailTabs'
import { NotesSection } from '../components/NotesSection'
import { deals } from '../data/deals'
import { leads } from '../data/leads'
import { accounts } from '../data/accounts'
import { contacts } from '../data/contacts'
import { quotes } from '../data/quotes'
import { invoices } from '../data/invoices'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'
import { materialInquiries } from '../data/material-inquiries'
import { mockComments } from '../data/comments'
import { DEAL_STAGES, type Activity } from '../types'
import { CommentSection } from '../components/CommentSection'
import { TasksSection } from '../components/TasksSection'
import { AuditTrail } from '../components/AuditTrail'
import { LostReasonDialog } from '../components/LostReasonDialog'
import { AddAddressDialog } from '../components/AddAddressDialog'
import type { AccountAddress } from '../types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockTasks } from '../data/tasks'
import { downloadQuotePdf } from '../utils/download-quote-pdf'
import { useAuth } from '@/contexts/AuthContext'

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

function getMIStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Submitted': return 'info'
    case 'Partially Responded': return 'warning'
    case 'Fully Responded': return 'success'
    case 'Closed': return 'neutral'
    default: return 'neutral'
  }
}

const MOCK_MANAGERS: Record<string, { email: string; phone: string; role: string }> = {
  'Amit Patel': { email: 'amit.patel@comprint.in', phone: '+91 98200 11111', role: 'Senior Account Manager' },
  'Sneha Desai': { email: 'sneha.desai@comprint.in', phone: '+91 98200 22222', role: 'Account Manager' },
  'Rahul Verma': { email: 'rahul.verma@comprint.in', phone: '+91 98200 33333', role: 'Account Manager' },
}

const AVATAR_COLORS = [
  'bg-primary/10 text-primary',
  'bg-emerald-500/10 text-emerald-600',
  'bg-amber-500/10 text-amber-600',
  'bg-violet-500/10 text-violet-600',
  'bg-rose-500/10 text-rose-600',
]

function DealDetailPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [lostReason, setLostReason] = useState<{ reason: string; notes: string } | null>(null)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [updatedDealValue, setUpdatedDealValue] = useState<number | null>(null)
  const [addAddressOpen, setAddAddressOpen] = useState(false)
  const [localAddresses, setLocalAddresses] = useState<AccountAddress[]>([])
  const [addressesInitialized, setAddressesInitialized] = useState(false)

  const { user } = useAuth()
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
  const contactSpoc = contacts.find((c) => c.accountId === deal.accountId)
  const parentLead = deal.leadId ? leads.find((l) => l.id === deal.leadId) : undefined

  // Initialize addresses from deal data once
  if (!addressesInitialized && deal.addresses) {
    setLocalAddresses(deal.addresses)
    setAddressesInitialized(true)
  }

  const allAddresses = localAddresses.length > 0 ? localAddresses : (deal.addresses ?? [])

  const activityCount = mockActivities.filter(
    (a) => a.entityType === 'deal' && a.entityId === deal.id
  ).length

  const noteCount = mockNotes.filter(
    (n) => n.entityType === 'deal' && n.entityId === deal.id
  ).length

  // Related quotes and invoices by account
  const relatedQuotes = quotes.filter((q) => q.accountId === deal.accountId)
  const relatedInvoices = invoices.filter((i) => i.accountId === deal.accountId)

  // Material inquiries linked to this deal
  const relatedMIs = materialInquiries.filter((mi) => mi.dealId === deal.id)

  const commentCount = mockComments.filter(
    (c) => c.entityType === 'deal' && c.entityId === deal.id
  ).length

  const taskCount = mockTasks.filter(
    (t) => t.entityType === 'deal' && t.entityId === deal.id
  ).length

  const dealOwners = deal.owners ?? [deal.owner]
  const managerInfo = MOCK_MANAGERS[deal.owner]

  // Stage progress
  const activeStage = currentStage ?? deal.stage
  const pipelineStages = DEAL_STAGES.filter((s) => s !== 'Closed Lost')
  const currentStageIndex = pipelineStages.indexOf(activeStage as typeof pipelineStages[number])
  const isClosedLost = activeStage === 'Closed Lost'

  // Calculated metrics — use updated value from SO if available
  const displayValue = updatedDealValue ?? deal.value
  const activeProbability = activeStage === 'Closed Won' ? 100 : deal.probability
  const expectedRevenue = (displayValue * activeProbability) / 100
  const daysOpen = Math.max(
    0,
    Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  )

  function handleStageChange(newStage: string) {
    if (newStage === 'Closed Won') {
      navigate(`/crm/deals/${dealId}/close-won`)
      return
    }
    if (newStage === 'Closed Lost') {
      setLostReasonOpen(true)
      return
    }
    setCurrentStage(newStage)
    toast.success(`Deal moved to "${newStage}"`)
  }

  function handleDelete() {
    setDeleteDialogOpen(false)
    navigate('/crm/deals')
  }

  const priorityVariant = deal.priority === 'High' ? 'destructive' : deal.priority === 'Medium' ? 'warning' : 'secondary'

  const overviewContent = (
    <div className="space-y-6">
      {/* Categories */}
      {deal.categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">Categories:</span>
          {deal.categories.map((cat) => (
            <Badge key={cat} variant="secondary">{cat}</Badge>
          ))}
        </div>
      )}

      {/* Stage Progress — below categories */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Stage Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {isClosedLost ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge variant="error">Closed Lost</StatusBadge>
                <span className="text-sm text-muted-foreground">This deal has been closed as lost.</span>
              </div>
              {lostReason && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 space-y-1.5">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Lost Reason:</span>{' '}
                    <span className="text-muted-foreground">{lostReason.reason}</span>
                  </p>
                  {lostReason.notes && (
                    <p className="text-sm">
                      <span className="font-medium text-foreground">Notes:</span>{' '}
                      <span className="text-muted-foreground">{lostReason.notes}</span>
                    </p>
                  )}
                </div>
              )}
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

      {/* Description Card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{deal.description}</p>
        </CardContent>
      </Card>

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
              <Briefcase className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Company Size</dt>
                <dd className="text-sm">{deal.companySize ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Employees</dt>
                <dd className="text-sm">{deal.employees?.toLocaleString('en-IN') ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Location</dt>
                <dd className="text-sm">{deal.location ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Type</dt>
                <dd className="text-sm">{deal.customerType ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Stage</dt>
                <dd>
                  <StatusBadge variant={getDealStageVariant(activeStage)}>{activeStage}</StatusBadge>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <IndianRupee className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Value</dt>
                <dd className="text-sm font-medium">{formatCurrency(displayValue)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Probability</dt>
                <dd className="text-sm">{activeProbability}%</dd>
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

  const quotesContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {relatedQuotes.length} quote{relatedQuotes.length !== 1 ? 's' : ''} linked to this deal
        </p>
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/crm/quote-builder?dealId=${deal.id}&accountId=${deal.accountId}`} />}
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          Create Quote
        </Button>
      </div>
      {relatedQuotes.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>
                    <Link to={`/crm/quotes/${quote.id}/edit`} className="text-sm font-medium text-primary hover:underline">
                      {quote.quoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(quote.total)}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getQuoteStatusVariant(quote.status)}>{quote.status}</StatusBadge>
                  </TableCell>
                  <TableCell>{formatDate(quote.validUntil)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => downloadQuotePdf(quote)}
                      title="Download Quote PDF"
                    >
                      <Download className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No quotes linked to this deal</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a quote to start building a proposal.
          </p>
        </div>
      )}
    </div>
  )

  const invoicesContent = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {relatedInvoices.length} invoice{relatedInvoices.length !== 1 ? 's' : ''} linked to this deal
      </p>
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
  )

  const materialInquiriesContent = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/crm/material-inquiries/new?dealId=${deal.id}`} />}
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          Create Material Inquiry
        </Button>
      </div>
      {relatedMIs.length > 0 ? (
        <div className="space-y-3">
          {relatedMIs.map((mi) => {
            const totalItems = mi.items.length
            const totalQty = mi.items.reduce((sum, item) => sum + item.qtyRequested, 0)
            const respondedItems = mi.items.filter((item) =>
              mi.responses.some((r) => r.inquiryItemId === item.id)
            ).length
            return (
              <div
                key={mi.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/crm/material-inquiries/${mi.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {mi.inquiryNumber}
                    </Link>
                    <StatusBadge variant={getMIStatusVariant(mi.status)}>
                      {mi.status}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalItems} item{totalItems !== 1 ? 's' : ''}, {totalQty} units total
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {respondedItems}/{totalItems} responded
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mi.categories.join(', ')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No material inquiries linked to this deal</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create an inquiry to check material availability and pricing.
          </p>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    {
      id: 'quotes',
      label: 'Quotes',
      count: relatedQuotes.length,
      content: quotesContent,
    },
    {
      id: 'invoices',
      label: 'Invoices',
      count: relatedInvoices.length,
      content: invoicesContent,
    },
    {
      id: 'notes',
      label: 'Notes',
      count: noteCount,
      content: <NotesSection entityType="deal" entityId={deal.id} />,
    },
    {
      id: 'material-inquiries',
      label: 'Material Inquiries',
      count: relatedMIs.length,
      content: materialInquiriesContent,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      count: taskCount,
      content: <TasksSection entityType="deal" entityId={deal.id} entityName={`${deal.accountName} — ${deal.name}`} />,
    },
    {
      id: 'comments',
      label: 'Comments',
      count: commentCount,
      content: <CommentSection entityType="deal" entityId={deal.id} />,
    },
    {
      id: 'audit-trail',
      label: 'Audit Trail',
      count: activityCount + (lostReason ? 1 : 0),
      content: <AuditTrail entityType="deal" entityId={deal.id} extraEntries={lostReason ? [{
        id: `lost-${deal.id}`,
        type: 'closed_lost' as Activity['type'],
        title: `Deal marked as Closed Lost`,
        user: user.name,
        timestamp: new Date().toISOString(),
        entityType: 'deal',
        entityId: deal.id,
        metadata: { reason: lostReason.reason, notes: lostReason.notes },
      }] : []} />,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={deal.name}
        subtitle={deal.accountName}
        status={{ label: activeStage, variant: getDealStageVariant(activeStage) }}
        badges={deal.priority ? (
          <Badge variant={priorityVariant} className="uppercase text-[10px] tracking-wider">
            {deal.priority} Priority
          </Badge>
        ) : undefined}
        owners={dealOwners.map((name, i) => ({ name, role: i === 0 ? 'Primary Owner' : 'Co-Owner' }))}
        backHref="/crm/deals"
        actions={
          <>
            {/* Stage Update */}
            {activeStage !== 'Closed Won' && activeStage !== 'Closed Lost' && (
              <Select value={activeStage} onValueChange={handleStageChange}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Move stage" />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
          {/* Account Team Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                Account Team
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {dealOwners.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dealOwners.map((ownerName, idx) => {
                  const info = MOCK_MANAGERS[ownerName]
                  const isPrimary = idx === 0
                  return (
                    <div key={ownerName} className={cn('flex items-start gap-3', idx > 0 && 'border-t pt-3')}>
                      <div
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                          AVATAR_COLORS[idx % AVATAR_COLORS.length]
                        )}
                      >
                        {ownerName.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{ownerName}</p>
                          {isPrimary && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                              Primary
                            </span>
                          )}
                        </div>
                        {info && (
                          <>
                            <p className="text-xs text-muted-foreground">{info.role}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="size-3 shrink-0" />
                              <span className="truncate">{info.email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="size-3 shrink-0" />
                              <span>{info.phone}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Pre-Sales Manager */}
              {deal.presalesManager && (
                <div className="border-t border-border/50 pt-3 mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pre-Sales Manager</p>
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {deal.presalesManager.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <p className="text-sm text-muted-foreground">{deal.presalesManager}</p>
                  </div>
                </div>
              )}
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
                  <dd className="text-sm font-medium">{formatCurrency(displayValue)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Probability</dt>
                  <dd className="text-sm">{activeProbability}%</dd>
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
                {contactSpoc && (
                  <div className="mt-4 border-t border-border/50 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contact SPOC</p>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">{contactSpoc.name}</p>
                      <p className="text-xs text-muted-foreground">{contactSpoc.designation}</p>
                      <p className="text-xs text-muted-foreground">{contactSpoc.email}</p>
                      <p className="text-xs text-muted-foreground">{contactSpoc.phone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Addresses Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" />
                Addresses
                {allAddresses.length > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {allAddresses.length}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  onClick={() => setAddAddressOpen(true)}
                >
                  <Plus className="size-3 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allAddresses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No addresses yet. Add from account or enter manually.
                </p>
              ) : (
                <div className="space-y-3">
                  {allAddresses.map((addr, idx) => (
                    <div key={addr.id} className={cn('space-y-1', idx > 0 && 'border-t pt-3')}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{addr.label}</span>
                        <Badge variant="outline" className="text-[10px]">{addr.type}</Badge>
                        {addr.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{addr.line1}</p>
                      {addr.line2 && <p className="text-xs text-muted-foreground">{addr.line2}</p>}
                      <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={lostReasonOpen}
        onOpenChange={setLostReasonOpen}
        entityType="deal"
        entityName={deal.name}
        onConfirm={(reason, notes) => {
          setLostReasonOpen(false)
          setLostReason({ reason, notes })
          setCurrentStage('Closed Lost')
          toast.success(`Deal "${deal.name}" marked as lost — ${reason}`)
        }}
      />

      {/* Add Address Dialog — pick from account or enter manually */}
      <AddAddressDialog
        open={addAddressOpen}
        onOpenChange={setAddAddressOpen}
        accountAddresses={account?.addresses}
        existingIds={allAddresses.map((a) => a.id)}
        onAdd={(addr) => {
          setLocalAddresses((prev) => [...prev, addr])
          toast.success(`Address "${addr.label}" added`)
        }}
      />
    </div>
  )
}

export { DealDetailPage }

export default DealDetailPage
