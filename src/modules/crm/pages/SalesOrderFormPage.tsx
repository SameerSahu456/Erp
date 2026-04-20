import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle,
  Loader2,
  Save,
  FileText,
  ShoppingCart,
  ClipboardList,
  History,
  ArrowRight,
  Copy,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { EntityHeader } from '../components/EntityHeader'
import { BOMQuoteBuilder } from '../components/BOMQuoteBuilder'
import { TotalsSection } from '../components/TotalsSection'
import { salesOrders } from '../data/sales-orders'
import { quotes } from '../data/quotes'
import { leads } from '../data/leads'
import { accounts } from '../data/accounts'
import { IMS_CATEGORIES, ORDER_TYPES } from '../types'
import type { SalesOrder, OrderType } from '../types'

const SO_STATUSES: SalesOrder['status'][] = ['Draft', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']
const DISPATCH_METHODS = ['Standard Shipping', 'Express Shipping', 'Hand Delivery', 'Pickup', 'Third-Party Logistics'] as const
const PAYMENT_TERMS = ['Net 30', 'Net 45', 'Net 60', 'Net 90', 'Advance Payment', 'COD', '50% Advance + 50% on Delivery'] as const

const STATUS_VARIANTS: Record<SalesOrder['status'], 'neutral' | 'info' | 'success' | 'error' | 'warning'> = {
  Draft: 'neutral',
  Confirmed: 'info',
  Engineering: 'info',
  'In Assembly': 'warning',
  QC: 'info',
  'Ready for Dispatch': 'warning',
  Shipped: 'warning',
  Delivered: 'success',
  Cancelled: 'error',
}

function SalesOrderFormPage() {
  const { id: orderId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const existingOrder = orderId ? salesOrders.find((o) => o.id === orderId) : undefined
  const isEdit = !!existingOrder

  const paramQuoteId = searchParams.get('quoteId') ?? ''
  const linkedQuote = paramQuoteId
    ? quotes.find((q) => q.id === paramQuoteId)
    : existingOrder?.quoteId
      ? quotes.find((q) => q.id === existingOrder.quoteId)
      : undefined

  const linkedLead = linkedQuote?.leadId
    ? leads.find((l) => l.id === linkedQuote.leadId)
    : undefined

  const [orderNumber] = useState(
    existingOrder?.orderNumber ?? `SO-2026-${String(salesOrders.length + 1).padStart(4, '0')}`
  )
  const [accountId, setAccountId] = useState(
    existingOrder?.accountId ?? linkedQuote?.accountId ?? ''
  )
  const [orderDate, setOrderDate] = useState(existingOrder?.date ?? new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<SalesOrder['status']>(existingOrder?.status ?? 'Draft')

  // New fields
  const [categories, setCategories] = useState<string[]>([])
  const [orderType, setOrderType] = useState<OrderType | ''>('')
  const [dispatchMethod, setDispatchMethod] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const accountAddresses = selectedAccount?.addresses ?? []
  const billingAddressOptions = accountAddresses.filter((a) => a.type === 'Billing')
  const shippingAddressOptions = accountAddresses.filter((a) => a.type === 'Shipping')

  const [approvalStatus, setApprovalStatus] = useState<'Pending' | 'Approved' | 'Rejected'>(
    existingOrder?.approvalStatus ?? 'Pending'
  )

  // Auto-save draft
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasInteracted = useRef(false)

  const triggerAutoSave = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      return
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus('saving')
      setTimeout(() => {
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      }, 500)
    }, 1500)
  }, [])

  useEffect(() => { triggerAutoSave() }, [accountId, orderDate, status, categories, orderType, dispatchMethod, paymentTerms, billingAddress, shippingAddress, notes, triggerAutoSave])
  useEffect(() => { return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) } }, [])

  const backHref = '/crm/sales-orders'

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function handleSave() {
    if (!accountId) {
      toast.error('Please select an account.')
      return
    }
    toast.success('Sales order saved successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  function handleApprove() {
    setApprovalStatus('Approved')
    toast.success('Sales order approved')
  }

  function handleReject() {
    setApprovalStatus('Rejected')
    toast.info('Sales order rejected')
  }

  function handleGeneratePR() {
    const soId = existingOrder?.id ?? ''
    navigate(`/crm/purchase-requests/new?salesOrderId=${soId}`)
  }

  const version = 1

  return (
    <div className="space-y-5">
      <EntityHeader
        title={isEdit ? orderNumber : 'Create Sales Order'}
        subtitle={
          isEdit
            ? `${selectedAccount?.name ?? ''} — Sales Order`
            : linkedQuote
              ? `From Quote ${linkedQuote.quoteNumber}`
              : 'Build a new sales order with BOM configuration'
        }
        status={isEdit ? { label: status, variant: STATUS_VARIANTS[status] } : undefined}
        backHref={backHref}
        actions={
          <div className="flex items-center gap-2">
            {isEdit && approvalStatus === 'Approved' && (
              <Button size="sm" onClick={handleGeneratePR}>
                <ClipboardList className="size-4 mr-1.5" />
                Generate Purchase Request
              </Button>
            )}
          </div>
        }
      />

      {/* Context badges — matching Quote style */}
      <div className="flex flex-wrap items-center gap-3">
        {linkedQuote && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-ui text-muted-foreground">Quote:</span>
            <Link to={`/crm/quotes/${linkedQuote.id}/edit`} className="text-sm text-primary hover:underline font-medium">
              {linkedQuote.quoteNumber}
            </Link>
            <StatusBadge variant="success">{linkedQuote.status}</StatusBadge>
          </div>
        )}
        {linkedLead && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-ui text-muted-foreground">Lead:</span>
            <Link to={`/crm/leads/${linkedLead.id}`} className="text-sm text-primary hover:underline">
              {linkedLead.name}
            </Link>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">Approval:</span>
          <StatusBadge
            variant={
              approvalStatus === 'Approved'
                ? 'success'
                : approvalStatus === 'Rejected'
                  ? 'error'
                  : 'warning'
            }
          >
            {approvalStatus}
          </StatusBadge>
        </div>
        <Badge variant="outline" className="gap-1">
          <History className="size-3" />
          Version {version}
        </Badge>
      </div>

      {/* Approval Banner */}
      {approvalStatus === 'Pending' && (
        <div className="flex items-center gap-4 rounded-lg border border-[#f6c000]/30 bg-[#fff8dd] px-4 py-3 dark:border-[#f6c000]/40 dark:bg-[#b88800]/15">
          <Badge variant="outline" className="border-[#f6c000]/50 text-[#b88800]">Pending Approval</Badge>
          <span className="text-sm text-[#b88800] flex-1">This order requires approval before processing.</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReject}>
              Reject
            </Button>
            <Button size="sm" onClick={handleApprove}>
              Approve
            </Button>
          </div>
        </div>
      )}

      {/* Header fields card */}
      <Card size="sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="size-4 text-primary" />
              Order Details
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <CheckCircle className="size-3.5 text-emerald-600" />
                  <span>Saved</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="so-number" className="font-ui">Order Number</Label>
                <Input id="so-number" value={orderNumber} readOnly className="bg-muted/50" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">
                  Account <span className="text-destructive">*</span>
                </Label>
                <Select value={accountId} onValueChange={(val) => { if (val) setAccountId(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="so-date" className="font-ui">Order Date</Label>
                <Input
                  id="so-date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as SalesOrder['status'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SO_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Order Type</Label>
                <Select value={orderType} onValueChange={(val) => setOrderType(val as OrderType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Dispatch Method</Label>
                <Select value={dispatchMethod} onValueChange={setDispatchMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select dispatch method" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPATCH_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Billing Address</Label>
                {billingAddressOptions.length > 0 ? (
                  <Select value={billingAddress} onValueChange={setBillingAddress}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select billing address" />
                    </SelectTrigger>
                    <SelectContent>
                      {billingAddressOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label} — {a.line1}, {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Textarea
                    placeholder="Enter billing address..."
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    rows={2}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Shipping Address</Label>
                {shippingAddressOptions.length > 0 ? (
                  <Select value={shippingAddress} onValueChange={setShippingAddress}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select shipping address" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingAddressOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label} — {a.line1}, {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Textarea
                    placeholder="Enter shipping address..."
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    rows={2}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Categories Interested */}
          <div className="mt-5 space-y-1.5">
            <Label className="font-ui">Categories Interested</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {IMS_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={categories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-5 space-y-1.5">
            <Label htmlFor="so-notes" className="font-ui">Notes</Label>
            <Textarea
              id="so-notes"
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* BOM Quote Builder — same as Quotes page */}
      <BOMQuoteBuilder
        accountId={accountId || undefined}
        accountName={selectedAccount?.name}
      />

      {/* Save/Cancel footer */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!accountId}>
          <Save className="size-4 mr-1.5" />
          Save Sales Order
        </Button>
      </div>
    </div>
  )
}

export { SalesOrderFormPage }

export default SalesOrderFormPage
