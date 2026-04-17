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

import { mockVendorRegistrations } from '@/modules/vendors/data/vendors'
import type { VendorOnboardingStatus, VendorDocument } from '@/modules/vendors/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStatusVariant(status: VendorOnboardingStatus): StatusBadgeVariant {
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

function getDocStatusVariant(status: VendorDocument['status']): StatusBadgeVariant {
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
const mockPerformance = {
  rating: 4.5,
  onTimeDelivery: 94,
  qualityScore: 97,
  totalOrders: 48,
  totalSpend: 12500000,
}

function VendorDetailPage() {
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
        <h2 className="font-display text-xl font-semibold">Vendor not found</h2>
        <p className="text-sm text-muted-foreground">
          The vendor you are looking for does not exist or has been removed.
        </p>
        <Button variant="outline" render={<Link to="/vendors" />}>
          Back to Vendors
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
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Type</dt>
                <dd className="text-sm">{vendor.companyType}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Industry</dt>
                <dd className="text-sm">{vendor.industry}</dd>
              </div>
            </div>
            {vendor.website && (
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Website</dt>
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
                <dt className="text-xs font-ui text-muted-foreground">Primary Contact</dt>
                <dd className="text-sm">{vendor.primaryContact}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Email</dt>
                <dd className="text-sm">{vendor.primaryEmail}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Phone</dt>
                <dd className="text-sm">{vendor.primaryPhone}</dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      {vendor.secondaryContact && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Secondary Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Name</dt>
                  <dd className="text-sm">{vendor.secondaryContact}</dd>
                </div>
              </div>
              {vendor.secondaryEmail && (
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs font-ui text-muted-foreground">Email</dt>
                    <dd className="text-sm">{vendor.secondaryEmail}</dd>
                  </div>
                </div>
              )}
              {vendor.secondaryPhone && (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs font-ui text-muted-foreground">Phone</dt>
                    <dd className="text-sm">{vendor.secondaryPhone}</dd>
                  </div>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Address</CardTitle>
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
          <CardTitle>Tax Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">GST Number</dt>
              <dd className="text-sm font-mono">{vendor.gstNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">PAN</dt>
              <dd className="text-sm font-mono">{vendor.panNumber}</dd>
            </div>
            {vendor.msmeRegistration && (
              <div>
                <dt className="text-xs font-ui text-muted-foreground">MSME Registration</dt>
                <dd className="text-sm font-mono">{vendor.msmeRegistration}</dd>
              </div>
            )}
            {vendor.tradeLicense && (
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Trade License</dt>
                <dd className="text-sm font-mono">{vendor.tradeLicense}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Account Name</dt>
              <dd className="text-sm">{vendor.bankAccountName}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Account Number</dt>
              <dd className="text-sm font-mono">{vendor.bankAccountNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">IFSC Code</dt>
              <dd className="text-sm font-mono">{vendor.bankIfscCode}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Bank Name</dt>
              <dd className="text-sm">{vendor.bankName}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Branch</dt>
              <dd className="text-sm">{vendor.bankBranch}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Payment Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Payment Terms</dt>
              <dd className="text-sm">{vendor.paymentTerms}</dd>
            </div>
            <div>
              <dt className="text-xs font-ui text-muted-foreground">Credit Limit</dt>
              <dd className="text-sm font-medium">
                {vendor.creditLimit ? formatCurrency(vendor.creditLimit) : 'N/A'}
              </dd>
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
        <p className="text-sm text-muted-foreground">
          {verifiedDocs}/{vendor.documents.length} documents verified
        </p>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Upload className="size-3.5" data-icon="inline-start" />
            Upload Document
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Upload vendor documents for verification.</DialogDescription>
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
              <TableHead>Expiry</TableHead>
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
          <CardTitle>Product Categories</CardTitle>
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
          <CardTitle>Available Parts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View parts available from this vendor in the{' '}
            <Link to="/ims/categories" className="text-primary hover:underline">
              IMS Categories
            </Link>{' '}
            module.
          </p>
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
            label: 'Rating',
            value: `${mockPerformance.rating}/5`,
            icon: Star,
          },
          {
            label: 'On-Time Delivery',
            value: `${mockPerformance.onTimeDelivery}%`,
            icon: TrendingUp,
          },
          {
            label: 'Quality Score',
            value: `${mockPerformance.qualityScore}%`,
            icon: ShieldCheck,
          },
          {
            label: 'Total Orders',
            value: mockPerformance.totalOrders,
            icon: Package,
          },
        ]}
      />

      <Card size="sm">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-ui text-muted-foreground">Total Spend</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(mockPerformance.totalSpend)}
              </p>
            </div>
            <IndianRupee className="size-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              View order history in the{' '}
              <Link to="/procurement" className="text-primary hover:underline">
                Procurement
              </Link>{' '}
              module.
            </p>
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
    { id: 'overview', label: 'Overview', content: overviewContent },
    { id: 'tax-bank', label: 'Tax & Bank', content: taxBankContent },
    {
      id: 'documents',
      label: 'Documents',
      count: vendor.documents.length,
      content: documentsContent,
    },
    { id: 'categories', label: 'Categories', content: categoriesContent },
    { id: 'performance', label: 'Performance', content: performanceContent },
    { id: 'comments', label: 'Comments', content: commentsContent },
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
                    <DialogTitle>Approve Vendor</DialogTitle>
                    <DialogDescription>
                      Approve "{vendor.companyName}" as a registered vendor?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => { setApproveDialogOpen(false); navigate('/vendors') }}>
                      Approve
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Ban className="size-3.5" data-icon="inline-start" />
                Suspend
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Suspend Vendor</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to suspend "{vendor.companyName}"?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => { setSuspendDialogOpen(false); navigate('/vendors') }}>
                    Suspend
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
          {/* Status card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatusBadge variant={getStatusVariant(vendor.status)}>
                  {vendor.status}
                </StatusBadge>
                {vendor.rejectionReason && (
                  <p className="text-xs text-destructive">{vendor.rejectionReason}</p>
                )}
              </div>
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
                  <dt className="text-xs font-ui text-muted-foreground">Contact</dt>
                  <dd className="text-sm">{vendor.primaryContact}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">City</dt>
                  <dd className="text-sm">{vendor.city}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Payment Terms</dt>
                  <dd className="text-sm">{vendor.paymentTerms}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Rating</dt>
                  <dd className="text-sm">
                    <span className="text-[#f6c000]">&#9733;</span>{' '}
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
                <CardTitle>Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Approved By</dt>
                    <dd className="text-sm">{vendor.approvedBy}</dd>
                  </div>
                  {vendor.approvedDate && (
                    <div className="flex items-center justify-between">
                      <dt className="text-xs font-ui text-muted-foreground">Date</dt>
                      <dd className="text-sm">{formatDate(vendor.approvedDate)}</dd>
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
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{vendor.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reject dialog (not in header actions but accessible) */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Vendor</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this vendor registration.
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
              onClick={() => { setRejectDialogOpen(false); navigate('/vendors') }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VendorDetailPage
