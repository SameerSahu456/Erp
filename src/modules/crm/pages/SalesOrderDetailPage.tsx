import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
  Pencil,
  Download,
  Building2,
  CalendarDays,
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
import { salesOrders } from '../data/sales-orders'
import { contacts } from '../data/contacts'
import { accounts } from '../data/accounts'
import { getDispatchesForSalesOrder } from '@/modules/wms/data/dispatches'
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

  const account = accounts.find((a) => a.id === so.accountId)
  const contactSpoc = contacts.find((c) => c.accountId === so.accountId)
  const configItems = so.lineItems.filter((li) => li.configAction !== 'STANDARD')
  const subtotal = so.lineItems.reduce((s, li) => s + li.amount, 0)
  const categories = [...new Set(so.lineItems.map((li) => li.category))]

  function handleDownload() {
    toast.success('Sales Order PDF downloaded')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/crm/sales-orders')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="cpt-page-title">
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
                {so.lineItems.map((item, idx) => (
                  <tr key={item.id} className={`border-b last:border-0 ${
                    item.configAction === 'ADD' ? 'bg-[#e8fff3]/60' :
                    item.configAction === 'REMOVE' ? 'bg-[#fff5f8]/60' :
                    item.configAction === 'SWAP' ? 'bg-[#fff8dd]/60' : ''
                  }`}>
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
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
