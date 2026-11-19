import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError } from "@/components/common/forms/FieldError"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { LineItemsEditor } from "../shared/LineItemsEditor"
import { TotalsSection } from "../shared/TotalsSection"
import { accounts } from "../../data/accounts"
import type { Invoice } from "../../types"
import type { InvoiceFormController } from "../../hooks/invoices/useInvoiceForm"
import { MOCK_OWNERS } from "../../hooks/invoices/useInvoiceForm"
import { INVOICE_STATUSES } from "../../constants/invoice-status"
import { CRM_INVOICES_STRINGS } from "./invoices.strings"

const S = CRM_INVOICES_STRINGS.form

export function InvoiceFormBody({ form }: { form: InvoiceFormController }) {
  const { errors, clearError } = form

  return (
    <Card>
      <CardHeader>
        <CardTitle>{form.isEdit ? S.cardTitleEdit : S.cardTitleNew}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Header fields */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-number" className="font-ui">{S.invoiceNumber}</Label>
              <Input id="inv-number" value={form.invoiceNumber} readOnly className="bg-muted/50" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-ui">
                {S.account} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.accountId}
                onValueChange={(val) => {
                  if (val) {
                    form.setAccountId(val)
                    clearError("accountId")
                  }
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={Boolean(errors.accountId)}
                  aria-describedby={errors.accountId ? "invoice-account-error" : undefined}
                >
                  <SelectValue placeholder={S.accountPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="invoice-account-error" message={errors.accountId} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-issue-date" className="font-ui">{S.issueDate}</Label>
              <Input
                id="inv-issue-date"
                type="date"
                value={form.issueDate}
                onChange={(e) => form.setIssueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-due-date" className="font-ui">{S.dueDate}</Label>
              <Input
                id="inv-due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => form.setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-ui">{S.status}</Label>
              <Select value={form.status} onValueChange={(val) => form.setStatus(val as Invoice["status"])}>
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
              <Label className="font-ui">{S.owner}</Label>
              <Select value={form.owner} onValueChange={(val) => { if (val) form.setOwner(val) }}>
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
        <LineItemsEditor items={form.lineItems} onChange={form.setLineItems} />

        {/* Totals */}
        <TotalsSection
          subtotal={form.subtotal}
          discount={form.discount}
          onDiscountChange={form.setDiscount}
        />

        {/* Full-width fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-payment-terms" className="font-ui">{S.paymentTerms}</Label>
            <Textarea
              id="inv-payment-terms"
              placeholder={S.paymentTermsPlaceholder}
              value={form.paymentTerms}
              onChange={(e) => form.setPaymentTerms(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-notes" className="font-ui">{S.notes}</Label>
            <Textarea
              id="inv-notes"
              placeholder={S.notesPlaceholder}
              value={form.notes}
              onChange={(e) => form.setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
