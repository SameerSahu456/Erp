import { Truck } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldError } from "@/components/common/forms/FieldError"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { DemoRequestFormController } from "../../hooks/demo-requests/useDemoRequestForm"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

export function DemoLogisticsCard({ form }: { form: DemoRequestFormController }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <Truck className="size-4" strokeWidth={2} />
          </span>
          <div>
            <CardTitle>{S.form.logistics.title}</CardTitle>
            <CardDescription>
              {S.form.logistics.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="returnDate">
            {S.form.logistics.returnDateLabel} <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            id="returnDate"
            value={form.expectedReturnDate}
            min={form.todayIso}
            onChange={(v) => {
              form.setExpectedReturnDate(v)
              form.clearError("expectedReturnDate")
            }}
            className="md:max-w-xs"
            aria-invalid={Boolean(form.errors.expectedReturnDate)}
            aria-describedby={
              form.errors.expectedReturnDate ? "demo-return-date-error" : undefined
            }
          />
          <FieldError
            id="demo-return-date-error"
            message={form.errors.expectedReturnDate}
          />
        </div>
        {/* Notes — full-width, sits below the return date. */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">{S.form.logistics.notesLabel}</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => form.setNotes(e.target.value)}
            rows={4}
            placeholder={S.form.logistics.notesPlaceholder}
          />
        </div>
      </CardContent>
    </Card>
  )
}
