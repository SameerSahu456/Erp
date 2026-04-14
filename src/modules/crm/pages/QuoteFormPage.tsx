import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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
import { EntityHeader } from '../components/EntityHeader'
import { LineItemsEditor, createEmptyItem } from '../components/LineItemsEditor'
import { TotalsSection } from '../components/TotalsSection'
import { quotes } from '../data/quotes'
import { accounts } from '../data/accounts'
import type { LineItem } from '../components/LineItemsEditor'
import type { Quote } from '../types'

const QUOTE_STATUSES: Quote['status'][] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']
const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

function QuoteFormPage() {
  const { quoteId } = useParams<{ quoteId: string }>()
  const navigate = useNavigate()

  const existingQuote = quoteId ? quotes.find((q) => q.id === quoteId) : undefined
  const isEdit = !!existingQuote

  const [quoteNumber] = useState(
    existingQuote?.quoteNumber ?? `Q-2026-${String(quotes.length + 1).padStart(4, '0')}`
  )
  const [accountId, setAccountId] = useState(existingQuote?.accountId ?? '')
  const [validUntil, setValidUntil] = useState(existingQuote?.validUntil ?? '')
  const [status, setStatus] = useState<Quote['status']>(existingQuote?.status ?? 'Draft')
  const [owner, setOwner] = useState(MOCK_OWNERS[0])
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyItem()])
  const [discount, setDiscount] = useState(0)
  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0),
    [lineItems]
  )

  const backHref = '/crm/quotes'

  function handleSaveDraft() {
    if (!accountId) return
    toast.success('Quote saved as draft')
    navigate(backHref)
  }

  function handleSendQuote() {
    if (!accountId) return
    toast.success('Quote sent successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit Quote: ${existingQuote.quoteNumber}` : 'Create Quote'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Quote Details' : 'New Quote'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
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
          <LineItemsEditor items={lineItems} onChange={setLineItems} />

          {/* Totals */}
          <TotalsSection
            subtotal={subtotal}
            discount={discount}
            onDiscountChange={setDiscount}
          />

          {/* Full-width fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quote-terms" className="font-ui">Terms &amp; Conditions</Label>
              <Textarea
                id="quote-terms"
                placeholder="Enter terms and conditions..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quote-notes" className="font-ui">Notes</Label>
              <Textarea
                id="quote-notes"
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={!accountId}>
            Save Draft
          </Button>
          <Button onClick={handleSendQuote} disabled={!accountId}>
            Send Quote
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { QuoteFormPage }
