import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { PurchaseRequestItemsTable } from "./PurchaseRequestItemsTable"
import { PURCHASE_REQUESTS_STRINGS } from "./purchase-requests.strings"
import { MOCK_OWNERS, PR_STATUSES } from "../../hooks/purchase-requests/usePurchaseRequestForm"
import type { PurchaseRequestFormController } from "../../hooks/purchase-requests/usePurchaseRequestForm"
import type { PurchaseRequest } from "../../types"

function formatCurrencyValue(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PurchaseRequestFormBody({ form }: { form: PurchaseRequestFormController }) {
  const isEdit = !!form.existingPR

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? PURCHASE_REQUESTS_STRINGS.form.cardTitleEdit : PURCHASE_REQUESTS_STRINGS.form.cardTitleNew}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-ui">{PURCHASE_REQUESTS_STRINGS.form.requestedByLabel}</Label>
            <Select value={form.requestedBy} onValueChange={(val) => { if (val) form.setRequestedBy(val) }}>
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
          <div className="space-y-1.5">
            <Label className="font-ui">{PURCHASE_REQUESTS_STRINGS.form.statusLabel}</Label>
            <Select value={form.status} onValueChange={(val) => form.setStatus(val as PurchaseRequest["status"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PR_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Items Table */}
        <PurchaseRequestItemsTable form={form} />

        {/* Totals Summary */}
        <div className="flex justify-end">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">{PURCHASE_REQUESTS_STRINGS.form.totalEstimatedLabel}</span>
              <span className="font-medium tabular-nums">
                &#8377;{formatCurrencyValue(form.totalEstimated)}
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">{PURCHASE_REQUESTS_STRINGS.form.totalConfirmedLabel}</span>
              <span className="font-medium tabular-nums">
                &#8377;{formatCurrencyValue(form.totalConfirmed)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="pr-notes" className="font-ui">{PURCHASE_REQUESTS_STRINGS.form.notesLabel}</Label>
          <Textarea
            id="pr-notes"
            placeholder={PURCHASE_REQUESTS_STRINGS.form.notesPlaceholder}
            value={form.notes}
            onChange={(e) => form.setNotes(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  )
}
