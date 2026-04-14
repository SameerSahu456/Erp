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
import { invoices } from '../data/invoices'
import { accounts } from '../data/accounts'
import type { LineItem } from '../components/LineItemsEditor'
import type { Invoice } from '../types'

const INVOICE_STATUSES: Invoice['status'][] = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Void']
const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

function getToday(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

function getDatePlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0] ?? ''
}

function InvoiceFormPage() {
  const { id: invoiceId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existingInvoice = invoiceId ? invoices.find((inv) => inv.id === invoiceId) : undefined
  const isEdit = !!existingInvoice

  const [invoiceNumber] = useState(
    existingInvoice?.invoiceNumber ?? `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`
  )
  const [accountId, setAccountId] = useState(existingInvoice?.accountId ?? '')
  const [issueDate, setIssueDate] = useState(existingInvoice?.issueDate ?? getToday())
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate ?? getDatePlusDays(30))
  const [status, setStatus] = useState<Invoice['status']>(existingInvoice?.status ?? 'Draft')
  const [owner, setOwner] = useState(MOCK_OWNERS[0])

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (existingInvoice?.lineItems?.length) {
      return existingInvoice.lineItems.map((li) => ({
        id: li.id,
        item: li.item,
        description: li.description,
        qty: li.qty,
        rate: li.rate,
      }))
    }
    return [createEmptyItem()]
  })

  const [discount, setDiscount] = useState(0)
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [notes, setNotes] = useState('')

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0),
    [lineItems]
  )

  const backHref = '/crm/invoices'

  function handleSaveDraft() {
    if (!accountId) return
    toast.success('Invoice saved as draft')
    navigate(backHref)
  }

  function handleSendInvoice() {
    if (!accountId) return
    toast.success('Invoice sent successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit Invoice: ${existingInvoice.invoiceNumber}` : 'Create Invoice'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Invoice' : 'New Invoice'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Header fields */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-number" className="font-ui">Invoice Number</Label>
                <Input id="inv-number" value={invoiceNumber} readOnly className="bg-muted/50" />
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
                <Label htmlFor="inv-issue-date" className="font-ui">Issue Date</Label>
                <Input
                  id="inv-issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-due-date" className="font-ui">Due Date</Label>
                <Input
                  id="inv-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as Invoice['status'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => (
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
              <Label htmlFor="inv-payment-terms" className="font-ui">Payment Terms</Label>
              <Textarea
                id="inv-payment-terms"
                placeholder="Enter payment terms..."
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-notes" className="font-ui">Notes</Label>
              <Textarea
                id="inv-notes"
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
          <Button onClick={handleSendInvoice} disabled={!accountId}>
            Send Invoice
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { InvoiceFormPage }

export default InvoiceFormPage
