import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  User,
  Users,
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
import { EntityHeader } from '../components/EntityHeader'
import { DetailTabs } from '../components/DetailTabs'
import { ActivityFeed } from '../components/ActivityFeed'
import { MeetingsSection } from '../components/MeetingsSection'
import { NotesSection } from '../components/NotesSection'
import { contacts } from '../data/contacts'
import { accounts } from '../data/accounts'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

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

function ContactDetailPage() {
  const { id: contactId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const contact = contacts.find((c) => c.id === contactId)

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">Contact not found</h2>
        <p className="text-sm text-muted-foreground">
          The contact you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" render={<Link to="/crm/contacts" />}>
          Back to Contacts
        </Button>
      </div>
    )
  }

  const account = accounts.find((a) => a.id === contact.accountId)

  // Gather owners across all linked accounts
  const linkedAccounts = contact.accountIds
    ? contact.accountIds.map((aid) => accounts.find((a) => a.id === aid)).filter(Boolean)
    : account ? [account] : []
  const accountOwners = linkedAccounts.flatMap((a) => a!.owners ?? [a!.owner])
  // Deduplicate
  const uniqueOwners = [...new Set(accountOwners)]

  const activityCount = mockActivities.filter(
    (a) => a.entityType === 'contact' && a.entityId === contact.id
  ).length

  const noteCount = mockNotes.filter(
    (n) => n.entityType === 'contact' && n.entityId === contact.id
  ).length

  function handleDelete() {
    setDeleteDialogOpen(false)
    navigate('/crm/contacts')
  }

  const subtitle = `${contact.designation} at ${contact.accountName}`

  const overviewContent = (
    <div className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <Mail className="size-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Email</dt>
                <dd className="mt-0.5 truncate text-[13px]">
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {contact.email}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <Phone className="size-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Phone</dt>
                <dd className="mt-0.5 truncate text-[13px]">
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <User className="size-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Designation</dt>
                <dd className="mt-0.5 truncate text-[13px] text-foreground">{contact.designation}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <Building2 className="size-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Account</dt>
                <dd className="mt-0.5 truncate text-[13px]">
                  <Link
                    to={`/crm/accounts/${contact.accountId}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {contact.accountName}
                  </Link>
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <CalendarDays className="size-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Last Contact</dt>
                <dd className="mt-0.5 truncate text-[13px] text-foreground">{formatDate(contact.lastContact)}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <CalendarDays className="size-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Created</dt>
                <dd className="mt-0.5 truncate text-[13px] text-foreground">{formatDate(contact.createdAt)}</dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    {
      id: 'activities',
      label: 'Activities',
      count: activityCount,
      content: <ActivityFeed entityType="contact" entityId={contact.id} />,
    },
    {
      id: 'meetings',
      label: 'Meetings',
      content: <MeetingsSection entityType="contact" entityId={contact.id} entityName={contact.name} />,
    },
    {
      id: 'notes',
      label: 'Notes',
      count: noteCount,
      content: <NotesSection entityType="contact" entityId={contact.id} />,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        sticky
        title={contact.name}
        subtitle={subtitle}
        backHref="/crm/contacts"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link to={`/crm/contacts/${contact.id}/edit`} />}
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
                  <DialogTitle>Delete Contact</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{contact.name}"? This action cannot be undone.
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
          {/* Account Owners */}
          {uniqueOwners.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Account Owners</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {uniqueOwners.map((ownerName, idx) => {
                    const info = MOCK_MANAGERS[ownerName]
                    const role = info?.role ?? (idx === 0 ? 'Primary Manager' : 'Co-Manager')
                    return (
                      <div key={ownerName} className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-2 transition-colors hover:bg-muted/60">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                          {ownerName.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="truncate text-xs font-medium">{ownerName}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{role}</p>
                          {info && (
                            <>
                              <p className="truncate text-[10px] text-muted-foreground">{info.email}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{info.phone}</p>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communication Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Communication</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Last Contact</dt>
                  <dd className="text-sm">{formatDate(contact.lastContact)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Email</dt>
                  <dd className="text-sm">
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {contact.email}
                    </a>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Phone</dt>
                  <dd className="text-sm">
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {contact.phone}
                    </a>
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

export { ContactDetailPage }

export default ContactDetailPage
