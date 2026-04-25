import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle,
  Loader2,
  ShoppingCart,
  ClipboardList,
  History,
  MapPin,
  Plus,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { FormPageShell } from '@/components/page'
import { AddAddressDialog } from '../components/AddAddressDialog'
import { QuoteBuilderPanel } from '../components/QuoteBuilderPanel'
import { salesOrders } from '../data/sales-orders'
import { quotes } from '../data/quotes'
import { leads } from '../data/leads'
import { deals } from '../data/deals'
import { accounts } from '../data/accounts'
import { IMS_CATEGORIES, ORDER_TYPES } from '../types'
import type { SalesOrder, OrderType, AccountAddress } from '../types'

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

  // Look up deal linked to quote or via search params
  const paramDealId = searchParams.get('dealId') ?? ''
  const linkedDeal = paramDealId
    ? deals.find((d) => d.id === paramDealId)
    : linkedQuote?.accountId
      ? deals.find((d) => d.accountId === linkedQuote.accountId && d.leadId === linkedQuote.leadId)
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
  const [selectedBillingIds, setSelectedBillingIds] = useState<string[]>([])
  const [selectedShippingIds, setSelectedShippingIds] = useState<string[]>([])
  const [manualBillingAddress, setManualBillingAddress] = useState('')
  const [manualShippingAddress, setManualShippingAddress] = useState('')
  const [addAddressOpen, setAddAddressOpen] = useState(false)
  const [addAddressType, setAddAddressType] = useState<'Billing' | 'Shipping'>('Billing')
  const [localAddresses, setLocalAddresses] = useState<AccountAddress[]>([])
  const [notes, setNotes] = useState('')

  const selectedAccount = accounts.find((a) => a.id === accountId)

  // Aggregate addresses from account, lead, deal, and locally added — each tagged with source
  type TaggedAddress = AccountAddress & { source: string }
  const allAddresses = useMemo<TaggedAddress[]>(() => {
    const result: TaggedAddress[] = []
    // Account addresses
    for (const a of selectedAccount?.addresses ?? []) {
      result.push({ ...a, source: 'Account' })
    }
    // Lead addresses
    for (const a of linkedLead?.addresses ?? []) {
      if (!result.some((r) => r.id === a.id)) {
        result.push({ ...a, source: 'Lead' })
      }
    }
    // Deal addresses
    for (const a of linkedDeal?.addresses ?? []) {
      if (!result.some((r) => r.id === a.id)) {
        result.push({ ...a, source: 'Deal' })
      }
    }
    // Locally added addresses
    for (const a of localAddresses) {
      if (!result.some((r) => r.id === a.id)) {
        result.push({ ...a, source: 'New' })
      }
    }
    return result
  }, [selectedAccount, linkedLead, linkedDeal, localAddresses])

  const billingAddressOptions = allAddresses.filter((a) => a.type === 'Billing')
  const shippingAddressOptions = allAddresses.filter((a) => a.type === 'Shipping')

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

  function toggleSOAddress(id: string, type: 'billing' | 'shipping') {
    const setter = type === 'billing' ? setSelectedBillingIds : setSelectedShippingIds
    setter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  useEffect(() => { triggerAutoSave() }, [accountId, orderDate, status, categories, orderType, dispatchMethod, paymentTerms, selectedBillingIds, selectedShippingIds, notes, triggerAutoSave])
  useEffect(() => { return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) } }, [])

  const backHref = '/crm/sales-orders'
  const goBack = useNavigateBack(backHref)

  function handleSave() {
    if (!accountId) {
      toast.error('Please select an account.')
      return
    }
    toast.success('Sales order saved successfully')
    navigate(backHref)
  }

  function handleCancel() {
    goBack()
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

  const canSave = Boolean(accountId)

  return (
    <FormPageShell
      title={isEdit ? orderNumber : 'Create Sales Order'}
      subtitle={
        isEdit
          ? `${selectedAccount?.name ?? ''} — Sales Order`
          : linkedQuote
            ? `From Quote ${linkedQuote.quoteNumber}`
            : 'Build a new sales order with BOM configuration'
      }
      breadcrumbs={
        isEdit
          ? [
              { label: 'CRM' },
              { label: 'Sales Orders', href: '/crm/sales-orders' },
              { label: orderNumber },
              { label: 'Edit' },
            ]
          : [
              { label: 'CRM' },
              { label: 'Sales Orders', href: '/crm/sales-orders' },
              { label: 'New Sales Order' },
            ]
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
      onSave={handleSave}
      onCancel={handleCancel}
      canSave={canSave}
      saveLabel="Save Sales Order"
      footerLeft={!canSave ? <span className="text-destructive/80">Select an account to enable saving.</span> : undefined}
    >
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
        {linkedDeal && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-ui text-muted-foreground">Deal:</span>
            <Link to={`/crm/deals/${linkedDeal.id}`} className="text-sm text-primary hover:underline font-medium">
              {linkedDeal.name}
            </Link>
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
                <Label className="font-ui">Categories Interested</Label>
                <MultiSelect
                  options={IMS_CATEGORIES}
                  value={categories}
                  onValueChange={setCategories}
                  placeholder="Select categories..."
                />
              </div>
            </div>
          </div>

          {/* Addresses — billing & shipping with multi-select */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-ui">Billing Addresses</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setAddAddressType('Billing'); setAddAddressOpen(true) }}
                >
                  <Plus className="size-3 mr-1" />
                  Add Billing
                </Button>
              </div>
              {billingAddressOptions.length > 0 ? (
                <div className="space-y-2">
                  {billingAddressOptions.map((addr) => {
                    const checked = selectedBillingIds.includes(addr.id)
                    return (
                      <label key={addr.id} className={cn('flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors', checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSOAddress(addr.id, 'billing')} className="mt-0.5 size-4 accent-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{addr.label}</span>
                            <Badge variant="outline" className="text-[10px]">{addr.source}</Badge>
                            {addr.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                          <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <MapPin className="size-5 mx-auto text-muted-foreground mb-1.5" />
                  <p className="text-xs text-muted-foreground">No billing addresses available.</p>
                  <p className="text-xs text-muted-foreground">Click "Add Address" to create one.</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-ui">Shipping Addresses</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setAddAddressType('Shipping'); setAddAddressOpen(true) }}
                >
                  <Plus className="size-3 mr-1" />
                  Add Shipping
                </Button>
              </div>
              {shippingAddressOptions.length > 0 ? (
                <div className="space-y-2">
                  {shippingAddressOptions.map((addr) => {
                    const checked = selectedShippingIds.includes(addr.id)
                    return (
                      <label key={addr.id} className={cn('flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors', checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSOAddress(addr.id, 'shipping')} className="mt-0.5 size-4 accent-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{addr.label}</span>
                            <Badge variant="outline" className="text-[10px]">{addr.source}</Badge>
                            {addr.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                          <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <MapPin className="size-5 mx-auto text-muted-foreground mb-1.5" />
                  <p className="text-xs text-muted-foreground">No shipping addresses available.</p>
                  <p className="text-xs text-muted-foreground">Click "Add Address" to create one.</p>
                </div>
              )}
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

      {/* Line Items — per-line Part Number / Description (embedded: header & footer hidden to avoid duplicates) */}
      <Card size="sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4 text-primary" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <QuoteBuilderPanel
            accountId={accountId || undefined}
            accountName={selectedAccount?.name}
            mode="embedded"
          />
        </CardContent>
      </Card>

      {/* Add Address Dialog — pick from account or enter manually */}
      <AddAddressDialog
        open={addAddressOpen}
        onOpenChange={setAddAddressOpen}
        accountAddresses={selectedAccount?.addresses}
        existingIds={allAddresses.map((a) => a.id)}
        defaultType={addAddressType}
        onAdd={(addr) => {
          setLocalAddresses((prev) => [...prev, addr])
          toast.success(`Address "${addr.label}" added`)
        }}
      />
    </FormPageShell>
  )
}

export { SalesOrderFormPage }

export default SalesOrderFormPage
