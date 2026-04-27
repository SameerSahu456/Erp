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
  Users,
  Plus,
  Download,
  Link2,
  Briefcase,
  Tag,
  BarChart3,
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
import { ActivityFeed } from '../components/ActivityFeed'
import { NotesSection } from '../components/NotesSection'
import { MeetingsSection } from '../components/MeetingsSection'
import { accounts } from '../data/accounts'
import { contacts } from '../data/contacts'
import { deals } from '../data/deals'
import { salesOrders } from '../data/sales-orders'
import { invoices } from '../data/invoices'
import { quotes } from '../data/quotes'
import { mockActivities } from '../data/activities'
import { mockNotes } from '../data/notes'
import { downloadQuotePdf } from '../utils/download-quote-pdf'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getAccountStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Active': return 'success'
    case 'Inactive': return 'error'
    case 'Prospect': return 'info'
    default: return 'neutral'
  }
}

function getDealStageVariant(stage: string): StatusBadgeVariant {
  switch (stage) {
    case 'New': return 'info'
    case 'Procurement': return 'info'
    case 'Cold': return 'neutral'
    case 'Proposal': return 'warning'
    case 'Negotiation': return 'info'
    case 'Closed Won': return 'success'
    case 'Closed Lost': return 'error'
    default: return 'neutral'
  }
}

function getOrderStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Confirmed': return 'info'
    case 'Shipped': return 'warning'
    case 'Delivered': return 'success'
    case 'Cancelled': return 'error'
    default: return 'neutral'
  }
}

function getQuoteStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Sent': return 'info'
    case 'Accepted': return 'success'
    case 'Rejected': return 'error'
    case 'Expired': return 'warning'
    default: return 'neutral'
  }
}

function getInvoiceStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Sent': return 'info'
    case 'Partially Paid': return 'warning'
    case 'Paid': return 'success'
    case 'Overdue': return 'error'
    case 'Void': return 'error'
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

/** Detail row for overview section */
function InfoRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 truncate text-[13px] text-foreground">{children}</dd>
      </div>
    </div>
  )
}

