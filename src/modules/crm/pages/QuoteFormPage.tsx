import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  Send,
  Save,
  Download,
  Copy,
  ArrowRight,
  FileText,
  History,
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
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EntityHeader } from '../components/EntityHeader'
import { TotalsSection } from '../components/TotalsSection'
import { quotes } from '../data/quotes'
import { leads } from '../data/leads'
import { accounts } from '../data/accounts'
import { IMS_CATEGORIES } from '../types'
import type { Quote } from '../types'

interface QuoteFormLineItem {
  id: string
  item: string
  description: string
  category: string
  qty: number
  rate: number
}

function generateId(): string {
  return `qli-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyItem(): QuoteFormLineItem {
  return { id: generateId(), item: '', description: '', category: '', qty: 1, rate: 0 }
}

function formatCurrencyValue(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const QUOTE_STATUSES: Quote['status'][] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']
const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

const STATUS_VARIANTS: Record<Quote['status'], 'neutral' | 'info' | 'success' | 'error' | 'warning'> = {
  Draft: 'neutral',
  Sent: 'info',
  Accepted: 'success',
  Rejected: 'error',
  Expired: 'warning',
}

function QuoteFormPage() {
  const { id: quoteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const existingQuote = quoteId ? quotes.find((q) => q.id === quoteId) : undefined
  const isEdit = !!existingQuote

  const paramLeadId = searchParams.get('leadId') ?? ''
  const paramParentQuoteId = searchParams.get('parentQuoteId') ?? ''
  const paramVersion = searchParams.get('version') ?? ''

  const prefilledLead = paramLeadId
    ? leads.find((l) => l.id === paramLeadId)
    : existingQuote?.leadId
      ? leads.find((l) => l.id === existingQuote.leadId)
      : undefined

  const parentQuote = paramParentQuoteId
    ? quotes.find((q) => q.id === paramParentQuoteId)
    : undefined

  const version = paramVersion
    ? Number(paramVersion)
    : existingQuote?.version ?? 1

  const [quoteNumber] = useState(
    existingQuote?.quoteNumber ?? `Q-2026-${String(quotes.length + 1).padStart(4, '0')}`
  )
  const [accountId, setAccountId] = useState(existingQuote?.accountId ?? '')
  const [validUntil, setValidUntil] = useState(existingQuote?.validUntil ?? '')
  const [status, setStatus] = useState<Quote['status']>(existingQuote?.status ?? 'Draft')
  const [owner, setOwner] = useState(MOCK_OWNERS[0])
  const [lineItems, setLineItems] = useState<QuoteFormLineItem[]>(
    existingQuote?.lineItems?.map((li) => ({
      id: li.id,
      item: li.item,
      description: li.description,
      category: li.category,
      qty: li.qty,
      rate: li.rate,
    })) ??
    parentQuote?.lineItems?.map((li) => ({
      id: generateId(),
      item: li.item,
      description: li.description,
      category: li.category,
      qty: li.qty,
      rate: li.rate,
    })) ??
    [createEmptyItem()]
  )
  const [discount, setDiscount] = useState(0)
  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0),
    [lineItems]
  )

  const accountName = useMemo(
    () => accounts.find((a) => a.id === accountId)?.name ?? '',
    [accountId],
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

  useEffect(() => { triggerAutoSave() }, [accountId, validUntil, status, lineItems, discount, terms, notes, triggerAutoSave])
  useEffect(() => { return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) } }, [])

  const backHref = '/crm/quotes'

  function updateItem(id: string, field: keyof Omit<QuoteFormLineItem, 'id'>, value: string | number) {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setLineItems((prev) => [...prev, createEmptyItem()])
  }

  function removeItem(id: string) {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleSaveDraft() {
    if (!accountId) {
      toast.error('Please select an account.')
      return
    }
    toast.success('Quote saved as draft')
    navigate(backHref)
  }

  function handleSendQuote() {
    if (!accountId) {
      toast.error('Please select an account.')
      return
    }
    toast.success('Quote sent successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  function handleAmendQuote() {
    const leadIdParam = existingQuote?.leadId ?? prefilledLead?.id ?? ''
    const nextVersion = (existingQuote?.version ?? 1) + 1
    navigate(`/crm/quotes/new?leadId=${leadIdParam}&parentQuoteId=${existingQuote?.id}&version=${nextVersion}`)
  }

  function handleConvertToSO() {
    navigate(`/crm/sales-orders/new?quoteId=${existingQuote?.id}`)
  }

  function handleDuplicateQuote() {
    toast.success('Quote duplicated as new draft')
    navigate('/crm/quotes/new')
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? quoteNumber : 'Create Quote'}
        subtitle={
          isEdit
            ? `${accountName} — ${existingQuote?.lineItems?.length ?? 0} items`
            : 'Create a new quotation'
        }
        status={isEdit ? { label: status, variant: STATUS_VARIANTS[status] } : undefined}
        backHref={backHref}
        actions={
          <div className="flex items-center gap-2">
            {isEdit && (
              <>
                <Button variant="outline" size="sm" onClick={handleDuplicateQuote}>
                  <Copy className="size-4 mr-1.5" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={handleAmendQuote}>
                  <History className="size-4 mr-1.5" />
                  Amend
                </Button>
                {existingQuote?.status === 'Accepted' && (
                  <Button size="sm" onClick={handleConvertToSO}>
                    <ArrowRight className="size-4 mr-1.5" />
                    Convert to SO
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Lead & Version Info */}
      {(prefilledLead || version > 1) && (
        <div className="flex flex-wrap items-center gap-3">
          {prefilledLead && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-ui text-muted-foreground">Lead:</span>
              <StatusBadge variant="info">{prefilledLead.name} ({prefilledLead.company})</StatusBadge>
            </div>
          )}
          <Badge variant="outline" className="gap-1">
            <History className="size-3" />
            Version {version}
          </Badge>
          {parentQuote && (
            <span className="text-xs text-muted-foreground">
              (amended from {parentQuote.quoteNumber})
            </span>
          )}
        </div>
      )}

      {/* Tip bar for advanced builder */}
      {!isEdit && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Sparkles className="size-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Need BOM configuration or IMS part selection?</p>
            <p className="text-xs text-muted-foreground">
              Use the advanced Quote Builder for full component-level configuration with swap &amp; substitute support.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/crm/quote-builder')}>
            Open Quote Builder
          </Button>
        </div>
      )}

      <Card className="border-t-4 border-t-primary/20">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="size-5 text-primary" />
              {isEdit ? 'Quote Details' : 'New Quote'}
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
                <Label htmlFor="quote-number" className="font-ui">Quote Number</Label>
                <Input id="quote-number" value={quoteNumber} readOnly className="bg-muted/50" />
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
                <Label htmlFor="quote-valid-until" className="font-ui">Valid Until</Label>
                <Input
                  id="quote-valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as Quote['status'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTE_STATUSES.map((s) => (
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
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Line Items
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-10 px-3 py-2.5 text-left font-medium text-muted-foreground">#</th>
                    <th className="min-w-[160px] px-3 py-2.5 text-left font-medium text-muted-foreground">Item</th>
                    <th className="min-w-[180px] px-3 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                    <th className="min-w-[130px] px-3 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                    <th className="w-20 px-3 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="w-28 px-3 py-2.5 text-right font-medium text-muted-foreground">Rate (&#8377;)</th>
                    <th className="w-32 px-3 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="w-12 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((lineItem, index) => {
                    const amount = lineItem.qty * lineItem.rate
                    return (
                      <tr key={lineItem.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground font-medium">{index + 1}</td>
                        <td className="px-2 py-1.5">
                          <Input
                            placeholder="Item name"
                            value={lineItem.item}
                            onChange={(e) => updateItem(lineItem.id, 'item', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            placeholder="Description"
                            value={lineItem.description}
                            onChange={(e) => updateItem(lineItem.id, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select
                            value={lineItem.category}
                            onValueChange={(val) => updateItem(lineItem.id, 'category', val ?? '')}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {IMS_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={1}
                            className="text-right"
                            value={lineItem.qty}
                            onChange={(e) => updateItem(lineItem.id, 'qty', Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            className="text-right"
                            value={lineItem.rate}
                            onChange={(e) => updateItem(lineItem.id, 'rate', Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          &#8377;{formatCurrencyValue(amount)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeItem(lineItem.id)}
                            disabled={lineItems.length <= 1}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={addItem}>
              <Plus className="size-4" />
              Add Line Item
            </Button>
          </div>

          {/* Totals */}
          <TotalsSection
            subtotal={subtotal}
            discount={discount}
            onDiscountChange={setDiscount}
          />

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="quote-terms" className="font-ui">Terms &amp; Conditions</Label>
              <Textarea
                id="quote-terms"
                placeholder="Payment terms, delivery conditions, warranty..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quote-notes" className="font-ui">Internal Notes</Label>
              <Textarea
                id="quote-notes"
                placeholder="Notes for internal reference..."
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.success('PDF downloaded')}>
              <Download className="size-4 mr-1.5" />
              PDF
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={!accountId}>
              <Save className="size-4 mr-1.5" />
              Save Draft
            </Button>
            <Button onClick={handleSendQuote} disabled={!accountId}>
              <Send className="size-4 mr-1.5" />
              Send Quote
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export { QuoteFormPage }

export default QuoteFormPage
