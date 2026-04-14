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
} from 'lucide-react'

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
import { NotesSection } from '../components/NotesSection'
import { contacts } from '../data/contacts'
import { accounts } from '../data/accounts'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>()
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

  const subtitle = `${contact.title} at ${contact.accountName}`

  const overviewContent = (
    <div className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 text-muted-foreground" />
              <div>
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
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 text-muted-foreground" />
              <div>
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
            </div>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Title</dt>
                <dd className="text-sm">{contact.title}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Account</dt>
                <dd className="text-sm">
                  <Link
                    to={`/crm/accounts/${contact.accountId}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {contact.accountName}
                  </Link>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Last Contact</dt>
                <dd className="text-sm">{formatDate(contact.lastContact)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Created</dt>
                <dd className="text-sm">{formatDate(contact.createdAt)}</dd>
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
      id: 'notes',
      label: 'Notes',
      count: noteCount,
      content: <NotesSection entityType="contact" entityId={contact.id} />,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
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
          <DetailTabs tabs={tabs} defaultTab="overview" />
        </div>

        {/* Right column - 1/3 */}
        <div className="space-y-4">
          {/* Account Card */}
          {account && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Name</dt>
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
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">City</dt>
                    <dd className="text-sm">{account.city}</dd>
                  </div>
                </dl>
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
