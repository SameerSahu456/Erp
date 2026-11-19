import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistedState } from '@/hooks/use-persisted-state'
import { CheckCircle, XCircle, Eye, ClipboardCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from "@/components/ui/typography"
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/page-shells'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { OperationDialog } from '@/components/common/dialogs/OperationDialog'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { EmptyState } from '@/components/common/feedback/EmptyState'

import { mockVendorRegistrations } from '@/modules/vendors/data/vendors'
import type { VendorOnboardingStatus, VendorRegistration } from '@/modules/vendors/types'
import { formatIST_date } from "@shared/lib/date"
import { APPROVALS_STRINGS } from './approvals.strings'


export const PENDING_STATUSES: VendorOnboardingStatus[] = ['Submitted', 'Under Review', 'Documents Pending']

export const formatDate = (dateStr: string) => formatIST_date(dateStr)

export function getStatusVariant(status: VendorOnboardingStatus): StatusBadgeVariant {
  switch (status) {
    case 'Under Review':
      return 'warning'
    case 'Documents Pending':
      return 'error'
    default:
      return 'info'
  }
}


export function VendorApprovalsBody() {
  const [statusFilter, setStatusFilter] = usePersistedState<string>('vendors-approvals:status', 'all')
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
      <PageHeader
        title={APPROVALS_STRINGS.page.title}
        subtitle={APPROVALS_STRINGS.page.subtitle}
        breadcrumbs={[
          { label: APPROVALS_STRINGS.page.breadcrumbVendors, href: '/vendors' },
          { label: APPROVALS_STRINGS.page.breadcrumbApprovals },
        ]}
      />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Typography variant="body" tone="muted" asChild><span>{APPROVALS_STRINGS.filter.statusLabel}</span></Typography>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={APPROVALS_STRINGS.filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{APPROVALS_STRINGS.filter.allPending}</SelectItem>
            <SelectItem value="Submitted">{APPROVALS_STRINGS.filter.submitted}</SelectItem>
            <SelectItem value="Under Review">{APPROVALS_STRINGS.filter.underReview}</SelectItem>
            <SelectItem value="Documents Pending">{APPROVALS_STRINGS.filter.documentsPending}</SelectItem>
          </SelectContent>
        </Select>
        <Typography variant="body" tone="muted" asChild>
          <span>
            {APPROVALS_STRINGS.filter.pendingCount(pendingVendors.length)}
          </span>
        </Typography>
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
                        <Typography variant="helper" className="mt-0.5" asChild>
                          <p>{vendor.vendorCode}</p>
                        </Typography>
                      </div>
                      <StatusBadge variant={getStatusVariant(vendor.status)}>
                        {vendor.status}
                      </StatusBadge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">{APPROVALS_STRINGS.card.city}</span>{' '}
                        <span className="font-medium">{vendor.city}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{APPROVALS_STRINGS.card.contact}</span>{' '}
                        <span className="font-medium">{vendor.primaryContact}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{APPROVALS_STRINGS.card.submitted}</span>{' '}
                        <span className="font-medium">{formatDate(vendor.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{APPROVALS_STRINGS.card.docs}</span>{' '}
                        <span className="font-medium">
                          {APPROVALS_STRINGS.card.docsVerified(verifiedCount, totalDocs)}
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
                          {APPROVALS_STRINGS.card.moreCategories(vendor.productCategories.length - 3)}
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
                        {APPROVALS_STRINGS.actions.review}
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => setApproveDialogVendor(vendor)}
                      >
                        <CheckCircle className="size-3" data-icon="inline-start" />
                        {APPROVALS_STRINGS.actions.approve}
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => setRejectDialogVendor(vendor)}
                      >
                        <XCircle className="size-3" data-icon="inline-start" />
                        {APPROVALS_STRINGS.actions.reject}
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
          title={APPROVALS_STRINGS.empty.title}
          description={APPROVALS_STRINGS.empty.description}
        />
      )}

      {/* Approve Dialog */}
      <OperationDialog
        open={approveDialogVendor !== null}
        onOpenChange={(open) => { if (!open) setApproveDialogVendor(null) }}
        className="sm:max-w-sm"
        title={APPROVALS_STRINGS.approveDialog.title}
        footer={
          <>
            <Button variant="outline" onClick={() => setApproveDialogVendor(null)}>
              {APPROVALS_STRINGS.approveDialog.cancel}
            </Button>
            <Button onClick={handleApprove}>{APPROVALS_STRINGS.approveDialog.approve}</Button>
          </>
        }
      >
        <Typography variant="body" tone="muted" asChild>
          <p>{APPROVALS_STRINGS.approveDialog.description(approveDialogVendor?.companyName ?? '')}</p>
        </Typography>
      </OperationDialog>

      {/* Reject Dialog */}
      <OperationDialog
        open={rejectDialogVendor !== null}
        onOpenChange={(open) => { if (!open) { setRejectDialogVendor(null); setRejectReason('') } }}
        className="sm:max-w-sm"
        title={APPROVALS_STRINGS.rejectDialog.title}
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="outline" onClick={() => { setRejectDialogVendor(null); setRejectReason('') }}>
              {APPROVALS_STRINGS.rejectDialog.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={handleReject}
            >
              {APPROVALS_STRINGS.rejectDialog.reject}
            </Button>
          </>
        }
      >
        <Typography variant="body" tone="muted" asChild>
          <p>{APPROVALS_STRINGS.rejectDialog.description(rejectDialogVendor?.companyName ?? '')}</p>
        </Typography>
        <Textarea
          placeholder={APPROVALS_STRINGS.rejectDialog.placeholder}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </OperationDialog>
    </div>
  )
}


