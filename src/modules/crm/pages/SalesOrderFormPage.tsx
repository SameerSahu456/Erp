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
  Sparkles,
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
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { EntityHeader } from '../components/EntityHeader'
import { LineItemsEditor, createEmptyItem } from '../components/LineItemsEditor'
import { TotalsSection } from '../components/TotalsSection'
import { salesOrders } from '../data/sales-orders'
import { quotes } from '../data/quotes'
import { leads } from '../data/leads'
import { accounts } from '../data/accounts'
import type { LineItem } from '../components/LineItemsEditor'
import type { SalesOrder } from '../types'

const SO_STATUSES: SalesOrder['status'][] = ['Draft', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']
const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

const STATUS_VARIANTS: Record<SalesOrder['status'], 'neutral' | 'info' | 'success' | 'error' | 'warning'> = {
  Draft: 'neutral',
  Confirmed: 'info',
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
  const [owner, setOwner] = useState(MOCK_OWNERS[0])
  const [lineItems, setLineItems] = useState<LineItem[]>(
    linkedQuote?.lineItems?.map((li) => ({
      id: li.id,
      item: li.item,
      description: li.description,
      qty: li.qty,
      rate: li.rate,
    })) ?? [createEmptyItem()]
  )
  const [discount, setDiscount] = useState(0)
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  const accountName = useMemo(
    () => accounts.find((a) => a.id === accountId)?.name ?? '',
    [accountId],
  )

  const [approvalStatus, setApprovalStatus] = useState<'Pending' | 'Approved' | 'Rejected'>(
    existingOrder?.approvalStatus ?? 'Pending'
  )

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0),
    [lineItems]
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

  useEffect(() => { triggerAutoSave() }, [accountId, orderDate, status, lineItems, discount, shippingAddress, notes, triggerAutoSave])
  useEffect(() => { return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) } }, [])

  const backHref = '/crm/sales-orders'

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

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? orderNumber : 'Create Sales Order'}
        subtitle={
          isEdit
            ? `${accountName} — ${lineItems.length} items`
            : linkedQuote
              ? `From Quote ${linkedQuote.quoteNumber}`
              : 'Create a new sales order'
        }
        status={isEdit ? { label: status, variant: STATUS_VARIANTS[status] } : undefined}
        backHref={backHref}
        actions={
          isEdit && approvalStatus === 'Approved' ? (
            <Button size="sm" onClick={handleGeneratePR}>
              <ClipboardList className="size-4 mr-1.5" />
              Generate Purchase Request
            </Button>
          ) : undefined
        }
      />

      {/* Context badges */}
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

      <Card className="border-t-4 border-t-primary/20">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="size-5 text-primary" />
              {isEdit ? 'Sales Order Details' : 'New Sales Order'}
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
        <CardContent className="space-y-8 pt-6">
          {/* Header fields */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
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
                <Label className="font-ui">Owner</Label>
                <Select value={owner} onValueChange={(val) => { if (val) setOwner(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_OWNERS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <LineItemsEditor items={lineItems} onChange={setLineItems} />

          {/* Totals */}
          <TotalsSection
            subtotal={subtotal}
            discount={discount}
            onDiscountChange={setDiscount}
          />

          {/* Shipping & Notes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="so-shipping" className="font-ui">Shipping Address</Label>
              <Textarea
                id="so-shipping"
                placeholder="Enter shipping address..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="so-notes" className="font-ui">Notes</Label>
              <Textarea
                id="so-notes"
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between border-t bg-muted/20">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!accountId}>
            <Save className="size-4 mr-1.5" />
            Save Sales Order
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { SalesOrderFormPage }

export default SalesOrderFormPage