function AccountDetailPage() {
  const { id: accountId } = useParams<{ id: string }>()
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
  const accountQuotes = quotes.filter((q) => q.accountId === account.id)

  const activityCount = mockActivities.filter(
    (a) => a.entityType === 'account' && a.entityId === account.id
  ).length

  const noteCount = mockNotes.filter(
    (n) => n.entityType === 'account' && n.entityId === account.id
  ).length

  const accountOwners = account.owners ?? [account.owner]
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

  // Active deals value
  const activeDealValue = accountDeals
    .filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
    .reduce((sum, d) => sum + d.value, 0)

  const wonDealValue = accountDeals
    .filter((d) => d.stage === 'Closed Won')
    .reduce((sum, d) => sum + d.value, 0)

  function handleDelete() {
    setDeleteDialogOpen(false)
    navigate('/crm/accounts')
  }

  const subtitle = [account.industry, account.type, account.city].filter(Boolean).join(' \u2022 ')

  // --- Tab Contents ---

  const overviewContent = (
    <div className="space-y-6 pt-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pipeline</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{formatCurrency(activeDealValue)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Won</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-status-success-text">{formatCurrency(wonDealValue)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Revenue</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{formatCurrency(paidInvoicesTotal)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outstanding</p>
          <p className={cn('mt-1 text-lg font-bold tabular-nums', outstandingTotal > 0 && 'text-destructive')}>
            {formatCurrency(outstandingTotal)}
          </p>
        </div>
      </div>

      {/* Company Details */}
      <Card size="sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Company Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <InfoRow icon={Briefcase} label="Industry">{account.industry}</InfoRow>
            <InfoRow icon={Tag} label="Type">{account.type}</InfoRow>
            <InfoRow icon={MapPin} label="Location">
              {[account.location, account.city].filter(Boolean).join(', ') || account.city}
            </InfoRow>
            {account.companySize && (
              <InfoRow icon={Building2} label="Company Size">{account.companySize}</InfoRow>
            )}
            {account.employees != null && (
              <InfoRow icon={Users} label="Employees">{account.employees.toLocaleString()}</InfoRow>
            )}
            <InfoRow icon={IndianRupee} label="Annual Revenue">{formatCurrency(account.revenue)}</InfoRow>
            {account.website && (
              <InfoRow icon={Globe} label="Website">
                <a
                  href={account.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {account.website}
                </a>
              </InfoRow>
            )}
            <InfoRow icon={CalendarDays} label="Created">{formatDate(account.createdAt)}</InfoRow>
            {account.parentAccountName && (
              <InfoRow icon={Link2} label="Parent Account">
                <Link to={`/crm/accounts/${account.parentAccountId}`} className="text-primary hover:underline">
                  {account.parentAccountName}
                </Link>
              </InfoRow>
            )}
          </dl>
        </CardContent>
      </Card>

    </div>
  )

  const contactsContent = (
    <div className="space-y-4 pt-5">
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
            <Link
              key={contact.id}
              to={`/crm/contacts/${contact.id}`}
              className="group rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-[0_8px_20px_-6px_rgba(16,24,40,0.10),0_4px_10px_-4px_rgba(16,24,40,0.06)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-card transition-transform group-hover:scale-105">
                  {contact.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {contact.name}
                  </p>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {contact.designation}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <Phone className="size-3 shrink-0" />
                    <span>{contact.phone}</span>
                  </div>
                  <p className="pt-1 text-[10.5px] text-muted-foreground/80">
                    Last contact: {formatDate(contact.lastContact)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Plus className="size-4" />
          </div>
          <p className="text-[13px] font-medium text-foreground">No contacts linked to this account</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a contact to start building relationships.
          </p>
        </div>
      )}
    </div>
  )

  const dealsContent = (
    <div className="space-y-4 pt-5">
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
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">No deals for this account</p>
        </div>
      )}
    </div>
  )

  const ordersInvoicesContent = (
    <div className="space-y-6 pt-5">
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
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-8 text-center">
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
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">No invoices</p>
          </div>
        )}
      </div>
    </div>
  )

  const quotesContent = (
    <div className="space-y-4 pt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {accountQuotes.length} quote{accountQuotes.length !== 1 ? 's' : ''} for this account
        </p>
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/crm/quotes/new?accountId=${account.id}`} />}
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          Create Quote
        </Button>
      </div>
      {accountQuotes.length > 0 ? (
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
              {accountQuotes.map((quote) => (
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
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">No quotes for this account</p>
        </div>
      )}
    </div>
  )

  // Child accounts
  const childAccounts = accounts.filter((a) => a.parentAccountId === account.id)

  // Addresses content
  const billingAddresses = (account.addresses ?? []).filter((a) => a.type === 'Billing')
  const shippingAddresses = (account.addresses ?? []).filter((a) => a.type === 'Shipping')

  const addressesContent = (
    <div className="space-y-6 pt-5">
      {/* Billing Addresses */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Billing Addresses</h3>
        {billingAddresses.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {billingAddresses.map((addr) => (
              <Card key={addr.id} size="sm">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{addr.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{addr.line1}</p>
                      {addr.line2 && <p className="text-xs text-muted-foreground">{addr.line2}</p>}
                      <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                    {addr.isDefault && (
                      <Badge variant="primary-soft" size="sm">Default</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">No billing addresses added</p>
          </div>
        )}
      </div>

      {/* Shipping Addresses */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Shipping Addresses</h3>
        {shippingAddresses.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shippingAddresses.map((addr) => (
              <Card key={addr.id} size="sm">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{addr.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{addr.line1}</p>
                      {addr.line2 && <p className="text-xs text-muted-foreground">{addr.line2}</p>}
                      <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                    {addr.isDefault && (
                      <Badge variant="primary-soft" size="sm">Default</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">No shipping addresses added</p>
          </div>
        )}
      </div>

      {/* Child Accounts */}
      {childAccounts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Child Accounts</h3>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {childAccounts.map((child) => (
                  <TableRow key={child.id} className="cursor-pointer hover:bg-accent/50">
                    <TableCell>
                      <Link to={`/crm/accounts/${child.id}`} className="text-sm font-medium text-primary hover:underline">
                        {child.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{child.industry}</TableCell>
                    <TableCell className="text-sm">{child.city}</TableCell>
                    <TableCell>
                      <StatusBadge variant={getAccountStatusVariant(child.status)}>{child.status}</StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    {
      id: 'addresses',
      label: 'Addresses',
      count: (account.addresses ?? []).length,
      content: addressesContent,
    },
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
      id: 'quotes',
      label: 'Quotes',
      count: accountQuotes.length,
      content: quotesContent,
    },
    {
      id: 'orders-invoices',
      label: 'Orders & Invoices',
      count: accountOrders.length + accountInvoices.length,
      content: ordersInvoicesContent,
    },
    {
      id: 'meetings',
      label: 'Meetings',
      content: <div className="pt-5"><MeetingsSection entityType="account" entityId={account.id} entityName={account.name} /></div>,
    },
    {
      id: 'activities',
      label: 'Activities',
      count: activityCount,
      content: <div className="pt-5"><ActivityFeed entityType="account" entityId={account.id} /></div>,
    },
    {
      id: 'notes',
      label: 'Notes',
      count: noteCount,
      content: <div className="pt-5"><NotesSection entityType="account" entityId={account.id} /></div>,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        sticky
        title={account.name}
        subtitle={subtitle}
        status={{ label: account.status, variant: getAccountStatusVariant(account.status) }}
        badges={account.tag ? (
          <Badge
            variant={account.tag === 'Hunting' ? 'info' : account.tag === 'Farming' ? 'success' : 'grey'}
            className="uppercase text-[10px] tracking-wider"
          >
            {account.tag}
          </Badge>
        ) : undefined}
        owners={accountOwners.map((name, i) => ({ name, role: i === 0 ? 'Primary Manager' : 'Co-Manager' }))}
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
        {/* Main content — 2/3 */}
        <div className="lg:col-span-2">
          <DetailTabs cardContent tabs={tabs} defaultTab="overview" />
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-4 lg:mt-14">
          {/* Account Owners */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Account Owners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {accountOwners.map((ownerName, idx) => {
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

          {/* Categories */}
          {(account.categoriesInterested?.length || account.categoriesBuyed?.length) ? (
            <Card size="sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-[13px] font-medium tracking-tight">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {account.categoriesInterested && account.categoriesInterested.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">Interested</p>
                    <div className="flex flex-wrap gap-1">
                      {account.categoriesInterested.map((cat) => (
                        <Badge key={cat} variant="primary-soft" size="sm" className="text-[10.5px] font-normal">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {account.categoriesBuyed && account.categoriesBuyed.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">Bought</p>
                    <div className="flex flex-wrap gap-1">
                      {account.categoriesBuyed.map((cat) => (
                        <Badge key={cat} variant="success-soft" size="sm" className="text-[10.5px] font-normal">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Financial Summary */}
          <Card size="sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-[13px] font-medium tracking-tight">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <dt className="text-[11px] text-muted-foreground/80">Total Revenue</dt>
                  <dd className="text-[12.5px] font-medium tabular-nums tracking-tight">{formatCurrency(paidInvoicesTotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[11px] text-muted-foreground/80">Outstanding</dt>
                  <dd className={cn('text-[12.5px] font-medium tabular-nums tracking-tight', outstandingTotal > 0 && 'text-destructive')}>
                    {formatCurrency(outstandingTotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                  <dt className="text-[11px] text-muted-foreground/80">Total Orders</dt>
                  <dd className="text-[12.5px] tabular-nums tracking-tight">{accountOrders.length}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[11px] text-muted-foreground/80">Avg Order Value</dt>
                  <dd className="text-[12.5px] tabular-nums tracking-tight">{formatCurrency(avgOrderValue)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[11px] text-muted-foreground/80">Open Deals</dt>
                  <dd className="text-[12.5px] tabular-nums tracking-tight">
                    {accountDeals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length}
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

export { AccountDetailPage }

export default AccountDetailPage
