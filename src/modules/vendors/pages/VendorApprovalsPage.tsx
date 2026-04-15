import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, Eye, ClipboardCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'

import { mockVendorRegistrations } from '@/modules/vendors/data/vendors'
import type { VendorOnboardingStatus, VendorRegistration } from '@/modules/vendors/types'

const PENDING_STATUSES: VendorOnboardingStatus[] = ['Submitted', 'Under Review', 'Documents Pending']

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStatusVariant(status: VendorOnboardingStatus): StatusBadgeVariant {
  switch (status) {
    case 'Under Review':
      return 'warning'
    case 'Documents Pending':
      return 'error'
    default:
      return 'info'
  }
}

function VendorApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [approveDialogVendor, setApproveDialogVendor] = useState<VendorRegistration | null>(null)
  const [rejectDialogVendor, setRejectDialogVendor] = useState<VendorRegistration | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const pendingVendors = mockVendorRegistrations.filter((v) => {
    if (!PENDING_STATUSES.includes(v.status)) return false
    if (statusFilter !== 'all' && v.status !== statusFilter) return false
    return true
  })

  function handleApprove() {
    setApproveDialogVendor(null)
  }

  function handleReject() {
    setRejectDialogVendor(null)
    setRejectReason('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Vendor Approvals</h2>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pending</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="Under Review">Under Review</SelectItem>
            <SelectItem value="Documents Pending">Documents Pending</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {pendingVendors.length} vendor{pendingVendors.length !== 1 ? 's' : ''} pending
        </span>
      </div>

      {/* Vendor cards */}
      {pendingVendors.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pendingVendors.map((vendor) => {
            const verifiedCount = vendor.documents.filter((d) => d.status === 'Verified').length
            const totalDocs = vendor.documents.length

            return (
              <Card key={vendor.id} size="sm">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold truncate">
                            {vendor.companyName}
                          </h3>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {vendor.companyType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {vendor.vendorCode}
                        </p>
                      </div>
                      <StatusBadge variant={getStatusVariant(vendor.status)}>
                        {vendor.status}
                      </StatusBadge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">City:</span>{' '}
                        <span className="font-medium">{vendor.city}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contact:</span>{' '}
                        <span className="font-medium">{vendor.primaryContact}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Submitted:</span>{' '}
                        <span className="font-medium">{formatDate(vendor.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Docs:</span>{' '}
                        <span className="font-medium">
                          {verifiedCount}/{totalDocs} verified
                        </span>
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-1">
                      {vendor.productCategories.slice(0, 3).map((cat) => (
                        <Badge key={cat} variant="outline" className="text-[10px]">
                          {cat}
                        </Badge>
                      ))}
                      {vendor.productCategories.length > 3 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{vendor.productCategories.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <Button
                        variant="outline"
                        size="xs"
                        render={<Link to={`/vendors/${vendor.id}`} />}
                      >
                        <Eye className="size-3" data-icon="inline-start" />
                        Review
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => setApproveDialogVendor(vendor)}
                      >
                        <CheckCircle className="size-3" data-icon="inline-start" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => setRejectDialogVendor(vendor)}
                      >
                        <XCircle className="size-3" data-icon="inline-start" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="No Pending Approvals"
          description="All vendor registrations have been reviewed. New submissions will appear here."
        />
      )}

      {/* Approve Dialog */}
      <Dialog
        open={approveDialogVendor !== null}
        onOpenChange={(open) => { if (!open) setApproveDialogVendor(null) }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve "{approveDialogVendor?.companyName}" as a registered vendor?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogVendor(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogVendor !== null}
        onOpenChange={(open) => { if (!open) { setRejectDialogVendor(null); setRejectReason('') } }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Vendor</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting "{rejectDialogVendor?.companyName}".
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogVendor(null); setRejectReason('') }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={handleReject}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VendorApprovalsPage
