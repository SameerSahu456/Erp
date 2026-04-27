import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Pencil, Trash2, Mail, Phone, Building2, Globe, IndianRupee, CalendarDays, Plus, XCircle, RotateCcw, MapPin, Users, Briefcase, Download, AlertTriangle } from 'lucide-react'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EntityHeader } from '../components/EntityHeader'
import { DetailTabs } from '../components/DetailTabs'
import { NotesSection } from '../components/NotesSection'
import { leads } from '../data/leads'
import { quotes } from '../data/quotes'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'
import { materialInquiries } from '../data/material-inquiries'
import { mockComments } from '../data/comments'
import { LEAD_STAGES, type Activity } from '../types'
import { CommentSection } from '../components/CommentSection'
import { TasksSection } from '../components/TasksSection'
import { AuditTrail } from '../components/AuditTrail'
import { LostReasonDialog } from '../components/LostReasonDialog'
import { AddAddressDialog } from '../components/AddAddressDialog'
import type { AccountAddress } from '../types'
import { mockTasks } from '../data/tasks'
import { downloadQuotePdf } from '../utils/download-quote-pdf'
import { useAuth } from '@/contexts/AuthContext'
import { canReinstateLead } from '@/modules/crm/crm-roles'

const REJECTION_REASONS = [
  'Budget below threshold',
  'Consumer segment — not enterprise',
  'Duplicate lead',
  'Non-standard configuration',
  'Not a genuine enquiry',
  'Competitor relationship',
  'Outside service area',
  'Unresponsive / No engagement',
  'Other',
] as const

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStageVariant(stage: string): StatusBadgeVariant {
  switch (stage) {
    case 'New':
      return 'info'
    case 'Contacted':
      return 'info'
    case 'Qualified':
      return 'warning'
    case 'Proposal':
      return 'warning'
    case 'Negotiation':
      return 'warning'
    case 'Closed Won':
      return 'success'
    case 'Closed Lost':
      return 'error'
    case 'Rejected':
      return 'error'
    default:
      return 'neutral'
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

// Mock staff info
const MOCK_STAFF: Record<string, { email: string; phone: string }> = {
  'Amit Patel': { email: 'amit.patel@comprint.in', phone: '+91 98200 11111' },
  'Sneha Desai': { email: 'sneha.desai@comprint.in', phone: '+91 98200 22222' },
  'Rahul Verma': { email: 'rahul.verma@comprint.in', phone: '+91 98200 33333' },
  'Deepak Gupta': { email: 'deepak.gupta@comprint.in', phone: '+91 98200 44444' },
  'Kiran Mehta': { email: 'kiran.mehta@comprint.in', phone: '+91 98200 55555' },
}

const PRE_QUALIFIED_STAGES = ['New', 'Contacted']

function LeadDetailPage() {
  const { id: leadId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false)
  const [reinstateNote, setReinstateNote] = useState('')
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [lostReason, setLostReason] = useState<{ reason: string; notes: string } | null>(null)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [addAddressOpen, setAddAddressOpen] = useState(false)
  const [localAddresses, setLocalAddresses] = useState<AccountAddress[]>([])
  const [addressesInitialized, setAddressesInitialized] = useState(false)
  const [showAllAddresses, setShowAllAddresses] = useState(false)
  const { user } = useAuth()
  const userCanReinstate = canReinstateLead(user.role)

  const lead = leads.find((l) => l.id === leadId)

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">Lead not found</h2>
        <p className="text-sm text-muted-foreground">
          The lead you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" render={<Link to="/crm/leads" />}>
          Back to Leads
        </Button>
      </div>
    )
  }

  // Initialize addresses from lead data once
  if (!addressesInitialized && lead.addresses) {
    setLocalAddresses(lead.addresses)
    setAddressesInitialized(true)
  }

  const allAddresses = localAddresses.length > 0 ? localAddresses : (lead.addresses ?? [])

  const activityCount = mockActivities.filter(
    (a) => a.entityType === 'lead' && a.entityId === lead.id
  ).length

  const noteCount = mockNotes.filter(
    (n) => n.entityType === 'lead' && n.entityId === lead.id
  ).length

  // Match quotes by leadId
  const relatedQuotes = quotes.filter(
    (q) => q.leadId === lead.id
  )


  // Material inquiries linked to this lead
  const relatedMIs = materialInquiries.filter((mi) => mi.leadId === lead.id)

  const commentCount = mockComments.filter(
    (c) => c.entityType === 'lead' && c.entityId === lead.id
  ).length

  const taskCount = mockTasks.filter(
    (t) => t.entityType === 'lead' && t.entityId === lead.id
  ).length


  const isPreQualified = PRE_QUALIFIED_STAGES.includes(lead.stage)
  const displayOwnerName = isPreQualified ? lead.bde : (lead.accountOwner ?? lead.owner)
  const displayOwnerRole = isPreQualified ? 'BDE' : 'Account Owner'
  const ownerInfo = MOCK_STAFF[displayOwnerName]

  // Pipeline stages (exclude Closed Lost for visual pipeline)
  const activeStage = currentStage ?? lead.stage
  const pipelineStages = LEAD_STAGES.filter((s) => s !== 'Closed Lost')
  const currentStageIndex = pipelineStages.indexOf(activeStage as typeof pipelineStages[number])
  const isLost = activeStage === 'Closed Lost'
  const isRejected = activeStage === 'Rejected'

  function handleDelete() {
    setDeleteDialogOpen(false)
    navigate('/crm/leads')
  }

  function handleReject() {
    // In real app: API call to update lead stage + create activity
    toast.success(`Lead "${lead.name}" rejected — ${rejectionReason}`)
    setRejectDialogOpen(false)
    setRejectionReason('')
    setRejectionNotes('')
    navigate('/crm/leads')
  }

  function handleReinstate() {
    setReinstateDialogOpen(false)
    setReinstateNote('')
    navigate('/crm/leads')
  }

  function handleStageChange(newStage: string) {
    if (newStage === 'Closed Won') {
      navigate(`/crm/leads/${leadId}/close-won?type=lead`)
      return
    }
    if (newStage === 'Closed Lost') {
      setLostReasonOpen(true)
      return
    }
    setCurrentStage(newStage)
    toast.success(`Lead moved to "${newStage}"`)
  }

  const priorityVariant = lead.priority === 'High' ? 'destructive' : lead.priority === 'Medium' ? 'warning' : 'secondary'

  const overviewContent = (
    <div className="space-y-6">
      {/* Categories */}
      {lead.categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">Categories:</span>
          {lead.categories.map((cat) => (
            <Badge key={cat} variant="secondary">{cat}</Badge>
          ))}
        </div>
      )}

      {/* Stage Progress — below categories */}
      <Card size="sm" className="data-[size=sm]:py-3 data-[size=sm]:gap-2">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Stage Progress
            </p>
            {!isLost && !isRejected && (
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                {Math.max(currentStageIndex + 1, 1)} / {pipelineStages.length}
              </span>
            )}
          </div>
          {isLost ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge variant="error">Closed Lost</StatusBadge>
                <span className="text-sm text-muted-foreground">This lead has been marked as lost.</span>
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
          ) : isRejected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge variant="error">Rejected</StatusBadge>
                <span className="text-sm text-muted-foreground">This lead has been rejected.</span>
              </div>
              {lead.rejectionReason && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 space-y-1.5">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Reason:</span>{' '}
                    <span className="text-muted-foreground">{lead.rejectionReason}</span>
                  </p>
                  {lead.rejectionNotes && (
                    <p className="text-sm">
                      <span className="font-medium text-foreground">Notes:</span>{' '}
                      <span className="text-muted-foreground">{lead.rejectionNotes}</span>
                    </p>
                  )}
                  {lead.rejectedBy && lead.rejectedAt && (
                    <p className="text-xs text-muted-foreground pt-1 border-t border-destructive/10">
                      By {lead.rejectedBy} on {formatDate(lead.rejectedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-stretch gap-1">
              {pipelineStages.map((stage, index) => {
                const isActive = index === currentStageIndex
                const isCompleted = index < currentStageIndex
                return (
                  <div key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'h-[3px] w-full rounded-full transition-all',
                        isCompleted && 'bg-status-success-text',
                        isActive && 'bg-status-success-text shadow-[0_0_0_2px_rgba(6,118,71,0.18)]',
                        !isCompleted && !isActive && 'bg-muted'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-ui leading-tight',
                        isActive
                          ? 'font-semibold text-status-success-text'
                          : isCompleted
                            ? 'text-foreground/80'
                            : 'text-muted-foreground'
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

      {/* Lead Info Card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {[
              { icon: Building2, label: 'Company', value: lead.company },
              { icon: Briefcase, label: 'Company Size', value: lead.companySize ?? '—' },
              { icon: Users, label: 'Employees', value: lead.employees?.toLocaleString('en-IN') ?? '—' },
              { icon: MapPin, label: 'Location', value: lead.location ?? '—' },
              { icon: Building2, label: 'Type', value: lead.customerType ?? '—' },
              { icon: Mail, label: 'Email', value: lead.email },
              { icon: Phone, label: 'Phone', value: lead.phone },
              { icon: Globe, label: 'Source', value: lead.source },
              {
                icon: IndianRupee,
                label: 'Value',
                value: formatCurrency(lead.value),
                emphasis: true,
              },
              { icon: CalendarDays, label: 'Created', value: formatDate(lead.createdAt) },
            ].map(({ icon: Icon, label, value, emphasis }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                  <Icon className="size-3.5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd
                    className={cn(
                      'mt-0.5 truncate text-[13px] text-foreground',
                      emphasis && 'font-semibold tabular-nums'
                    )}
                  >
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Description Card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{lead.description}</p>
        </CardContent>
      </Card>

      {/* Notes from lead data */}
      {lead.notes && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Quick Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{lead.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const quotesContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {relatedQuotes.length} quote{relatedQuotes.length !== 1 ? 's' : ''} linked to this lead
        </p>
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/crm/quotes/new?leadId=${lead.id}`} />}
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
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Plus className="size-4" />
          </div>
          <p className="text-[13px] font-medium text-foreground">No quotes linked to this lead</p>
          <p className="text-xs text-muted-foreground">
            Create a quote to start building a proposal.
          </p>
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
          render={<Link to={`/crm/material-inquiries/new?leadId=${lead.id}`} />}
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
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Plus className="size-4" />
          </div>
          <p className="text-[13px] font-medium text-foreground">
            No material inquiries linked to this lead
          </p>
          <p className="text-xs text-muted-foreground">
            Create an inquiry to check material availability and pricing.
          </p>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    {
      id: 'notes',
      label: 'Notes',
      count: noteCount,
      content: <NotesSection entityType="lead" entityId={lead.id} />,
    },
    {
      id: 'quotes',
      label: 'Quotes',
      count: relatedQuotes.length,
      content: quotesContent,
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
      content: <TasksSection entityType="lead" entityId={lead.id} entityName={`${lead.name} — ${lead.company}`} />,
    },
    {
      id: 'comments',
      label: 'Comments',
      count: commentCount,
      content: <CommentSection entityType="lead" entityId={lead.id} />,
    },
    {
      id: 'audit-trail',
      label: 'Audit Trail',
      count: activityCount + (lostReason ? 1 : 0),
      content: <AuditTrail entityType="lead" entityId={lead.id} extraEntries={lostReason ? [{
        id: `lost-${lead.id}`,
        type: 'closed_lost' as Activity['type'],
        title: `Lead marked as Closed Lost`,
        user: user.name,
        timestamp: new Date().toISOString(),
        entityType: 'lead',
        entityId: lead.id,
        metadata: { reason: lostReason.reason, notes: lostReason.notes },
      }] : []} />,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        sticky
        title={lead.company}
        subtitle={lead.name}
        status={{ label: activeStage, variant: getStageVariant(activeStage) }}
        badges={
          <Badge variant={priorityVariant} className="uppercase text-[10px] tracking-wider">
            {lead.priority} Priority
          </Badge>
        }
        backHref="/crm/leads"
        actions={
          <>
            {/* Stage Update */}
            {!isRejected && activeStage !== 'Closed Won' && activeStage !== 'Closed Lost' && (
              <Select value={activeStage} onValueChange={handleStageChange}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Move stage" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              render={<Link to={`/crm/leads/${lead.id}/edit`} />}
            >
              <Pencil className="size-3.5" data-icon="inline-start" />
              Edit
            </Button>

            {/* Reject — only for New/Contacted leads */}
            {(lead.stage === 'New' || lead.stage === 'Contacted') && (
              <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
                setRejectDialogOpen(open)
                if (!open) { setRejectionReason(''); setRejectionNotes('') }
              }}>
                <DialogTrigger render={<Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10" />}>
                  <XCircle className="size-3.5" data-icon="inline-start" />
                  Reject
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader className="items-center text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
                      <AlertTriangle className="size-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-lg">Reject Lead</DialogTitle>
                    <DialogDescription>
                      Mark <span className="font-medium text-foreground">"{lead.name}"</span> as rejected.
                      This will move the lead out of the active pipeline.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Rejection Reason <span className="text-destructive">*</span>
                      </Label>
                      <Select value={rejectionReason} onValueChange={setRejectionReason}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent align="start" sideOffset={4}>
                          {REJECTION_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Additional Notes</Label>
                      <Textarea
                        value={rejectionNotes}
                        onChange={(e) => setRejectionNotes(e.target.value)}
                        placeholder="Any additional context about why this lead is being rejected..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectionReason(''); setRejectionNotes('') }}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={!rejectionReason}
                    >
                      <XCircle className="size-3.5" data-icon="inline-start" />
                      Reject Lead
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Reinstate — only for Rejected leads, manager roles only */}
            {lead.stage === 'Rejected' && userCanReinstate && (
              <Dialog open={reinstateDialogOpen} onOpenChange={setReinstateDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>
                  <RotateCcw className="size-3.5" data-icon="inline-start" />
                  Move to Qualified
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reinstate Lead</DialogTitle>
                    <DialogDescription>
                      Move "{lead.name}" back to the Qualified stage. This will return the lead to the active pipeline.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="reinstate-note">Note (optional)</Label>
                    <Textarea
                      id="reinstate-note"
                      placeholder="Why is this lead being reinstated?"
                      value={reinstateNote}
                      onChange={(e) => setReinstateNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setReinstateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleReinstate}>
                      Move to Qualified
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2 className="size-3.5" data-icon="inline-start" />
                Delete
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete Lead</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{lead.name}"? This action cannot be undone.
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
          <DetailTabs cardContent tabs={tabs} defaultTab="overview" />
        </div>

        {/* Right column - 1/3 */}
        <div className="space-y-4 lg:mt-14">
          {/* BDE / Account Owner Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Account Owners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {/* Primary Owner (BDE for pre-qualified, Account Owner otherwise) */}
                <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-2 transition-colors hover:bg-muted/60">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                    {displayOwnerName.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-xs font-medium">{displayOwnerName}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{displayOwnerRole}</p>
                    {ownerInfo && (
                      <>
                        <p className="truncate text-[10px] text-muted-foreground">{ownerInfo.email}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{ownerInfo.phone}</p>
                      </>
                    )}
                  </div>
                </div>
                {/* BDE (Original) — shown for qualified+ leads */}
                {!isPreQualified && lead.bde && (
                  <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-2 transition-colors hover:bg-muted/60">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                      {lead.bde.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-xs font-medium">{lead.bde}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">BDE (Original)</p>
                    </div>
                  </div>
                )}
                {/* Pre-Sales Manager */}
                {lead.presalesManager && (
                  <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-2 transition-colors hover:bg-muted/60">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                      {lead.presalesManager.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-xs font-medium">{lead.presalesManager}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pre-Sales Mgr</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Show "Assigned at Qualified" hint for pre-qualified leads */}
              {isPreQualified && (
                <p className="text-xs italic text-muted-foreground/60">Account Owner assigned at Qualified stage</p>
              )}
            </CardContent>
          </Card>

          {/* Addresses Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" />
                Addresses
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
                  No addresses yet. Add one to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {(showAllAddresses ? allAddresses : allAddresses.slice(0, 2)).map((addr, idx) => (
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
                  {allAddresses.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setShowAllAddresses((v) => !v)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {showAllAddresses ? 'Show less' : `Show more (${allAddresses.length - 2})`}
                    </button>
                  )}
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
        entityType="lead"
        entityName={lead.name}
        onConfirm={(reason, notes) => {
          setLostReasonOpen(false)
          setLostReason({ reason, notes })
          setCurrentStage('Closed Lost')
          toast.success(`Lead "${lead.name}" marked as lost — ${reason}`)
        }}
      />

      {/* Add Address Dialog — manual entry only (no account yet) */}
      <AddAddressDialog
        open={addAddressOpen}
        onOpenChange={setAddAddressOpen}
        onAdd={(addr) => {
          setLocalAddresses((prev) => [...prev, addr])
          toast.success(`Address "${addr.label}" added`)
        }}
      />
    </div>
  )
}

export { LeadDetailPage }

export default LeadDetailPage
