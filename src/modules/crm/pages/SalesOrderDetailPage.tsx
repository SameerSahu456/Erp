import { Fragment, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Package,
  Package2,
  Plus,
  Minus,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Layers,
  Truck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Hammer,
  Pencil,
  Download,
  Building2,
  CalendarDays,
  GitBranch,
  History as HistoryIcon,
  IndianRupee,
  Mail,
  Phone,
  User,
  MapPin,
  Tag,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { salesOrders } from '../data/sales-orders'
import type { SalesOrder } from '../types'
import { contacts } from '../data/contacts'
import { accounts } from '../data/accounts'
import { getDispatchesForSalesOrder } from '@/modules/wms/data/dispatches'
import { mockBOMs } from '@/modules/wms/data/boms'
import { FileCheck } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  'Draft': 'neutral',
  'Confirmed': 'info',
  'Engineering': 'warning',
  'In Assembly': 'warning',
  'QC': 'info',
  'Ready for Dispatch': 'success',
  'Shipped': 'success',
  'Delivered': 'success',
  'Cancelled': 'error',
}

const CONFIG_ACTION_ICON: Record<string, React.ReactNode> = {
  STANDARD: <Package className="size-3.5" />,
  ADD: <Plus className="size-3.5" />,
  REMOVE: <Minus className="size-3.5" />,
  SWAP: <ArrowLeftRight className="size-3.5" />,
}

const CONFIG_ACTION_LABEL: Record<string, string> = {
  STANDARD: 'Standard',
  ADD: 'Added',
  REMOVE: 'Removed',
  SWAP: 'Swapped',
}

const CONFIG_ACTION_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  STANDARD: 'neutral',
  ADD: 'success',
  REMOVE: 'error',
  SWAP: 'warning',
}

const AMENDABLE_SO_STATUSES: SalesOrder['status'][] = [
  'Confirmed',
  'Engineering',
  'In Assembly',
  'QC',
  'Ready for Dispatch',
]

