import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  Plus,
  Minus,
  ArrowLeftRight,
  Layers,
  Truck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Hammer,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { salesOrders } from '../data/sales-orders'
import type { SalesOrderLineItem } from '../types'

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

function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const so = useMemo(() => salesOrders.find((s) => s.id === id), [id])

  if (!so) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Sales Order not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/crm/sales-orders')}>
          Back to Sales Orders
        </Button>
      </div>
    )
  }

  const configItems = so.lineItems.filter((li) => li.configAction !== 'STANDARD')
  const bomLinked = so.lineItems.filter((li) => li.bomId)
  const subtotal = so.lineItems.reduce((s, li) => s + li.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/crm/sales-orders')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {so.orderNumber}
            </h1>
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
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="mt-1 text-xl font-semibold">{formatCurrency(so.total)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Line Items</p>
          <p className="mt-1 text-xl font-semibold">{so.lineItems.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">BOM Linked</p>
          <p className="mt-1 text-xl font-semibold">{bomLinked.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Config Changes</p>
          <p className={`mt-1 text-xl font-semibold ${configItems.length > 0 ? 'text-yellow-600' : ''}`}>
            {configItems.length}
          </p>
        </div>
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
      </div>

      {/* Part Configuration Alert — visible on dispatch */}
      {so.hasPartConfig && configItems.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50">
          <div className="border-b border-yellow-200 px-6 py-4">
            <h2 className="font-semibold text-yellow-800 flex items-center gap-2">
              <AlertCircle className="size-4" />
              Part Configuration Changes
              <span className="text-xs font-normal">
                (visible on dispatch request)
              </span>
            </h2>
            {so.dispatchNotes && (
              <p className="mt-1 text-sm text-yellow-700">{so.dispatchNotes}</p>
            )}
          </div>
          <div className="divide-y divide-yellow-100">
            {configItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-3">
                <div className={`flex size-8 items-center justify-center rounded-full ${
                  item.configAction === 'ADD' ? 'bg-green-100 text-green-700' :
                  item.configAction === 'REMOVE' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
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
                  {item.configNotes && (
                    <p className="mt-0.5 text-xs italic text-yellow-700">{item.configNotes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Line Items Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Package className="size-4" />
            Line Items
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
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
              {so.lineItems.map((item) => (
                <tr key={item.id} className={`border-b last:border-0 ${
                  item.configAction === 'ADD' ? 'bg-green-50/50' :
                  item.configAction === 'REMOVE' ? 'bg-red-50/50' :
                  item.configAction === 'SWAP' ? 'bg-yellow-50/50' : ''
                }`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.partName}</p>
                    <p className="text-xs text-muted-foreground">{item.brand} · {item.partSku}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3">
                    {item.bomId ? (
                      <Link to={`/wms/bom/${item.bomId}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Layers className="size-3" />
                        {item.bomName}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={CONFIG_ACTION_VARIANT[item.configAction]}>
                      {CONFIG_ACTION_ICON[item.configAction]}
                      <span className="ml-1">{CONFIG_ACTION_LABEL[item.configAction]}</span>
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{item.qty}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.rate)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td colSpan={6} className="px-4 py-3 text-right font-semibold">Total</td>
                <td className="px-4 py-3 text-right font-semibold text-lg">{formatCurrency(subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="font-medium">{so.accountName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Date</dt>
              <dd>{formatDate(so.date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(so.createdAt)}</dd>
            </div>
            {so.approvedBy && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Approved By</dt>
                <dd className="flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  {so.approvedBy}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {so.dispatchNotes && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-3 font-semibold flex items-center gap-2">
              <Truck className="size-4" />
              Dispatch Notes
            </h3>
            <p className="text-sm text-muted-foreground">{so.dispatchNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export { SalesOrderDetailPage }
export default SalesOrderDetailPage
