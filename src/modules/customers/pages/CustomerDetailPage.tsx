import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Pencil,
  Globe,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  AlertTriangle,
  Ban,
  CheckCircle,
  Upload,
  IndianRupee,
  Package,
  FileText,
  CreditCard,
  Users,
  Truck,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
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
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { FileUpload } from '@/components/common/FileUpload'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import { CommentSection } from '@/modules/crm/components/CommentSection'

import { mockCustomerRegistrations } from '@/modules/customers/data/customers'
import { mockRentalContracts } from '@/modules/rentals/data/contracts'
import type { CustomerOnboardingStatus, CustomerDocument, KYCItem } from '@/modules/customers/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStatusVariant(status: CustomerOnboardingStatus): StatusBadgeVariant {
  switch (status) {
    case 'Active':
      return 'success'
    case 'Inactive':
    case 'Churned':
      return 'error'
    case 'Onboarding':
    case 'KYC Pending':
      return 'warning'
    default:
      return 'info'
  }
}

function getDocStatusVariant(status: CustomerDocument['status']): StatusBadgeVariant {
  switch (status) {
    case 'Verified':
      return 'success'
    case 'Uploaded':
      return 'info'
    case 'Rejected':
      return 'error'
  }
}

function getKycStatusVariant(status: KYCItem['status']): StatusBadgeVariant {
  switch (status) {
    case 'Pass':
      return 'success'
    case 'Fail':
      return 'error'
    case 'Pending':
      return 'warning'
  }
}

function getPricingTierVariant(tier: string): 'default' | 'secondary' | 'outline' {
  switch (tier) {
    case 'Platinum':
    case 'Gold':
      return 'default'
    case 'Silver':
      return 'secondary'
    default:
      return 'outline'
  }
}

