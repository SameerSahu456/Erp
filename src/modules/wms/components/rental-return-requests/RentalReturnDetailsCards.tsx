import { Controller, useFormState, useWatch } from "react-hook-form"
import { Check, ClipboardList, Truck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { cn } from "@/lib/utils"
import { formatIST_date } from "@shared/lib/date"

import {
  RENTAL_RETURN_PICKUP_OPTIONS,
  RENTAL_RETURN_REASON_OPTIONS,
} from "../../constants/rental-return-status"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"
import type { RentalReturnFormState } from "../../hooks/rental-return-requests/useRentalReturnForm"

const D = S.form.detailsStep

type FormProp = Pick<RentalReturnFormState, "form">

/** Chip-style radio: the native radio stays for keyboard/aria, the
 *  selected state reads as a right-hand tick. */
function TickRadioGroup({
  value,
  onChange,
  label,
  options,
}: {
  value: string | undefined
  onChange: (v: string) => void
  label: string
  options: readonly { value: string; label: string }[]
}) {
  return (
    <RadioGroup
      value={value ?? null}
      onValueChange={(v) => onChange(v as string)}
      aria-label={label}
      className="flex flex-wrap gap-2"
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "relative flex cursor-pointer items-center rounded-md border py-2 pl-3 pr-9",
            value === opt.value ? "border-primary bg-primary-soft/40" : "hover:bg-muted/40",
          )}
        >
          <RadioGroupItem value={opt.value} className="sr-only" />
          <Typography variant="body">{opt.label}</Typography>
          {value === opt.value && (
            <Check
              className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-primary"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          )}
        </label>
      ))}
    </RadioGroup>
  )
}

export function RentalReturnReasonCard({ form }: FormProp) {
  const { errors } = useFormState({ control: form.control, name: ["reason", "description"] })
  // "Other" needs a written reason.
  const needsDescription = useWatch({ control: form.control, name: "reason" }) === "other"
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4" />
          {S.form.steps.details}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label required>{D.reasonLabel}</Label>
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <TickRadioGroup
                value={field.value}
                onChange={field.onChange}
                label={D.reasonLabel}
                options={RENTAL_RETURN_REASON_OPTIONS}
              />
            )}
          />
          <FieldError message={errors.reason?.message} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rret-descriptionlabel" required={needsDescription}>
              {D.descriptionLabel}
            </Label>
            <Textarea id="rret-descriptionlabel"
              {...form.register("description")}
              placeholder={D.descriptionPlaceholder}
              rows={3}
            />
            <FieldError message={errors.description?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rret-noteslabel">{D.notesLabel}</Label>
            <Textarea id="rret-noteslabel" {...form.register("notes")} placeholder={D.notesPlaceholder} rows={3} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function RentalReturnLogisticsCard({
  form,
  returnDateFloor,
}: FormProp & { returnDateFloor?: string | null }) {
  // The return date may be in the past: a unit often came back before the
  // request is keyed in (migrated orders especially). It becomes each
  // received unit's return date; billing still stops at handover or receipt.
  // Not before a terminated order's termination date, though (2026-11-15).
  const { errors } = useFormState({
    control: form.control,
    name: ["pickupBy", "expectedArrivalDate"],
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="size-4" />
          {D.logisticsHeading}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Typography variant="helper" tone="muted">
          {D.logisticsHint}
        </Typography>
        <div className="space-y-2">
          <Label required>{D.pickupByLabel}</Label>
          <Controller
            control={form.control}
            name="pickupBy"
            render={({ field }) => (
              <TickRadioGroup
                value={field.value}
                onChange={field.onChange}
                label={D.pickupByLabel}
                options={RENTAL_RETURN_PICKUP_OPTIONS}
              />
            )}
          />
          <FieldError message={errors.pickupBy?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="rret-courierlabel">{D.courierLabel}</Label>
            <Input id="rret-courierlabel" {...form.register("courierName")} placeholder={D.courierPlaceholder} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rret-awblabel">{D.awbLabel}</Label>
            <Input id="rret-awblabel" {...form.register("awbNumber")} placeholder={D.awbPlaceholder} />
          </div>
          <div className="space-y-2">
            <Label required htmlFor="rret-expectedarrivallabel">{D.expectedArrivalLabel}</Label>
            {/* The shared picker, as on the sales-return form: the native
                date input's calendar did not open here. */}
            <Controller
              control={form.control}
              name="expectedArrivalDate"
              render={({ field }) => (
                <DatePicker
                  id="rret-expectedarrivallabel"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  min={returnDateFloor ?? undefined}
                />
              )}
            />
            {returnDateFloor ? (
              <Typography variant="helper" tone="muted">
                {D.returnDateFloorHint(formatIST_date(returnDateFloor))}
              </Typography>
            ) : null}
            <FieldError message={errors.expectedArrivalDate?.message} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
