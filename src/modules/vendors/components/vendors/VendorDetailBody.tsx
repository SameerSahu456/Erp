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
  Star,
  ShieldCheck,
  Ban,
  CheckCircle,
  Upload,
  IndianRupee,
  Package,
  TrendingUp,
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
import { OperationDialog } from '@/components/common/dialogs/OperationDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { ExpandableClampText } from '@/components/common/display/ExpandableClampText'
import { StatsRow } from '@/components/common/display/StatsRow'
import { FileUpload } from '@/components/common/files/FileUpload'
import { EntityHeader } from '@/components/page-shells/EntityHeader'
import { DetailTabs } from '@/components/page-shells/DetailTabs'
import { CommentSection } from '@/components/common/views/CommentSection'

import { mockVendorRegistrations } from '@/modules/vendors/data/vendors'
import type { VendorOnboardingStatus, VendorDocument } from '@/modules/vendors/types'
import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"
import { VENDORS_STRINGS } from './vendors.strings'



export const formatDate = (dateStr: string) => formatIST_date(dateStr)

export function getStatusVariant(status: VendorOnboardingStatus): StatusBadgeVariant {
  switch (status) {
    case 'Active':
    case 'Approved':
      return 'success'
    case 'Suspended':
    case 'Blacklisted':
      return 'error'
    case 'Under Review':
    case 'Documents Pending':
      return 'warning'
    default:
      return 'info'
  }
}

export function getDocStatusVariant(status: VendorDocument['status']): StatusBadgeVariant {
  switch (status) {
    case 'Verified':
      return 'success'
    case 'Uploaded':
      return 'info'
    case 'Rejected':
    case 'Expired':
      return 'error'
  }
}

// Mock performance data
export const mockPerformance = {
  rating: 4.5,
  onTimeDelivery: 94,
  qualityScore: 97,
  totalOrders: 48,
  totalSpend: 12500000,
}