function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)

  const customer = mockCustomerRegistrations.find((c) => c.id === id)

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">Customer not found</h2>
        <p className="text-sm text-muted-foreground">
          The customer you are looking for does not exist or has been removed.
        </p>
        <Button variant="outline" render={<Link to="/customers" />}>
          Back to Customers
        </Button>
      </div>
    )
  }

  const isPending = ['KYC Pending', 'Onboarding'].includes(customer.status)
  const kycPassed = customer.kycChecklist.filter((k) => k.status === 'Pass').length
  const linkedContracts = mockRentalContracts.filter((rc) => rc.customerName === customer.companyName)

  // --- Tab 1: Overview ---
  const overviewContent = (
    <div className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Type</dt>
                <dd className="text-sm">
                  <Badge variant={customer.type === 'Company' ? 'secondary' : 'outline'}>
                    {customer.type}
                  </Badge>
                </dd>
              </div>
            </div>
            {customer.industry && (
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Industry</dt>
                  <dd className="text-sm">{customer.industry}</dd>
                </div>
              </div>
            )}
            {customer.website && (
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Website</dt>
                  <dd className="text-sm">
                    <a
                      href={customer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {customer.website}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <CreditCard className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Pricing Tier</dt>
                <dd className="text-sm">
                  <Badge variant={getPricingTierVariant(customer.pricingTier)}>
                    {customer.pricingTier}
                  </Badge>
                </dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Billing Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-muted-foreground" />
            <div className="text-sm">
              <p>{customer.billingAddress}</p>
              <p>
                {customer.billingCity}, {customer.billingState} {customer.billingPincode}
              </p>
              {customer.gstNumber && (
                <p className="mt-1 text-xs text-muted-foreground">
                  GST: <span className="font-mono">{customer.gstNumber}</span>
                </p>
              )}
              {customer.panNumber && (
                <p className="text-xs text-muted-foreground">
                  PAN: <span className="font-mono">{customer.panNumber}</span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Account Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Name</dt>
                <dd className="text-sm">{customer.accountManager}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Email</dt>
                <dd className="text-sm">{customer.accountManagerEmail}</dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )

  // --- Tab 2: Contacts ---
  const contactsContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {customer.contacts.length} contact(s)
        </p>
        <Button variant="outline" size="sm">
          <Users className="size-3.5" data-icon="inline-start" />
          Add Contact
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {customer.contacts.map((contact) => (
          <Card key={contact.id} size="sm">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{contact.name}</h4>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {contact.role}
                    </Badge>
                    {contact.isPrimary && (
                      <Badge variant="default" className="text-[10px]">
                        Primary
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{contact.designation}</p>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-xs text-primary hover:underline">
                      {contact.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-3 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="text-xs text-primary hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  // --- Tab 3: Addresses ---
  const addressesContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {customer.shippingAddresses.length} shipping address(es)
        </p>
        <Button variant="outline" size="sm">
          <MapPin className="size-3.5" data-icon="inline-start" />
          Add Address
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {customer.shippingAddresses.map((addr) => (
          <Card key={addr.id} size="sm">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{addr.label}</h4>
                  {addr.isDefault && (
                    <Badge variant="default" className="text-[10px]">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    <p>{addr.address}</p>
                    <p>{addr.city}, {addr.state} {addr.pincode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <User className="size-3 text-muted-foreground" />
                  <span className="text-xs">{addr.contactPerson}</span>
                  <Phone className="size-3 text-muted-foreground" />
                  <span className="text-xs">{addr.contactPhone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  // --- Tab 4: Documents & KYC ---
  const documentsContent = (
    <div className="space-y-6">
      {/* Documents Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Documents</h4>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <Upload className="size-3.5" data-icon="inline-start" />
              Upload Document
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>Upload customer documents for verification.</DialogDescription>
              </DialogHeader>
              <FileUpload
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10 * 1024 * 1024}
                multiple
                value={uploadFiles}
                onChange={setUploadFiles}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setUploadDialogOpen(false)}>Upload</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.type}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.fileName}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getDocStatusVariant(doc.status)}>
                      {doc.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* KYC Checklist */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">
          KYC Checklist ({kycPassed}/{customer.kycChecklist.length} passed)
        </h4>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.kycChecklist.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getKycStatusVariant(item.status)}>
                      {item.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.verifiedBy ?? '-'}
                  </TableCell>
                  <TableCell>
                    {item.verifiedAt ? formatDate(item.verifiedAt) : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.notes ?? '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )

  // --- Tab 5: Financials ---
  const financialsContent = (
    <div className="space-y-6">
      <StatsRow
        stats={[
          { label: 'Total Orders', value: customer.totalOrders, icon: Package },
          {
            label: 'Total Revenue',
            value: formatCurrency(customer.totalRevenue),
            icon: IndianRupee,
          },
          {
            label: 'Outstanding',
            value: formatCurrency(customer.outstandingBalance),
            icon: FileText,
          },
          {
            label: 'Overdue',
            value: formatCurrency(customer.overdueAmount),
            icon: AlertTriangle,
            className: customer.overdueAmount > 0 ? 'text-destructive' : undefined,
          },
        ]}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Credit & Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Credit Limit</dt>
              <dd className="text-sm font-medium">{formatCurrency(customer.creditLimit)}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Payment Terms</dt>
              <dd className="text-sm">{customer.paymentTerms}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Pricing Tier</dt>
              <dd className="text-sm">
                <Badge variant={getPricingTierVariant(customer.pricingTier)}>
                  {customer.pricingTier}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              View order history in the{' '}
              <Link to="/crm" className="text-primary hover:underline">
                CRM
              </Link>{' '}
              module.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // --- Tab 6: Rentals ---
  const rentalsContent = (
    <div className="space-y-4">
      {linkedContracts.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract #</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Monthly Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linkedContracts.map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell>
                    <Link to={`/rentals/${rc.id}`} className="text-primary hover:underline font-medium">
                      {rc.contractNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{rc.devices.length} device(s)</TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={
                        rc.status === 'Active'
                          ? 'success'
                          : rc.status === 'Overdue' || rc.status === 'Terminated'
                            ? 'error'
                            : 'info'
                      }
                    >
                      {rc.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{formatDate(rc.startDate)}</TableCell>
                  <TableCell>{formatDate(rc.endDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(rc.monthlyRental)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Truck className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No rental contracts linked to this customer.</p>
        </div>
      )}
    </div>
  )

  // --- Tab 7: Comments ---
  const commentsContent = (
    <CommentSection entityType="account" entityId={customer.id} />
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    { id: 'contacts', label: 'Contacts', count: customer.contacts.length, content: contactsContent },
    { id: 'addresses', label: 'Addresses', count: customer.shippingAddresses.length, content: addressesContent },
    { id: 'documents', label: 'Documents & KYC', content: documentsContent },
    { id: 'financials', label: 'Financials', content: financialsContent },
    { id: 'rentals', label: 'Rentals', count: linkedContracts.length, content: rentalsContent },
    { id: 'comments', label: 'Comments', content: commentsContent },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={customer.companyName}
        subtitle={customer.customerCode}
        status={{ label: customer.status, variant: getStatusVariant(customer.status) }}
        backHref="/customers"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link to={`/customers/${customer.id}/edit`} />}
            >
              <Pencil className="size-3.5" data-icon="inline-start" />
              Edit
            </Button>
            {isPending && (
              <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  <CheckCircle className="size-3.5" data-icon="inline-start" />
                  Approve
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Approve Customer</DialogTitle>
                    <DialogDescription>
                      Approve &quot;{customer.companyName}&quot; as a registered customer?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => { setApproveDialogOpen(false); navigate('/customers') }}>
                      Approve
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Ban className="size-3.5" data-icon="inline-start" />
                Deactivate
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Deactivate Customer</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to deactivate &quot;{customer.companyName}&quot;?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => { setDeactivateDialogOpen(false); navigate('/customers') }}>
                    Deactivate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content - 2/3 */}
        <div className="lg:col-span-2">
          <DetailTabs tabs={tabs} defaultTab="overview" />
        </div>

        {/* Right sidebar - 1/3 */}
        <div className="space-y-4">
          {/* Account Manager card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Account Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{customer.accountManager}</p>
                  <p className="text-xs text-muted-foreground">{customer.accountManagerEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Outstanding</dt>
                  <dd className="text-sm font-medium">{formatCurrency(customer.outstandingBalance)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Overdue</dt>
                  <dd className={cn('text-sm font-medium', customer.overdueAmount > 0 && 'text-destructive')}>
                    {formatCurrency(customer.overdueAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Credit Limit</dt>
                  <dd className="text-sm">{formatCurrency(customer.creditLimit)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Payment Terms</dt>
                  <dd className="text-sm">{customer.paymentTerms}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Quick Info card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Status</dt>
                  <dd>
                    <StatusBadge variant={getStatusVariant(customer.status)}>
                      {customer.status}
                    </StatusBadge>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Type</dt>
                  <dd className="text-sm">{customer.type}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">City</dt>
                  <dd className="text-sm">{customer.billingCity}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Pricing Tier</dt>
                  <dd className="text-sm">
                    <Badge variant={getPricingTierVariant(customer.pricingTier)}>
                      {customer.pricingTier}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Total Orders</dt>
                  <dd className="text-sm">{customer.totalOrders}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Approval card */}
          {customer.approvedBy && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Approved By</dt>
                    <dd className="text-sm">{customer.approvedBy}</dd>
                  </div>
                  {customer.approvedDate && (
                    <div className="flex items-center justify-between">
                      <dt className="text-xs font-ui text-muted-foreground">Date</dt>
                      <dd className="text-sm">{formatDate(customer.approvedDate)}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {customer.notes && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Customer</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this customer registration.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => { setRejectDialogOpen(false); navigate('/customers') }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CustomerDetailPage
