import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Replace,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Plus,
  IndianRupee,
  Truck,
} from 'lucide-react'

import {
  mockReplacementRequests,
  type ReplacementRequest,
  type ReplacementRequestStatus,
  type ReplacementPriority,
  type ReplacementNextStep,
} from '../data/replacement-requests'
import { mockDevices } from '../data/devices'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { PageHeader } from '@/components/page'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const STATUS_VARIANT: Record<ReplacementRequestStatus, StatusBadgeVariant> = {
  Pending: 'warning',
  Approved: 'info',
  Rejected: 'error',
  'Replacement Issued': 'success',
  Closed: 'neutral',
}

const PRIORITY_VARIANT: Record<ReplacementPriority, StatusBadgeVariant> = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Critical: 'error',
}

const NEXT_STEP_VARIANT: Record<ReplacementNextStep, StatusBadgeVariant> = {
  'Dispatch': 'success',
  'Pricing Update': 'warning',
  'Pending Decision': 'neutral',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

function ReplacementRequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ReplacementRequest[]>(mockReplacementRequests)
  const [actionRequestId, setActionRequestId] = useState<string | null>(null)
  const [actionMode, setActionMode] = useState<'approve' | 'reject' | 'issue' | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [replacementBarcode, setReplacementBarcode] = useState('')

  const summary = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'Pending').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    issued: requests.filter((r) => r.status === 'Replacement Issued').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
  }), [requests])

  const closeActionDialog = () => {
    setActionRequestId(null)
    setActionMode(null)
    setActionNotes('')
    setReplacementBarcode('')
  }

  const actionTarget = useMemo(
    () => requests.find((r) => r.id === actionRequestId) ?? null,
    [actionRequestId, requests],
  )

  const submitAction = () => {
    if (!actionTarget || !actionMode) return
    const now = new Date().toISOString()

    if (actionMode === 'approve') {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === actionTarget.id
            ? {
                ...r,
                status: 'Approved' as const,
                approvedBy: 'Rajesh Kumar',
                approvedAt: now,
                notes: actionNotes || r.notes,
              }
            : r,
        ),
      )
      const route =
        actionTarget.nextStep === 'Pricing Update'
          ? 'Pricing Update — SO line will be amended.'
          : actionTarget.nextStep === 'Dispatch'
            ? 'Dispatch — same part, no pricing change.'
            : 'Awaiting replacement-part decision.'
      toast.success(`${actionTarget.requestNumber} approved. ${route}`)
    } else if (actionMode === 'reject') {
      if (!actionNotes.trim()) {
        toast.error('Please provide a rejection reason.')
        return
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === actionTarget.id
            ? {
                ...r,
                status: 'Rejected' as const,
                approvedBy: 'Rajesh Kumar',
                approvedAt: now,
                rejectedReason: actionNotes,
              }
            : r,
        ),
      )
      toast.success(`${actionTarget.requestNumber} rejected`)
    } else if (actionMode === 'issue') {
      if (!replacementBarcode.trim()) {
        toast.error('Please enter the replacement device barcode.')
        return
      }
      const replacementDevice = mockDevices.find(
        (d) => d.barcode.toLowerCase() === replacementBarcode.trim().toLowerCase(),
      )
      setRequests((prev) =>
        prev.map((r) =>
          r.id === actionTarget.id
            ? {
                ...r,
                status: 'Replacement Issued' as const,
                replacementDeviceId: replacementDevice?.id,
                replacementDeviceBarcode: replacementBarcode.trim(),
                replacementIssuedAt: now,
                notes: actionNotes || r.notes,
              }
            : r,
        ),
      )
      toast.success(`Replacement ${replacementBarcode.trim()} issued for ${actionTarget.requestNumber}`)
    }
    closeActionDialog()
  }

  const rows = useMemo(
    () =>
      requests.map((r) => ({
        id: r.id,
        _deviceId: r.deviceId,
        _salesOrderId: r.salesOrderId,
        requestNumber: r.requestNumber,
        salesOrderNumber: r.salesOrderNumber,
        customer: r.customer,
        originalPart: `${r.originalPartName}\n${r.originalPartSku}`,
        replacementPart: r.replacementPartName
          ? `${r.replacementPartName}\n${r.replacementPartSku}`
          : '—',
        replacementType: r.replacementType ?? '—',
        priceDelta: r.priceDelta,
        nextStep: r.nextStep,
        reason: r.reason,
        priority: r.priority,
        status: r.status,
        requestedBy: r.requestedBy,
        requestedAt: formatDate(r.requestedAt),
        _status: r.status,
        _priority: r.priority,
        _nextStep: r.nextStep,
        _replacementType: r.replacementType,
      })),
    [requests],
  )

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `Pending (${summary.pending})`,
        columns: [
          { key: 'requestNumber', label: 'Request #', sortable: true },
          { key: 'salesOrderNumber', label: 'Sales Order', sortable: true },
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'originalPart', label: 'Original Part' },
          { key: 'replacementType', label: 'Replacement', sortable: true },
          { key: 'nextStep', label: 'Next Step' },
          { key: 'priority', label: 'Priority', sortable: true },
          { key: 'requestedAt', label: 'Date', sortable: true },
          { key: 'actions', label: 'Actions' },
        ],
        data: rows.filter((r) => r._status === 'Pending'),
      },
      {
        id: 'approved',
        label: `Approved (${summary.approved})`,
        columns: [
          { key: 'requestNumber', label: 'Request #', sortable: true },
          { key: 'salesOrderNumber', label: 'Sales Order', sortable: true },
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'replacementPart', label: 'Replacement Part' },
          { key: 'priceDelta', label: 'Price Δ', align: 'right' as const },
          { key: 'nextStep', label: 'Route' },
          { key: 'requestedAt', label: 'Requested', sortable: true },
          { key: 'actions', label: 'Actions' },
        ],
        data: rows.filter((r) => r._status === 'Approved'),
      },
      {
        id: 'issued',
        label: `Issued (${summary.issued})`,
        columns: [
          { key: 'requestNumber', label: 'Request #', sortable: true },
          { key: 'salesOrderNumber', label: 'Sales Order' },
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'replacementPart', label: 'Replacement Part' },
          { key: 'priceDelta', label: 'Price Δ', align: 'right' as const },
          { key: 'requestedAt', label: 'Requested', sortable: true },
          { key: 'status', label: 'Status' },
        ],
        data: rows.filter((r) => r._status === 'Replacement Issued' || r._status === 'Closed'),
      },
      {
        id: 'rejected',
        label: `Rejected (${summary.rejected})`,
        columns: [
          { key: 'requestNumber', label: 'Request #', sortable: true },
          { key: 'salesOrderNumber', label: 'Sales Order' },
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'reason', label: 'Reason' },
          { key: 'requestedAt', label: 'Date', sortable: true },
        ],
        data: rows.filter((r) => r._status === 'Rejected'),
      },
      {
        id: 'all',
        label: `All (${requests.length})`,
        columns: [
          { key: 'requestNumber', label: 'Request #', sortable: true },
          { key: 'salesOrderNumber', label: 'Sales Order', sortable: true },
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'replacementType', label: 'Replacement' },
          { key: 'priceDelta', label: 'Price Δ', align: 'right' as const },
          { key: 'nextStep', label: 'Route' },
          { key: 'status', label: 'Status' },
          { key: 'requestedAt', label: 'Date', sortable: true },
        ],
        data: rows,
      },
    ],
    [rows, requests, summary],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'requestNumber') {
        return { display: <span className="font-medium">{String(value)}</span> }
      }
      if (key === 'salesOrderNumber') {
        const so = String(value)
        const id = row._salesOrderId as string
        return {
          display: (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (id) navigate(`/crm/sales-orders/${id}`)
              }}
              className="font-mono text-sm wms-link"
            >
              {so}
            </button>
          ),
        }
      }
      if (key === 'originalPart' || key === 'replacementPart') {
        const v = String(value)
        if (v === '—') return { display: <span className="text-muted-foreground">—</span> }
        const [name, sku] = v.split('\n')
        return {
          display: (
            <div className="flex flex-col leading-tight">
              <span className="font-medium">{name}</span>
              <span className="text-xs font-mono text-muted-foreground">{sku}</span>
            </div>
          ),
        }
      }
      if (key === 'replacementType') {
        const v = String(value)
        if (v === '—') return { display: <span className="text-muted-foreground">—</span> }
        const variant: StatusBadgeVariant = v === 'Same Part' ? 'success' : 'warning'
        return { display: <StatusBadge variant={variant}>{v}</StatusBadge> }
      }
      if (key === 'priceDelta') {
        const delta = value as number | undefined
        if (delta === undefined || delta === null) {
          return { display: <span className="text-muted-foreground">—</span> }
        }
        if (delta === 0) {
          return { display: <span className="text-muted-foreground">No change</span> }
        }
        const sign = delta > 0 ? '+' : ''
        const colour = delta > 0 ? 'text-amber-600' : 'text-emerald-600'
        return {
          display: (
            <span className={`font-medium ${colour}`}>
              {sign}{formatINR(delta)}
            </span>
          ),
        }
      }
      if (key === 'nextStep') {
        const step = value as ReplacementNextStep
        return { display: <StatusBadge variant={NEXT_STEP_VARIANT[step]}>{step}</StatusBadge> }
      }
      if (key === 'status') {
        const status = value as ReplacementRequestStatus
        return {
          display: <StatusBadge variant={STATUS_VARIANT[status]}>{status}</StatusBadge>,
        }
      }
      if (key === 'priority') {
        const priority = value as ReplacementPriority
        return {
          display: <StatusBadge variant={PRIORITY_VARIANT[priority]}>{priority}</StatusBadge>,
        }
      }
      if (key === 'actions') {
        const status = row._status as ReplacementRequestStatus
        const id = row.id as string
        const stop = (e: React.MouseEvent) => e.stopPropagation()
        if (status === 'Pending') {
          return {
            display: (
              <div className="flex gap-2" onClick={stop}>
                <button
                  type="button"
                  onClick={() => {
                    setActionRequestId(id)
                    setActionMode('approve')
                  }}
                  className="text-sm font-medium wms-link"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionRequestId(id)
                    setActionMode('reject')
                  }}
                  className="text-sm font-medium text-destructive hover:underline"
                >
                  Reject
                </button>
              </div>
            ),
          }
        }
        if (status === 'Approved') {
          return {
            display: (
              <div className="flex gap-2" onClick={stop}>
                <button
                  type="button"
                  onClick={() => {
                    setActionRequestId(id)
                    setActionMode('issue')
                  }}
                  className="text-sm font-medium wms-link"
                >
                  Issue Replacement
                </button>
              </div>
            ),
          }
        }
        return { display: <span className="text-xs text-muted-foreground">—</span> }
      }
      return null
    },
    [navigate],
  )

  const actionTitle =
    actionMode === 'approve'
      ? 'Approve Replacement Request'
      : actionMode === 'reject'
        ? 'Reject Replacement Request'
        : 'Issue Replacement Device'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Replacement Requests"
        subtitle="Customer replacements raised against dispatched Sales Orders. Same-part requests route to dispatch; different-part requests trigger SO pricing updates."
        breadcrumbs={[{ label: 'Warehouse' }, { label: 'Replacement Requests' }]}
        actions={
          <Button onClick={() => navigate('/wms/replacements/new')}>
            <Plus className="mr-1.5 size-4" />
            New Replacement Request
          </Button>
        }
      />

      <StatsRow
        stats={[
          { label: 'Pending', value: summary.pending, icon: Clock },
          { label: 'Approved', value: summary.approved, icon: CheckCircle2 },
          { label: 'Issued', value: summary.issued, icon: PackageCheck },
          { label: 'Rejected', value: summary.rejected, icon: XCircle },
        ]}
      />

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-replacement-requests"
        onRowClick={(row) => {
          const soId = row._salesOrderId as string
          if (soId) navigate(`/crm/sales-orders/${soId}`)
        }}
        emptyState={{
          title: 'No replacement requests',
          description: 'Replacement requests raised against dispatched Sales Orders will appear here.',
          action: { label: 'New Request', onClick: () => navigate('/wms/replacements/new') },
        }}
      />

      {/* Approve / Reject / Issue Dialog */}
      <Dialog
        open={actionRequestId !== null}
        onOpenChange={(open) => {
          if (!open) closeActionDialog()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Replace className="size-4" />
              {actionTitle}
            </DialogTitle>
          </DialogHeader>
          {actionTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Request</p>
                  <p className="font-medium">{actionTarget.requestNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sales Order</p>
                  <p className="font-mono font-medium">{actionTarget.salesOrderNumber}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{actionTarget.customer}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Original Line Item</p>
                  <p className="font-medium">{actionTarget.originalPartName}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {actionTarget.originalPartSku} · {formatINR(actionTarget.originalRate)}
                  </p>
                </div>
                {actionTarget.replacementPartName && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Replacement</p>
                    <p className="font-medium">{actionTarget.replacementPartName}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {actionTarget.replacementPartSku} · {formatINR(actionTarget.replacementRate ?? 0)}
                    </p>
                  </div>
                )}
                <div className="col-span-2 flex items-center gap-2 rounded-md border bg-background p-2 text-sm">
                  {actionTarget.nextStep === 'Dispatch' && <Truck className="size-4 text-emerald-600" />}
                  {actionTarget.nextStep === 'Pricing Update' && <IndianRupee className="size-4 text-amber-600" />}
                  {actionTarget.nextStep === 'Pending Decision' && <Clock className="size-4 text-muted-foreground" />}
                  <span className="font-medium">{actionTarget.nextStep}</span>
                  {actionTarget.priceDelta !== undefined && actionTarget.priceDelta !== 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Δ {actionTarget.priceDelta > 0 ? '+' : ''}{formatINR(actionTarget.priceDelta)}/unit
                    </span>
                  )}
                </div>
              </div>

              {actionMode === 'issue' && (
                <div className="space-y-2">
                  <Label htmlFor="replacement-barcode">Replacement Device Barcode</Label>
                  <Input
                    id="replacement-barcode"
                    value={replacementBarcode}
                    onChange={(e) => setReplacementBarcode(e.target.value)}
                    placeholder="Scan or enter barcode (e.g. L-DEL-1020)"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="action-notes">
                  {actionMode === 'reject' ? 'Rejection Reason' : 'Notes'}
                  {actionMode === 'reject' && <span className="text-destructive"> *</span>}
                </Label>
                <Textarea
                  id="action-notes"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    actionMode === 'reject'
                      ? 'Explain why this request is being rejected…'
                      : 'Add any notes…'
                  }
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              variant={actionMode === 'reject' ? 'destructive' : 'default'}
            >
              {actionMode === 'approve'
                ? 'Approve'
                : actionMode === 'reject'
                  ? 'Reject'
                  : 'Issue Replacement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default ReplacementRequestsPage
