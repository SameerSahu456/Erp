import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Pencil, Trash2, Mail, Phone, Building2, Globe, IndianRupee, CalendarDays } from 'lucide-react'

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
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EntityHeader } from '../components/EntityHeader'
import { DetailTabs } from '../components/DetailTabs'
import { ActivityFeed } from '../components/ActivityFeed'
import { NotesSection } from '../components/NotesSection'
import { leads } from '../data/leads'
import { deals } from '../data/deals'
import { quotes } from '../data/quotes'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'
import { LEAD_STAGES } from '../types'

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
    case 'Won':
      return 'success'
    case 'Lost':
      return 'error'
    default:
      return 'neutral'
  }
}

function getDealStageVariant(stage: string): StatusBadgeVariant {
  switch (stage) {
    case 'Discovery':
      return 'info'
    case 'Proposal':
      return 'warning'
    case 'Negotiation':
      return 'warning'
    case 'Closed Won':
      return 'success'
    case 'Closed Lost':
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

// Mock account manager info
const MOCK_MANAGERS: Record<string, { email: string; phone: string }> = {
  'Amit Patel': { email: 'amit.patel@comprint.in', phone: '+91 98200 11111' },
  'Sneha Desai': { email: 'sneha.desai@comprint.in', phone: '+91 98200 22222' },
  'Rahul Verma': { email: 'rahul.verma@comprint.in', phone: '+91 98200 33333' },
}

function LeadDetailPage() {
  const { id: leadId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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

  // Match quotes by company name (since leads don't have accountId)
  const relatedQuotes = quotes.filter(
    (q) => q.accountName.toLowerCase().includes(lead.company.toLowerCase()) ||
           lead.company.toLowerCase().includes(q.accountName.toLowerCase())
  )

  // Match deals by company name
  const relatedDeals = deals.filter(
    (d) => d.accountName.toLowerCase().includes(lead.company.toLowerCase()) ||
           lead.company.toLowerCase().includes(d.accountName.toLowerCase())
  )

  const managerInfo = MOCK_MANAGERS[lead.owner]

  // Pipeline stages (exclude Lost for visual pipeline)
  const pipelineStages = LEAD_STAGES.filter((s) => s !== 'Lost')
  const currentStageIndex = pipelineStages.indexOf(lead.stage as typeof pipelineStages[number])
  const isLost = lead.stage === 'Lost'

  function handleDelete() {
    setDeleteDialogOpen(false)
    navigate('/crm/leads')
  }

  const overviewContent = (
    <div className="space-y-6">
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

      {/* Stage Progress */}
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
      {relatedQuotes.length > 0 ? (
        <div className="space-y-3">
          {relatedQuotes.map((quote) => (
            <div
              key={quote.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{quote.quoteNumber}</span>
                  <StatusBadge variant={getQuoteStatusVariant(quote.status)}>{quote.status}</StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground">{quote.accountName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(quote.total)}</p>
                <p className="text-xs text-muted-foreground">Valid until {formatDate(quote.validUntil)}</p>
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
          <Button variant="outline" size="sm" className="mt-4">
            Create Quote
          </Button>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    {
      id: 'activities',
      label: 'Activities',
      count: activityCount,
      content: <ActivityFeed entityType="lead" entityId={lead.id} />,
    },
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
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={lead.name}
        subtitle={lead.company}
        status={{ label: lead.stage, variant: getStageVariant(lead.stage) }}
        owner={{ name: lead.owner, role: 'Account Manager' }}
        backHref="/crm/leads"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link to={`/crm/leads/${lead.id}/edit`} />}
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
          {/* Account Manager Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Account Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {lead.owner
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{lead.owner}</p>
                  {managerInfo && (
                    <>
                      <p className="text-xs text-muted-foreground">{managerInfo.email}</p>
                      <p className="text-xs text-muted-foreground">{managerInfo.phone}</p>
                    </>
                  )}
                </div>
              </div>
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

          {/* Related Deals Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Related Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {relatedDeals.length > 0 ? (
                <div className="space-y-3">
                  {relatedDeals.map((deal) => (
                    <div key={deal.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{deal.name}</span>
                        <StatusBadge variant={getDealStageVariant(deal.stage)}>{deal.stage}</StatusBadge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(deal.value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No related deals found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { LeadDetailPage }

export default LeadDetailPage
