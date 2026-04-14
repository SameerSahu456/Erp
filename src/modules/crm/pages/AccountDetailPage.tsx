import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Pencil,
  Trash2,
  Globe,
  Building2,
  IndianRupee,
  CalendarDays,
  MapPin,
  Mail,
  Phone,
  User,
  Plus,
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
import { accounts } from '../data/accounts'
import { contacts } from '../data/contacts'
import { deals } from '../data/deals'
import { salesOrders } from '../data/sales-orders'
import { invoices } from '../data/invoices'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getAccountStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Active':
      return 'success'
    case 'Inactive':
      return 'error'
    case 'Prospect':
      return 'info'
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

function getOrderStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft':
      return 'neutral'
    case 'Confirmed':
      return 'info'
    case 'Shipped':
      return 'warning'
    case 'Delivered':
      return 'success'
    case 'Cancelled':
      return 'error'
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

function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const account = accounts.find((a) => a.id === accountId)

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">Account not found</h2>
        <p className="text-sm text-muted-foreground">
          The account you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" render={<Link to="/crm/accounts" />}>
          Back to Accounts
        </Button>
      </div>
    )
  }

  // Related data
  const accountContacts = contacts.filter((c) => c.accountId === account.id)
  const accountDeals = deals.filter((d) => d.accountId === account.id)
  const accountOrders = salesOrders.filter((o) => o.accountId === account.id)
  const accountInvoices = invoices.filter((i) => i.accountId === account.id)

  const activityCount = mockActivities.filter(
    (a) => a.entityType === 'account' && a.entityId === account.id
  ).length

  const noteCount = mockNotes.filter(
    (n) => n.entityType === 'account' && n.entityId === account.id
  ).length

  const managerInfo = MOCK_MANAGERS[account.owner]

  // Financial calculations
  const paidInvoicesTotal = accountInvoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount, 0)

  const outstandingTotal = accountInvoices
    .filter((i) => i.status !== 'Paid' && i.status !== 'Void' && i.status !== 'Draft')
    .reduce((sum, i) => sum + i.amount, 0)

  const totalOrdersValue = accountOrders.reduce((sum, o) => sum + o.total, 0)
  const avgOrderValue = accountOrders.length > 0 ? totalOrdersValue / accountOrders.length : 0

  // Recent activities (last 3)
  const recentActivities = mockActivities
    .filter((a) => a.entityType === 'account' && a.entityId === account.id)
    .slice(0, 3)

  function handleDelete() {
    setDeleteDialogOpen(false)
    navigate('/crm/accounts')
  }

  const subtitle = [account.industry, account.type, account.city].filter(Boolean).join(' \u2022 ')

  // --- Tab Contents ---

  const overviewContent = (
    <div className="space-y-6">
      {/* Account Info Card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {account.website && (
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Website</dt>
                  <dd className="text-sm">
                    <a
                      href={account.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {account.website}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Industry</dt>
                <dd className="text-sm">{account.industry}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Type</dt>
                <dd className="text-sm">{account.type}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <IndianRupee className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Revenue</dt>
                <dd className="text-sm font-medium">{formatCurrency(account.revenue)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">City</dt>
                <dd className="text-sm">{account.city}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Created</dt>
                <dd className="text-sm">{formatDate(account.createdAt)}</dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="pt-4">
            <p className="text-xs font-ui text-muted-foreground">Total Deals</p>
            <p className="mt-1 text-2xl font-semibold">{accountDeals.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <p className="text-xs font-ui text-muted-foreground">Total Orders</p>
            <p className="mt-1 text-2xl font-semibold">{accountOrders.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <p className="text-xs font-ui text-muted-foreground">Outstanding</p>
            <p className={cn('mt-1 text-2xl font-semibold', outstandingTotal > 0 && 'text-destructive')}>
              {formatCurrency(outstandingTotal)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const contactsContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {accountContacts.length} contact{accountContacts.length !== 1 ? 's' : ''} linked to this account
        </p>
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/crm/contacts/new?accountId=${account.id}`} />}
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          Add Contact
        </Button>
      </div>
      {accountContacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {accountContacts.map((contact) => (
            <Card key={contact.id} size="sm">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {contact.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.title}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="size-3" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      <span>{contact.phone}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Last contact: {formatDate(contact.lastContact)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No contacts linked to this account</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a contact to start building relationships.
          </p>
        </div>
      )}
    </div>
  )

  const dealsContent = (
    <div className="space-y-4">
      {accountDeals.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Probability</TableHead>
                <TableHead>Close Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountDeals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.name}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getDealStageVariant(deal.stage)}>{deal.stage}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(deal.value)}</TableCell>
                  <TableCell className="text-right">{deal.probability}%</TableCell>
                  <TableCell className={cn(deal.stage === 'Closed Lost' && 'text-destructive')}>
                    {formatDate(deal.closeDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No deals for this account</p>
        </div>
      )}
    </div>
  )

  const ordersInvoicesContent = (
    <div className="space-y-6">
      {/* Sales Orders */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Sales Orders</h3>
        {accountOrders.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <StatusBadge variant={getOrderStatusVariant(order.status)}>{order.status}</StatusBadge>
                    </TableCell>
                    <TableCell className={cn(order.status === 'Cancelled' && 'text-destructive')}>
                      {formatDate(order.date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">No sales orders</p>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Invoices</h3>
        {accountInvoices.length > 0 ? (
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
                {accountInvoices.map((invoice) => (
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
            <p className="text-sm text-muted-foreground">No invoices</p>
          </div>
        )}
      </div>
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    {
      id: 'contacts',
      label: 'Contacts',
      count: accountContacts.length,
      content: contactsContent,
    },
    {
      id: 'deals',
      label: 'Deals',
      count: accountDeals.length,
      content: dealsContent,
    },
    {
      id: 'orders-invoices',
      label: 'Orders & Invoices',
      count: accountOrders.length + accountInvoices.length,
      content: ordersInvoicesContent,
    },
    {
      id: 'activities',
      label: 'Activities',
      count: activityCount,
      content: <ActivityFeed entityType="account" entityId={account.id} />,
    },
    {
      id: 'notes',
      label: 'Notes',
      count: noteCount,
      content: <NotesSection entityType="account" entityId={account.id} />,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={account.name}
        subtitle={subtitle}
        status={{ label: account.status, variant: getAccountStatusVariant(account.status) }}
        owner={{ name: account.owner, role: 'Account Manager' }}
        backHref="/crm/accounts"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link to={`/crm/accounts/${account.id}/edit`} />}
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
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{account.name}"? This action cannot be undone.
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
                  {account.owner
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{account.owner}</p>
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

          {/* Financial Summary Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Total Revenue</dt>
                  <dd className="text-sm font-medium">{formatCurrency(paidInvoicesTotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Outstanding</dt>
                  <dd className={cn('text-sm font-medium', outstandingTotal > 0 && 'text-destructive')}>
                    {formatCurrency(outstandingTotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Total Orders</dt>
                  <dd className="text-sm">{accountOrders.length}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Avg Order Value</dt>
                  <dd className="text-sm">{formatCurrency(avgOrderValue)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <User className="size-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{activity.title}</span>
                      </div>
                      <p className="pl-5 text-xs text-muted-foreground">
                        {activity.user} &middot; {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { AccountDetailPage }

export default AccountDetailPage