export function VendorDetailBody() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)

  const vendor = mockVendorRegistrations.find((v) => v.id === id)

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Typography variant="card-title" asChild><h2>{VENDORS_STRINGS.detail.notFoundTitle}</h2></Typography>
        <Typography variant="body" tone="muted" asChild>
          <p>
            {VENDORS_STRINGS.detail.notFoundDescription}
          </p>
        </Typography>
        <Button variant="outline" render={<Link to="/vendors" />}>
          {VENDORS_STRINGS.detail.backToVendors}
        </Button>
      </div>
    )
  }

  const isPending = ['Submitted', 'Under Review', 'Documents Pending'].includes(vendor.status)
  const verifiedDocs = vendor.documents.filter((d) => d.status === 'Verified').length

  // --- Tab 1: Overview ---
  const overviewContent = (
    <div className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{VENDORS_STRINGS.detail.companyInfo.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.companyInfo.type}</dt>
                <Typography variant="body" asChild><dd>{vendor.companyType}</dd></Typography>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.companyInfo.industry}</dt>
                <Typography variant="body" asChild><dd>{vendor.industry}</dd></Typography>
              </div>
            </div>
            {vendor.website && (
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.companyInfo.website}</dt>
                  <dd className="text-sm">
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {vendor.website}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.companyInfo.primaryContact}</dt>
                <Typography variant="body" asChild><dd>{vendor.primaryContact}</dd></Typography>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.companyInfo.email}</dt>
                <Typography variant="body" asChild><dd>{vendor.primaryEmail}</dd></Typography>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.companyInfo.phone}</dt>
                <Typography variant="body" asChild><dd>{vendor.primaryPhone}</dd></Typography>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      {vendor.secondaryContact && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{VENDORS_STRINGS.detail.secondaryContact.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.secondaryContact.name}</dt>
                  <Typography variant="body" asChild><dd>{vendor.secondaryContact}</dd></Typography>
                </div>
              </div>
              {vendor.secondaryEmail && (
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.secondaryContact.email}</dt>
                    <Typography variant="body" asChild><dd>{vendor.secondaryEmail}</dd></Typography>
                  </div>
                </div>
              )}
              {vendor.secondaryPhone && (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.secondaryContact.phone}</dt>
                    <Typography variant="body" asChild><dd>{vendor.secondaryPhone}</dd></Typography>
                  </div>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{VENDORS_STRINGS.detail.address.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-muted-foreground" />
            <div className="text-sm">
              <p>{vendor.address}</p>
              <p>
                {vendor.city}, {vendor.state} {vendor.pincode}
              </p>
              <p>{vendor.country}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // --- Tab 2: Tax & Bank ---
  const taxBankContent = (
    <div className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{VENDORS_STRINGS.detail.taxInfo.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.taxInfo.gstNumber}</dt>
              <dd className="text-sm font-mono">{vendor.gstNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.taxInfo.pan}</dt>
              <dd className="text-sm font-mono">{vendor.panNumber}</dd>
            </div>
            {vendor.msmeRegistration && (
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.taxInfo.msmeRegistration}</dt>
                <dd className="text-sm font-mono">{vendor.msmeRegistration}</dd>
              </div>
            )}
            {vendor.tradeLicense && (
              <div>
                <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.taxInfo.tradeLicense}</dt>
                <dd className="text-sm font-mono">{vendor.tradeLicense}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{VENDORS_STRINGS.detail.bankDetails.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.bankDetails.accountName}</dt>
              <Typography variant="body" asChild><dd>{vendor.bankAccountName}</dd></Typography>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.bankDetails.accountNumber}</dt>
              <dd className="text-sm font-mono">{vendor.bankAccountNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.bankDetails.ifscCode}</dt>
              <dd className="text-sm font-mono">{vendor.bankIfscCode}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.bankDetails.bankName}</dt>
              <Typography variant="body" asChild><dd>{vendor.bankName}</dd></Typography>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.bankDetails.branch}</dt>
              <Typography variant="body" asChild><dd>{vendor.bankBranch}</dd></Typography>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{VENDORS_STRINGS.detail.paymentTerms.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.paymentTerms.paymentTerms}</dt>
              <Typography variant="body" asChild><dd>{vendor.paymentTerms}</dd></Typography>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.paymentTerms.creditLimit}</dt>
              <Typography variant="body-strong" asChild>
                <dd>
                  {vendor.creditLimit ? formatINRCompact(vendor.creditLimit) : VENDORS_STRINGS.detail.paymentTerms.notApplicable}
                </dd>
              </Typography>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )

  // --- Tab 3: Documents ---
  const documentsContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Typography variant="body" tone="muted" asChild>
          <p>
            {VENDORS_STRINGS.detail.documents.verifiedCount(verifiedDocs, vendor.documents.length)}
          </p>
        </Typography>
        <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="size-3.5" data-icon="inline-start" />
          {VENDORS_STRINGS.detail.documents.uploadDocument}
        </Button>
        <OperationDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          className="sm:max-w-md"
          title={VENDORS_STRINGS.detail.documents.uploadDialogTitle}
          description={VENDORS_STRINGS.detail.documents.uploadDialogDescription}
          footer={
            <>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                {VENDORS_STRINGS.detail.documents.cancel}
              </Button>
              <Button onClick={() => setUploadDialogOpen(false)}>{VENDORS_STRINGS.detail.documents.upload}</Button>
            </>
          }
        >
          <FileUpload
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            multiple
            value={uploadFiles}
            onChange={setUploadFiles}
          />
        </OperationDialog>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{VENDORS_STRINGS.detail.documents.columns.documentType}</TableHead>
              <TableHead>{VENDORS_STRINGS.detail.documents.columns.fileName}</TableHead>
              <TableHead>{VENDORS_STRINGS.detail.documents.columns.status}</TableHead>
              <TableHead>{VENDORS_STRINGS.detail.documents.columns.uploaded}</TableHead>
              <TableHead>{VENDORS_STRINGS.detail.documents.columns.expiry}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendor.documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.type}</TableCell>
                <TableCell className="text-muted-foreground">{doc.fileName}</TableCell>
                <TableCell>
                  <StatusBadge variant={getDocStatusVariant(doc.status)}>
                    {doc.status}
                  </StatusBadge>
                </TableCell>
                <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                <TableCell
                  className={cn(
                    doc.expiryDate &&
                      new Date(doc.expiryDate) < new Date() &&
                      'text-destructive'
                  )}
                >
                  {doc.expiryDate ? formatDate(doc.expiryDate) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  // --- Tab 4: Categories ---
  const categoriesContent = (
    <div className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{VENDORS_STRINGS.detail.categories.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {vendor.productCategories.map((cat) => (
              <Badge key={cat} variant="secondary" className="text-sm">
                {cat}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{VENDORS_STRINGS.detail.categories.availableParts.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Typography variant="body" tone="muted" asChild>
            <p>
              {VENDORS_STRINGS.detail.categories.availableParts.description}{' '}
              <Link to="/ims/categories" className="text-primary hover:underline">
                {VENDORS_STRINGS.detail.categories.availableParts.imsLink}
              </Link>{' '}
              {VENDORS_STRINGS.detail.categories.availableParts.moduleSuffix}
            </p>
          </Typography>
        </CardContent>
      </Card>
    </div>
  )

  // --- Tab 5: Performance ---
  const performanceContent = (
    <div className="space-y-6">
      <StatsRow
        stats={[
          {
            label: VENDORS_STRINGS.detail.performance.stats.rating,
            value: `${mockPerformance.rating}/5`,
            icon: Star,
          },
          {
            label: VENDORS_STRINGS.detail.performance.stats.onTimeDelivery,
            value: `${mockPerformance.onTimeDelivery}%`,
            icon: TrendingUp,
          },
          {
            label: VENDORS_STRINGS.detail.performance.stats.qualityScore,
            value: `${mockPerformance.qualityScore}%`,
            icon: ShieldCheck,
          },
          {
            label: VENDORS_STRINGS.detail.performance.stats.totalOrders,
            value: mockPerformance.totalOrders,
            icon: Package,
          },
        ]}
      />

      <Card size="sm">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="helper" tone="muted" asChild><p>{VENDORS_STRINGS.detail.performance.totalSpend}</p></Typography>
              <Typography variant="page-title" asChild>
                <p className="mt-1">
                  {formatINRCompact(mockPerformance.totalSpend)}
                </p>
              </Typography>
            </div>
            <IndianRupee className="size-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{VENDORS_STRINGS.detail.performance.orderHistory.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Typography variant="body" tone="muted" asChild>
              <p>
                {VENDORS_STRINGS.detail.performance.orderHistory.description}{' '}
                <Link to="/procurement" className="text-primary hover:underline">
                  {VENDORS_STRINGS.detail.performance.orderHistory.procurementLink}
                </Link>{' '}
                {VENDORS_STRINGS.detail.performance.orderHistory.moduleSuffix}
              </p>
            </Typography>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // --- Tab 6: Comments ---
  const commentsContent = (
    <CommentSection entityType="account" entityId={vendor.id} />
  )

  const tabs = [
    { id: 'overview', label: VENDORS_STRINGS.detail.tabs.overview, content: overviewContent },
    { id: 'tax-bank', label: VENDORS_STRINGS.detail.tabs.taxBank, content: taxBankContent },
    {
      id: 'documents',
      label: VENDORS_STRINGS.detail.tabs.documents,
      count: vendor.documents.length,
      content: documentsContent,
    },
    { id: 'categories', label: VENDORS_STRINGS.detail.tabs.categories, content: categoriesContent },
    { id: 'performance', label: VENDORS_STRINGS.detail.tabs.performance, content: performanceContent },
    { id: 'comments', label: VENDORS_STRINGS.detail.tabs.comments, content: commentsContent },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={vendor.companyName}
        subtitle={vendor.vendorCode}
        status={{ label: vendor.status, variant: getStatusVariant(vendor.status) }}
        backHref="/vendors"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link to={`/vendors/${vendor.id}/edit`} />}
            >
              <Pencil className="size-3.5" data-icon="inline-start" />
              {VENDORS_STRINGS.detail.edit}
            </Button>
            {isPending && (
              <>
                <Button size="sm" onClick={() => setApproveDialogOpen(true)}>
                  <CheckCircle className="size-3.5" data-icon="inline-start" />
                  {VENDORS_STRINGS.detail.approve}
                </Button>
                <OperationDialog
                  open={approveDialogOpen}
                  onOpenChange={setApproveDialogOpen}
                  className="sm:max-w-sm"
                  title={VENDORS_STRINGS.detail.approveDialog.title}
                  footer={
                    <>
                      <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                        {VENDORS_STRINGS.detail.approveDialog.cancel}
                      </Button>
                      <Button onClick={() => { setApproveDialogOpen(false); navigate('/vendors') }}>
                        {VENDORS_STRINGS.detail.approveDialog.approve}
                      </Button>
                    </>
                  }
                >
                  <Typography variant="body" tone="muted" asChild>
                    <p>{VENDORS_STRINGS.detail.approveDialog.description(vendor.companyName)}</p>
                  </Typography>
                </OperationDialog>
              </>
            )}
            <Button variant="destructive" size="sm" onClick={() => setSuspendDialogOpen(true)}>
              <Ban className="size-3.5" data-icon="inline-start" />
              {VENDORS_STRINGS.detail.suspend}
            </Button>
            <OperationDialog
              open={suspendDialogOpen}
              onOpenChange={setSuspendDialogOpen}
              className="sm:max-w-sm"
              title={VENDORS_STRINGS.detail.suspendDialog.title}
              footer={
                <>
                  <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                    {VENDORS_STRINGS.detail.suspendDialog.cancel}
                  </Button>
                  <Button variant="destructive" onClick={() => { setSuspendDialogOpen(false); navigate('/vendors') }}>
                    {VENDORS_STRINGS.detail.suspendDialog.suspend}
                  </Button>
                </>
              }
            >
              <Typography variant="body" tone="muted" asChild>
                <p>{VENDORS_STRINGS.detail.suspendDialog.description(vendor.companyName)}</p>
              </Typography>
            </OperationDialog>
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
          {/* Status card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.detail.sidebar.status.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatusBadge variant={getStatusVariant(vendor.status)}>
                  {vendor.status}
                </StatusBadge>
                {vendor.rejectionReason && (
                  <Typography variant="helper" tone="danger" asChild><p>{vendor.rejectionReason}</p></Typography>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.detail.sidebar.quickInfo.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.sidebar.quickInfo.contact}</dt>
                  <Typography variant="body" asChild><dd>{vendor.primaryContact}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.sidebar.quickInfo.city}</dt>
                  <Typography variant="body" asChild><dd>{vendor.city}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.sidebar.quickInfo.paymentTerms}</dt>
                  <Typography variant="body" asChild><dd>{vendor.paymentTerms}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.sidebar.quickInfo.rating}</dt>
                  <dd className="text-sm">
                    {VENDORS_STRINGS.starIcon}{' '}
                    {vendor.status === 'Active' ? '4.5' : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Approval card */}
          {vendor.approvedBy && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{VENDORS_STRINGS.detail.sidebar.approval.cardTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.sidebar.approval.approvedBy}</dt>
                    <Typography variant="body" asChild><dd>{vendor.approvedBy}</dd></Typography>
                  </div>
                  {vendor.approvedDate && (
                    <div className="flex items-center justify-between">
                      <dt className="text-xs font-ui text-muted-foreground">{VENDORS_STRINGS.detail.sidebar.approval.date}</dt>
                      <Typography variant="body" asChild><dd>{formatDate(vendor.approvedDate)}</dd></Typography>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {vendor.notes && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{VENDORS_STRINGS.detail.sidebar.notes.cardTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpandableClampText text={vendor.notes} lines={3} variant="body" tone="muted" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reject dialog (not in header actions but accessible) */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{VENDORS_STRINGS.detail.rejectDialog.title}</DialogTitle>
            <DialogDescription>
              {VENDORS_STRINGS.detail.rejectDialog.description}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={VENDORS_STRINGS.detail.rejectDialog.placeholder}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {VENDORS_STRINGS.detail.rejectDialog.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => { setRejectDialogOpen(false); navigate('/vendors') }}
            >
              {VENDORS_STRINGS.detail.rejectDialog.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


