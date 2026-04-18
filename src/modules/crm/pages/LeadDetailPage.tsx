import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Pencil, Trash2, Mail, Phone, Building2, Globe, IndianRupee, CalendarDays, Plus, XCircle, RotateCcw, MapPin, Users, Briefcase, Download } from 'lucide-react'

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
import { EntityHeader } from '../components/EntityHeader'
import { DetailTabs } from '../components/DetailTabs'
import { NotesSection } from '../components/NotesSection'
import { leads } from '../data/leads'
import { quotes } from '../data/quotes'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'
import { materialInquiries } from '../data/material-inquiries'
import { mockComments } from '../data/comments'
import { LEAD_STAGES } from '../types'
import { CommentSection } from '../components/CommentSection'
import { TasksSection } from '../components/TasksSection'
import { AuditTrail } from '../components/AuditTrail'
import { ClosedWonWizardDialog } from '../components/ClosedWonWizardDialog'
import { LostReasonDialog } from '../components/LostReasonDialog'
import { mockTasks } from '../data/tasks'
import { downloadQuotePdf } from '../utils/download-quote-pdf'
import { useAuth } from '@/contexts/AuthContext'
import { canReinstateLead } from '@/modules/crm/crm-roles'

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
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false)
  const [reinstateNote, setReinstateNote] = useState('')
  const [closedWonWizardOpen, setClosedWonWizardOpen] = useState(false)
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
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
    setRejectDialogOpen(false)
    setRejectionReason('')
    navigate('/crm/leads')
  }

  function handleReinstate() {
    setReinstateDialogOpen(false)
    setReinstateNote('')
    navigate('/crm/leads')
  }

  function handleStageChange(newStage: string) {
    if (newStage === 'Closed Won') {
      setClosedWonWizardOpen(true)
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
      <Card size="sm">
        <CardHeader>
          <CardTitle>Stage Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {isLost ? (
            <div className="flex items-center gap-2">
              <StatusBadge variant="error">Lost</StatusBadge>
              <span className="text-sm text-muted-foreground">This lead has been marked as lost.</span>
            </div>
          ) : isRejected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusBadge variant="error">Rejected</StatusBadge>
                <span className="text-sm text-muted-foreground">This lead has been rejected.</span>
              </div>
              {lead.rejectionReason && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Reason:</span> {lead.rejectionReason}
                </p>
              )}
              {lead.rejectedBy && lead.rejectedAt && (
                <p className="text-xs text-muted-foreground">
                  By {lead.rejectedBy} on {formatDate(lead.rejectedAt)}
                </p>
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
          <p className="text-sm text-muted-foreground">{lead.description}</p>
        </CardContent>
      </Card>

      {/* Lead Info Card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Company</dt>
                <dd className="text-sm">{lead.company}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Briefcase className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Company Size</dt>
                <dd className="text-sm">{lead.companySize ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Employees</dt>
                <dd className="text-sm">{lead.employees?.toLocaleString('en-IN') ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Location</dt>
                <dd className="text-sm">{lead.location ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Type</dt>
                <dd className="text-sm">{lead.customerType ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Email</dt>
                <dd className="text-sm">{lead.email}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Phone</dt>
                <dd className="text-sm">{lead.phone}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Source</dt>
                <dd className="text-sm">{lead.source}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <IndianRupee className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Value</dt>
                <dd className="text-sm font-medium">{formatCurrency(lead.value)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Created</dt>
                <dd className="text-sm">{formatDate(lead.createdAt)}</dd>
              </div>
            </div>
          </dl>
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
      <div className="flex justify-end">
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
        <div className="space-y-3">
          {relatedQuotes.map((quote) => (
            <div
              key={quote.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link to={`/crm/quotes/${quote.id}/edit`} className="text-sm font-medium text-primary hover:underline">
                    {quote.quoteNumber}
                  </Link>
                  <StatusBadge variant={getQuoteStatusVariant(quote.status)}>{quote.status}</StatusBadge>
                  <Badge variant="outline">v{quote.version}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{quote.accountName}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(quote.total)}</p>
                  <p className="text-xs text-muted-foreground">Valid until {formatDate(quote.validUntil)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); downloadQuotePdf(quote) }}
                  title="Download Quote PDF"
                >
                  <Download className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No quotes linked to this lead</p>
          <p className="mt-1 text-xs text-muted-foreground">
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
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No material inquiries linked to this lead</p>
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
      count: activityCount,
      content: <AuditTrail entityType="lead" entityId={lead.id} />,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={lead.name}
        subtitle={lead.company}
        status={{ label: activeStage, variant: getStageVariant(activeStage) }}
        badges={
          <Badge variant={priorityVariant} className="uppercase text-[10px] tracking-wider">
            {lead.priority} Priority
          </Badge>
        }
        owner={{ name: displayOwnerName, role: displayOwnerRole }}
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
              <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10" />}>
                  <XCircle className="size-3.5" data-icon="inline-start" />
                  Reject
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reject Lead</DialogTitle>
                    <DialogDescription>
                      Mark "{lead.name}" as rejected. This will move the lead out of the active pipeline.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="Enter the reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={!rejectionReason.trim()}
                    >
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
          <DetailTabs tabs={tabs} defaultTab="overview" />
        </div>

        {/* Right column - 1/3 */}
        <div className="space-y-4">
          {/* BDE / Account Owner Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>{displayOwnerRole}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {displayOwnerName
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{displayOwnerName}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{displayOwnerRole}</p>
                  {ownerInfo && (
                    <>
                      <p className="text-xs text-muted-foreground">{ownerInfo.email}</p>
                      <p className="text-xs text-muted-foreground">{ownerInfo.phone}</p>
                    </>
                  )}
                </div>
              </div>
              {/* Show BDE info below Account Owner for qualified+ leads */}
              {!isPreQualified && lead.bde && (
                <div className="border-t border-border/50 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">BDE (Original)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {lead.bde.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <p className="text-sm text-muted-foreground">{lead.bde}</p>
                  </div>
                </div>
              )}
              {/* Show "Assigned at Qualified" hint for pre-qualified leads */}
              {isPreQualified && (
                <p className="text-xs text-muted-foreground/60 italic">Account Owner assigned at Qualified stage</p>
              )}
            </CardContent>
          </Card>

          {/* Lead Info Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Lead Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Source</dt>
                  <dd className="text-sm">{lead.source}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Created</dt>
                  <dd className="text-sm">{formatDate(lead.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Last Contact</dt>
                  <dd className="text-sm">{formatDate(lead.lastContact)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Value</dt>
                  <dd className="text-sm font-medium">{formatCurrency(lead.value)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Stage</dt>
                  <dd>
                    <StatusBadge variant={getStageVariant(lead.stage)}>{lead.stage}</StatusBadge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Closed Won Wizard */}
      <ClosedWonWizardDialog
        open={closedWonWizardOpen}
        onOpenChange={setClosedWonWizardOpen}
        entityType="lead"
        entityName={lead.name}
        entityValue={lead.value}
        entityCompany={lead.company}
        onComplete={() => {
          setClosedWonWizardOpen(false)
          setCurrentStage('Closed Won')
          toast.success(`Lead "${lead.name}" closed won — Account & Sales Order created`)
        }}
      />

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={lostReasonOpen}
        onOpenChange={setLostReasonOpen}
        entityType="lead"
        entityName={lead.name}
        onConfirm={(reason) => {
          setLostReasonOpen(false)
          setCurrentStage('Closed Lost')
          toast.success(`Lead "${lead.name}" marked as lost — ${reason}`)
        }}
      />
    </div>
  )
}

export { LeadDetailPage }

export default LeadDetailPage