function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goBack = useNavigateBack('/crm/sales-orders')

  const so = useMemo(() => salesOrders.find((s) => s.id === id), [id])
  const [amendOpen, setAmendOpen] = useState(false)
  const [amendReason, setAmendReason] = useState('')
  const [bomExpanded, setBomExpanded] = useState<Record<string, boolean>>({})

  function toggleBom(lineId: string) {
    setBomExpanded((prev) => ({ ...prev, [lineId]: !prev[lineId] }))
  }

  if (!so) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Sales Order not found</p>
        <Button variant="ghost" className="mt-4" onClick={goBack}>
          Back to Sales Orders
        </Button>
      </div>
    )
  }

  const account = accounts.find((a) => a.id === so.accountId)
  const contactSpoc = contacts.find((c) => c.accountId === so.accountId)
  const configItems = so.lineItems.filter((li) => li.configAction !== 'STANDARD')
  const subtotal = so.lineItems.reduce((s, li) => s + li.amount, 0)
  const categories = [...new Set(so.lineItems.map((li) => li.category))]
  const canAmend = AMENDABLE_SO_STATUSES.includes(so.status)
  const versionHistory = so.versionHistory ?? []

  function handleDownload() {
    toast.success('Sales Order PDF downloaded')
  }

  function handleConfirmAmend() {
    // Snapshot current state into history and bump version. id + orderNumber stay stable.
    const snapshot = {
      version: so!.version,
      amendedAt: new Date().toISOString().slice(0, 10),
      amendedBy: 'Current User',
      reason: amendReason.trim() || undefined,
      total: so!.total,
      status: so!.status,
      approvalStatus: so!.approvalStatus,
      lineItems: so!.lineItems,
      dispatchNotes: so!.dispatchNotes,
    }
    so!.versionHistory = [...(so!.versionHistory ?? []), snapshot]
    so!.version = so!.version + 1
    setAmendOpen(false)
    setAmendReason('')
    toast.success(`${so!.orderNumber} — Rev ${so!.version} created`)
    navigate(`/crm/sales-orders/${so!.id}/edit`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="cpt-page-title">
              {so.orderNumber}
            </h1>
            {so.version > 1 && (
              <Badge variant="outline" className="gap-1 font-mono">
                <GitBranch className="size-3" />
                Rev {so.version}
              </Badge>
            )}
            <StatusBadge variant={STATUS_VARIANT[so.status] ?? 'neutral'}>{so.status}</StatusBadge>
            <StatusBadge variant={
              so.approvalStatus === 'Approved' ? 'success' :
              so.approvalStatus === 'Rejected' ? 'error' : 'warning'
            }>
              {so.approvalStatus}
            </StatusBadge>
            {so.hasPartConfig && (
              <StatusBadge variant="warning">
                <AlertCircle className="size-3 mr-1" />
                Part Config
              </StatusBadge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {so.accountName} &middot; {formatCurrency(so.total)} &middot; {formatDate(so.date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="size-3.5 mr-1" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/crm/sales-orders/${so.id}/edit`)}
          >
            <Pencil className="size-3.5 mr-1" />
            Edit
          </Button>
          {canAmend && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAmendOpen(true)}
            >
              <GitBranch className="size-3.5 mr-1" />
              Amend
            </Button>
          )}
          {so.approvalStatus === 'Approved' && !so.purchaseRequestId && (
            <Button
              size="sm"
              onClick={() => navigate(`/crm/purchase-requests/new?salesOrderId=${so.id}`)}
            >
              <Plus className="size-3.5 mr-1" />
              Create PR
            </Button>
          )}
          {so.purchaseRequestId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/crm/purchase-requests/${so.purchaseRequestId}`)}
            >
              <FileText className="size-3.5 mr-1" />
              View PR
            </Button>
          )}
        </div>
      </div>

      {/* Order Information + Contact Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Order Information */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Company Name</dt>
                  <dd className="text-sm font-medium">
                    {account ? (
                      <Link to={`/crm/accounts/${account.id}`} className="text-primary hover:underline">
                        {so.accountName}
                      </Link>
                    ) : so.accountName}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Sale Date</dt>
                  <dd className="text-sm">{formatDate(so.date)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Order Type</dt>
                  <dd className="text-sm">{so.status === 'Draft' ? 'Draft' : 'Standard'}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IndianRupee className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Payment Status</dt>
                  <dd>
                    <StatusBadge variant={so.approvalStatus === 'Approved' ? 'success' : 'warning'}>
                      {so.approvalStatus === 'Approved' ? 'Confirmed' : 'Pending'}
                    </StatusBadge>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <Tag className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-ui text-muted-foreground">Categories</dt>
                  <dd className="flex flex-wrap gap-1.5 mt-1">
                    {categories.map((cat) => (
                      <Badge key={cat} variant="secondary" size="sm">{cat}</Badge>
                    ))}
                  </dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            {contactSpoc ? (
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs font-ui text-muted-foreground">Contact Name</dt>
                    <dd className="text-sm font-medium">{contactSpoc.name}</dd>
                    <dd className="text-xs text-muted-foreground">{contactSpoc.title}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs font-ui text-muted-foreground">Contact Number</dt>
                    <dd className="text-sm">{contactSpoc.phone}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Mail className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs font-ui text-muted-foreground">Email</dt>
                    <dd className="text-sm">{contactSpoc.email}</dd>
                  </div>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No contact associated with this account.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing & Shipping Address */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4" />
              Billing Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {so.accountName}<br />
              {account?.city ?? '—'}, India
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-4" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {so.accountName}<br />
              {account?.city ?? '—'}, India
            </p>
            {so.dispatchNotes && (
              <p className="mt-2 text-xs italic text-muted-foreground">
                Note: {so.dispatchNotes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* References */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {so.quoteId && (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <FileText className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Quote</p>
              <p className="text-sm font-medium">{so.quoteName}</p>
            </div>
          </div>
        )}
        {so.purchaseRequestId && (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <FileText className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Purchase Request</p>
              <p className="text-sm font-medium">{so.purchaseRequestId}</p>
            </div>
          </div>
        )}
        {so.workOrderId && (
          <Link
            to={`/wms/work-orders/${so.workOrderId}`}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <Hammer className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Work Order</p>
              <p className="text-sm font-medium text-primary">{so.workOrderNumber}</p>
            </div>
          </Link>
        )}
        {so.demoRequestId && (
          <Link
            to={`/crm/demo-requests/${so.demoRequestId}`}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <Package className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Originating Demo</p>
              <p className="text-sm font-medium text-primary">{so.demoRequestNumber}</p>
            </div>
          </Link>
        )}
        {so.purchaseOrderId && (
          <Link
            to={`/procurement/po/${so.purchaseOrderId}`}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <FileText className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Linked Purchase Order</p>
              <p className="text-sm font-medium text-primary">{so.purchaseOrderNumber}</p>
            </div>
          </Link>
        )}
        <DispatchesCard salesOrderId={so.id} />
        {so.approvedBy && (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <CheckCircle2 className="size-4 text-[#50cd89]" />
            <div>
              <p className="text-xs text-muted-foreground">Approved By</p>
              <p className="text-sm font-medium">{so.approvedBy}</p>
            </div>
          </div>
        )}
      </div>

      {/* Part Configuration Alert */}
      {so.hasPartConfig && configItems.length > 0 && (
        <div className="rounded-lg border border-[#f6c000]/30 bg-[#fff8dd]">
          <div className="border-b border-[#f6c000]/30 px-6 py-4">
            <h2 className="font-semibold text-[#b88800] flex items-center gap-2">
              <AlertCircle className="size-4" />
              Part Configuration Changes
            </h2>
          </div>
          <div className="divide-y divide-[#f6c000]/15">
            {configItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-3">
                <div className={`flex size-8 items-center justify-center rounded-full ${
                  item.configAction === 'ADD' ? 'bg-[#e8fff3] text-[#0b5c22]' :
                  item.configAction === 'REMOVE' ? 'bg-[#fff5f8] text-[#991930]' :
                  'bg-[#fff8dd] text-[#b88800]'
                }`}>
                  {CONFIG_ACTION_ICON[item.configAction]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{item.partName}</p>
                    <StatusBadge variant={CONFIG_ACTION_VARIANT[item.configAction]}>
                      {CONFIG_ACTION_LABEL[item.configAction]}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.partSku} &middot; Qty: {item.qty}
                    {item.configAction === 'SWAP' && item.swapPartName && (
                      <span> &middot; Replaces: <strong>{item.swapPartName}</strong></span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amendment History */}
      {versionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="size-4" />
              Amendment History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <Badge variant="outline" className="gap-1 font-mono">
                <GitBranch className="size-3" />
                Rev {so.version}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Current revision</p>
                <p className="text-xs text-muted-foreground">
                  {so.lineItems.length} lines &middot; {formatCurrency(so.total)}
                </p>
              </div>
              <StatusBadge variant={STATUS_VARIANT[so.status] ?? 'neutral'}>{so.status}</StatusBadge>
            </div>
            {[...versionHistory].reverse().map((snap) => (
              <div key={snap.version} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <Badge variant="secondary" className="gap-1 font-mono">
                  <GitBranch className="size-3" />
                  Rev {snap.version}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {snap.reason ?? <span className="text-muted-foreground italic">No reason recorded</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {snap.lineItems.length} lines &middot; {formatCurrency(snap.total)} &middot; {snap.amendedBy} on {formatDate(snap.amendedAt)}
                  </p>
                </div>
                <StatusBadge variant={STATUS_VARIANT[snap.status] ?? 'neutral'}>{snap.status}</StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Line Item Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-4" />
            Line Item Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium">#</th>
                  <th className="px-4 py-2.5 text-left font-medium">Part</th>
                  <th className="px-4 py-2.5 text-left font-medium">Category</th>
                  <th className="px-4 py-2.5 text-left font-medium">BOM</th>
                  <th className="px-4 py-2.5 text-left font-medium">Config</th>
                  <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-4 py-2.5 text-right font-medium">Rate</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {so.lineItems.map((item, idx) => {
                  const expanded = !!bomExpanded[item.id]
                  const bom = item.bomId ? mockBOMs.find((b) => b.id === item.bomId) : undefined
                  const components = bom?.items ?? []
                  const rowTint =
                    item.configAction === 'ADD' ? 'bg-[#e8fff3]/60' :
                    item.configAction === 'REMOVE' ? 'bg-[#fff5f8]/60' :
                    item.configAction === 'SWAP' ? 'bg-[#fff8dd]/60' : ''
                  return (
                    <Fragment key={item.id}>
                      <tr className={`border-b last:border-0 ${rowTint}`}>
                        <td className="px-4 py-3 text-muted-foreground align-top">{idx + 1}</td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium">{item.partName}</p>
                          <p className="text-xs text-muted-foreground">{item.brand} · {item.partSku}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground align-top">{item.category}</td>
                        <td className="px-4 py-3 align-top">
                          {item.bomId ? (
                            <button
                              type="button"
                              onClick={() => toggleBom(item.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              {expanded ? (
                                <ChevronDown className="size-3" />
                              ) : (
                                <ChevronRight className="size-3" />
                              )}
                              <Package2 className="size-3" />
                              {expanded ? 'Hide BOM' : 'View BOM'} · {item.bomName}
                              {components.length > 0 && (
                                <Badge variant="outline" className="ml-1 text-[10px]">
                                  {components.length} component{components.length === 1 ? '' : 's'}
                                </Badge>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusBadge variant={CONFIG_ACTION_VARIANT[item.configAction]}>
                            {CONFIG_ACTION_ICON[item.configAction]}
                            <span className="ml-1">{CONFIG_ACTION_LABEL[item.configAction]}</span>
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium align-top">{item.qty}</td>
                        <td className="px-4 py-3 text-right align-top">{formatCurrency(item.rate)}</td>
                        <td className="px-4 py-3 text-right font-medium align-top">{formatCurrency(item.amount)}</td>
                      </tr>
                      {expanded && bom && (
                        <tr className="border-b last:border-0">
                          <td />
                          <td colSpan={7} className="bg-muted/20 px-4 py-3">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="inline-flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
                                <Layers className="size-3.5" />
                              </span>
                              <div>
                                <Link
                                  to={`/wms/bom/${bom.id}`}
                                  className="text-sm font-semibold text-foreground hover:underline"
                                >
                                  {bom.name}
                                </Link>
                                <div className="text-[11px] text-muted-foreground">
                                  <span className="font-mono">{bom.bomNumber}</span> · {components.length} component{components.length === 1 ? '' : 's'}
                                </div>
                              </div>
                            </div>
                            {components.length > 0 ? (
                              <div className="overflow-hidden rounded-md border bg-background">
                                <table className="w-full text-xs">
                                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                      <th className="px-3 py-1.5 text-left font-medium">Component</th>
                                      <th className="px-3 py-1.5 text-left font-medium">Variant</th>
                                      <th className="w-20 px-3 py-1.5 text-right font-medium">Qty</th>
                                      <th className="px-3 py-1.5 text-left font-medium">Position</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {components.map((c) => (
                                      <tr key={c.id}>
                                        <td className="px-3 py-1.5">
                                          <div className="font-medium">{c.partName}</div>
                                          <div className="text-[10px] text-muted-foreground font-mono">
                                            {c.partSku}
                                          </div>
                                        </td>
                                        <td className="px-3 py-1.5">
                                          <span className="font-mono text-[11px]">{c.variantSku}</span>
                                          <Badge variant="outline" className="ml-1 text-[10px]">{c.condition}</Badge>
                                          {c.isOptional && (
                                            <Badge variant="secondary" className="ml-1 text-[10px]">Optional</Badge>
                                          )}
                                        </td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">
                                          {c.quantity} {c.unitOfMeasure}
                                        </td>
                                        <td className="px-3 py-1.5 text-muted-foreground">
                                          {c.position ?? '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs italic text-muted-foreground">
                                This BOM has no components configured.
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td colSpan={7} className="px-4 py-3 text-right text-sm text-muted-foreground">Subtotal</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-4 py-1.5 text-right text-sm text-muted-foreground">CGST (9%)</td>
                  <td className="px-4 py-1.5 text-right text-sm">{formatCurrency(subtotal * 0.09)}</td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-4 py-1.5 text-right text-sm text-muted-foreground">SGST (9%)</td>
                  <td className="px-4 py-1.5 text-right text-sm">{formatCurrency(subtotal * 0.09)}</td>
                </tr>
                <tr className="border-t-2">
                  <td colSpan={7} className="px-4 py-3 text-right font-semibold">Grand Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-lg">{formatCurrency(subtotal * 1.18)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={amendOpen} onOpenChange={setAmendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Amend {so.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The current state will be snapshotted as Rev {so.version}, and you will edit a new Rev {so.version + 1}.
              The order number stays the same.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="so-amend-reason">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="so-amend-reason"
              placeholder="e.g., Customer requested higher memory config"
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAmend}>
              Create Rev {so.version + 1}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DispatchesCard({ salesOrderId }: { salesOrderId: string }) {
  const dispatches = getDispatchesForSalesOrder(salesOrderId)
  if (dispatches.length === 0) {
    return (
      <Link
        to={`/wms/dispatches/new?so=${salesOrderId}`}
        className="flex items-center gap-3 rounded-lg border border-dashed bg-card px-4 py-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
      >
        <FileCheck className="size-4" />
        <div>
          <p className="text-xs">Dispatches</p>
          <p className="text-sm font-medium">Create first dispatch</p>
        </div>
      </Link>
    )
  }
  const latest = dispatches[dispatches.length - 1]!
  return (
    <Link
      to={`/wms/dispatches/${latest.id}`}
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <FileCheck className="size-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">Dispatches ({dispatches.length})</p>
        <p className="text-sm font-medium text-primary">{latest.dispatchNumber}</p>
        <p className="text-xs text-muted-foreground">{latest.status}</p>
      </div>
    </Link>
  )
}

export { SalesOrderDetailPage }
export default SalesOrderDetailPage
