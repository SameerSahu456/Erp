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
import { Typography } from '@/components/ui/typography'
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
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { StatsRow } from '@/components/common/display/StatsRow'
import { FileUpload } from '@/components/common/files/FileUpload'
import { EntityHeader } from '@/components/page-shells/EntityHeader'
import { DetailTabs } from '@/components/page-shells/DetailTabs'
import { CommentSection } from '@/components/common/views/CommentSection'

import { mockCustomerRegistrations } from '@/modules/customers/data/customers'
import type { CustomerOnboardingStatus, CustomerDocument, KYCItem } from '@/modules/customers/types'
import { formatINRCompact } from "@/lib/currency";
import { formatIST_date } from "@shared/lib/date"
import { CUSTOMERS_STRINGS } from './customers.strings'

const S = CUSTOMERS_STRINGS

/** What the Rentals tab's table reads off each row. Local on purpose —
 *  the real shape will come from the rentals API's generated types. */
type RentalContractBrief = {
  id: string
  contractNumber: string
  devices: unknown[]
  status: string
  startDate: string
  endDate: string
  monthlyRental: number
}



export const formatDate = (dateStr: string) => formatIST_date(dateStr)

export function getStatusVariant(status: CustomerOnboardingStatus): StatusBadgeVariant {
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

export function getDocStatusVariant(status: CustomerDocument['status']): StatusBadgeVariant {
  switch (status) {
    case 'Verified':
      return 'success'
    case 'Uploaded':
      return 'info'
    case 'Rejected':
      return 'error'
  }
}

export function getKycStatusVariant(status: KYCItem['status']): StatusBadgeVariant {
  switch (status) {
    case 'Pass':
      return 'success'
    case 'Fail':
      return 'error'
    case 'Pending':
      return 'warning'
  }
}

export function getPricingTierVariant(tier: string): 'default' | 'secondary' | 'outline' {
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


export function CustomerDetailBody() {
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
        <Typography variant="page-title" asChild>
          <h2>{S.detail.notFound}</h2>
        </Typography>
        <Typography variant="body" tone="muted" asChild>
          <p>
            {S.detail.notFoundDescription}
          </p>
        </Typography>
        <Button variant="outline" render={<Link to="/customers" />}>
          {S.detail.backToCustomers}
        </Button>
      </div>
    )
  }

  const isPending = ['KYC Pending', 'Onboarding'].includes(customer.status)
  const kycPassed = customer.kycChecklist.filter((k) => k.status === 'Pass').length
  // Awaiting the real rentals link, so the tab shows its empty state.
  // This used to filter rentals' fabricated `mockRentalContracts` by
  // company-NAME string, which both reached into another module's demo
  // fixtures (§7) and rendered invented contracts on a customer page.
  // Wire it to `/rentals/agreements?account_id=` when the join exists.
  const linkedContracts: RentalContractBrief[] = []

  // --- Tab 1: Overview ---
  const overviewContent = (
    <div className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{S.detail.overview.companyInformation}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{S.detail.overview.infoLabels.type}</dt>
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
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.overview.infoLabels.industry}</dt>
                  <Typography variant="body" asChild><dd>{customer.industry}</dd></Typography>
                </div>
              </div>
            )}
            {customer.website && (
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.overview.infoLabels.website}</dt>
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
                <dt className="text-xs font-ui text-muted-foreground">{S.detail.overview.infoLabels.pricingTier}</dt>
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
          <CardTitle>{S.detail.overview.billingAddress}</CardTitle>
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
                  {S.detail.overview.infoLabels.gst}: <span className="font-mono">{customer.gstNumber}</span>
                </p>
              )}
              {customer.panNumber && (
                <p className="text-xs text-muted-foreground">
                  {S.detail.overview.infoLabels.pan}: <span className="font-mono">{customer.panNumber}</span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{S.detail.overview.accountManager}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{S.detail.overview.infoLabels.name}</dt>
                <Typography variant="body" asChild><dd>{customer.accountManager}</dd></Typography>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{S.detail.overview.infoLabels.email}</dt>
                <Typography variant="body" asChild><dd>{customer.accountManagerEmail}</dd></Typography>
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
        <Typography variant="body" tone="muted" asChild>
          <p>
            {S.detail.contacts.contactsCount(customer.contacts.length)}
          </p>
        </Typography>
        <Button variant="outline" size="sm">
          <Users className="size-3.5" data-icon="inline-start" />
          {S.detail.contacts.addContact}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {customer.contacts.map((contact) => (
          <Card key={contact.id} size="sm">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Typography variant="body-strong" asChild><h4>{contact.name}</h4></Typography>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {contact.role}
                    </Badge>
                    {contact.isPrimary && (
                      <Badge variant="default" className="text-[10px]">
                        {S.detail.contacts.primary}
                      </Badge>
                    )}
                  </div>
                </div>
                <Typography variant="helper" asChild><p>{contact.designation}</p></Typography>
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
        <Typography variant="body" tone="muted" asChild>
          <p>
            {S.detail.addresses.addressesCount(customer.shippingAddresses.length)}
          </p>
        </Typography>
        <Button variant="outline" size="sm">
          <MapPin className="size-3.5" data-icon="inline-start" />
          {S.detail.addresses.addAddress}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {customer.shippingAddresses.map((addr) => (
          <Card key={addr.id} size="sm">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Typography variant="body-strong" asChild><h4>{addr.label}</h4></Typography>
                  {addr.isDefault && (
                    <Badge variant="default" className="text-[10px]">
                      {S.detail.addresses.default}
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
                  <Typography variant="helper" tone="default" asChild><span>{addr.contactPerson}</span></Typography>
                  <Phone className="size-3 text-muted-foreground" />
                  <Typography variant="helper" tone="default" asChild><span>{addr.contactPhone}</span></Typography>
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
          <Typography variant="body-strong" asChild><h4>{S.detail.documents.sectionTitle}</h4></Typography>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <Upload className="size-3.5" data-icon="inline-start" />
              {S.detail.documents.uploadDocument}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{S.detail.documents.uploadDialogTitle}</DialogTitle>
                <DialogDescription>{S.detail.documents.uploadDialogDescription}</DialogDescription>
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
                  {S.detail.documents.cancel}
                </Button>
                <Button onClick={() => setUploadDialogOpen(false)}>{S.detail.documents.upload}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{S.detail.documents.tableHeaders.documentType}</TableHead>
                <TableHead>{S.detail.documents.tableHeaders.fileName}</TableHead>
                <TableHead>{S.detail.documents.tableHeaders.status}</TableHead>
                <TableHead>{S.detail.documents.tableHeaders.uploaded}</TableHead>
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
        <Typography variant="body-strong" asChild>
          <h4>
            {S.detail.documents.kycTitle(kycPassed, customer.kycChecklist.length)}
          </h4>
        </Typography>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{S.detail.documents.kycTableHeaders.item}</TableHead>
                <TableHead>{S.detail.documents.kycTableHeaders.status}</TableHead>
                <TableHead>{S.detail.documents.kycTableHeaders.verifiedBy}</TableHead>
                <TableHead>{S.detail.documents.kycTableHeaders.date}</TableHead>
                <TableHead>{S.detail.documents.kycTableHeaders.notes}</TableHead>
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
                    {item.verifiedBy ?? '—'}
                  </TableCell>
                  <TableCell>
                    {item.verifiedAt ? formatDate(item.verifiedAt) : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.notes ?? '—'}
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
          { label: S.detail.financials.stats.totalOrders, value: customer.totalOrders, icon: Package },
          {
            label: S.detail.financials.stats.totalRevenue,
            value: formatINRCompact(customer.totalRevenue),
            icon: IndianRupee,
          },
          {
            label: S.detail.financials.stats.outstanding,
            value: formatINRCompact(customer.outstandingBalance),
            icon: FileText,
          },
          {
            label: S.detail.financials.stats.overdue,
            value: formatINRCompact(customer.overdueAmount),
            icon: AlertTriangle,
            className: customer.overdueAmount > 0 ? 'text-destructive' : undefined,
          },
        ]}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>{S.detail.financials.creditAndTerms}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{S.detail.financials.infoLabels.creditLimit}</dt>
              <Typography variant="body-strong" asChild><dd>{formatINRCompact(customer.creditLimit)}</dd></Typography>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{S.detail.financials.infoLabels.paymentTerms}</dt>
              <Typography variant="body" asChild><dd>{customer.paymentTerms}</dd></Typography>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{S.detail.financials.infoLabels.pricingTier}</dt>
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
          <CardTitle>{S.detail.financials.recentOrders}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {S.detail.financials.recentOrdersEmpty}{' '}
              <Link to="/crm" className="text-primary hover:underline">
                {S.detail.financials.recentOrdersEmptyLink}
              </Link>{' '}
              {S.detail.financials.recentOrdersEmptyModule}
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
                <TableHead>{S.detail.rentals.tableHeaders.contract}</TableHead>
                <TableHead>{S.detail.rentals.tableHeaders.devices}</TableHead>
                <TableHead>{S.detail.rentals.tableHeaders.status}</TableHead>
                <TableHead>{S.detail.rentals.tableHeaders.start}</TableHead>
                <TableHead>{S.detail.rentals.tableHeaders.end}</TableHead>
                <TableHead className="text-right">{S.detail.rentals.tableHeaders.monthlyRate}</TableHead>
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
                  <TableCell>{S.detail.rentals.devicesCount(rc.devices.length)}</TableCell>
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
                  <TableCell className="text-right">{formatINRCompact(rc.monthlyRental)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Truck className="mx-auto mb-2 size-8 text-muted-foreground" />
          <Typography variant="body" tone="muted" asChild><p>{S.detail.rentals.empty}</p></Typography>
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
              {S.detail.headerActions.edit}
            </Button>
            {isPending && (
              <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  <CheckCircle className="size-3.5" data-icon="inline-start" />
                  {S.detail.headerActions.approve}
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>{S.detail.approveDialog.title}</DialogTitle>
                    <DialogDescription>
                      {S.detail.approveDialog.description(customer.companyName)}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                      {S.detail.approveDialog.cancel}
                    </Button>
                    <Button onClick={() => { setApproveDialogOpen(false); navigate('/customers') }}>
                      {S.detail.approveDialog.approve}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Ban className="size-3.5" data-icon="inline-start" />
                {S.detail.headerActions.deactivate}
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>{S.detail.deactivateDialog.title}</DialogTitle>
                  <DialogDescription>
                    {S.detail.deactivateDialog.description(customer.companyName)}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
                    {S.detail.deactivateDialog.cancel}
                  </Button>
                  <Button variant="destructive" onClick={() => { setDeactivateDialogOpen(false); navigate('/customers') }}>
                    {S.detail.deactivateDialog.deactivate}
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
          <DetailTabs cardContent tabs={tabs} defaultTab="overview" />
        </div>

        {/* Right sidebar - 1/3 */}
        <div className="space-y-4">
          {/* Account Manager card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.detail.sidebar.accountManager}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <Typography variant="body-strong" asChild><p>{customer.accountManager}</p></Typography>
                  <Typography variant="helper" asChild><p>{customer.accountManagerEmail}</p></Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.detail.sidebar.financialSummary}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.financialLabels.outstanding}</dt>
                  <Typography variant="body-strong" asChild><dd>{formatINRCompact(customer.outstandingBalance)}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.financialLabels.overdue}</dt>
                  <dd className={cn('text-sm font-medium', customer.overdueAmount > 0 && 'text-destructive')}>
                    {formatINRCompact(customer.overdueAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.financialLabels.creditLimit}</dt>
                  <Typography variant="body" asChild><dd>{formatINRCompact(customer.creditLimit)}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.financialLabels.paymentTerms}</dt>
                  <Typography variant="body" asChild><dd>{customer.paymentTerms}</dd></Typography>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Quick Info card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.detail.sidebar.quickInfo}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.quickInfoLabels.status}</dt>
                  <dd>
                    <StatusBadge variant={getStatusVariant(customer.status)}>
                      {customer.status}
                    </StatusBadge>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.quickInfoLabels.type}</dt>
                  <Typography variant="body" asChild><dd>{customer.type}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.quickInfoLabels.city}</dt>
                  <Typography variant="body" asChild><dd>{customer.billingCity}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.quickInfoLabels.pricingTier}</dt>
                  <dd className="text-sm">
                    <Badge variant={getPricingTierVariant(customer.pricingTier)}>
                      {customer.pricingTier}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.quickInfoLabels.totalOrders}</dt>
                  <Typography variant="body" asChild><dd>{customer.totalOrders}</dd></Typography>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Approval card */}
          {customer.approvedBy && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{S.detail.sidebar.approval}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.approvalLabels.approvedBy}</dt>
                    <Typography variant="body" asChild><dd>{customer.approvedBy}</dd></Typography>
                  </div>
                  {customer.approvedDate && (
                    <div className="flex items-center justify-between">
                      <dt className="text-xs font-ui text-muted-foreground">{S.detail.sidebar.approvalLabels.date}</dt>
                      <Typography variant="body" asChild><dd>{formatDate(customer.approvedDate)}</dd></Typography>
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
                <CardTitle>{S.detail.sidebar.notes}</CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="body" tone="muted" asChild><p>{customer.notes}</p></Typography>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{S.detail.rejectDialog.title}</DialogTitle>
            <DialogDescription>
              {S.detail.rejectDialog.description}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={S.detail.rejectDialog.placeholder}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {S.detail.rejectDialog.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => { setRejectDialogOpen(false); navigate('/customers') }}
            >
              {S.detail.rejectDialog.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


