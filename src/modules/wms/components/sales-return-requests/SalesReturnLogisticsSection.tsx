import { Controller } from "react-hook-form"
import { Truck, UserRound, type LucideIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/common/forms/FieldError"
import { Typography } from "@/components/ui/typography"
import { FilePreviewDialog } from "@modules/attachments"

import type { SalesReturnRequestFormState } from "../../hooks/sales-return-requests/useSalesReturnRequestForm"
import type { SalesReturnStagedDocs } from "../../hooks/sales-return-requests/useSalesReturnStagedDocs"
import { SegmentedToggle } from "../shared/section-primitives"
import { DispatchDocumentsField } from "../dispatches/DispatchDocumentsField"
import {
  SALES_RETURN_DOC_TYPES,
  SALES_RETURN_PICKUP_OPTIONS,
  type SalesReturnPickupBy,
} from "../../constants/sales-return-status"
import { ReturnSectionCard } from "./SalesReturnSectionCard"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

// Icon + one-line hint per pickup tile, like the Inward type tiles (§3.2).
const PICKUP_ICON: Record<SalesReturnPickupBy, LucideIcon> = {
  us: Truck,
  customer: UserRound,
}

type SalesReturnLogisticsSectionProps = Pick<
  SalesReturnRequestFormState,
  "form" | "pickupByError" | "today" | "expectedArrivalDate" | "pickupBy" | "docs"
>

/** The customer's shipping paperwork, staged until the return is raised. */
function ShippingDocumentsField({ docs }: { docs: SalesReturnStagedDocs }) {
  return (
    <div className="space-y-2">
      <Label>{S.form.detailsStep.documentsLabel}</Label>
      <Typography variant="helper" tone="muted">
        {S.form.detailsStep.documentsHint}
      </Typography>
      <DispatchDocumentsField
        docTypes={SALES_RETURN_DOC_TYPES}
        docType={docs.docType}
        onDocTypeChange={docs.setDocType}
        rows={docs.docRows}
        onAddFiles={docs.addDocs}
        onRemove={(row) => docs.removeDocById(row.key)}
      />
      <FilePreviewDialog
        target={docs.preview}
        onOpenChange={(open) => {
          if (!open) docs.closePreview()
        }}
      />
    </div>
  )
}

/** Logistics — warehouse-only. A CRM raiser never sees this section; the
 *  warehouse fills it later on the detail page. */
export function SalesReturnLogisticsSection({
  form,
  pickupByError,
  today,
  expectedArrivalDate,
  pickupBy,
  docs,
}: SalesReturnLogisticsSectionProps) {
  return (
    <ReturnSectionCard
      icon={Truck}
      title={S.form.sections.logistics.title}
      description={S.form.sections.logistics.description}
    >
      <div className="space-y-2">
        <Label required>{S.form.detailsStep.pickupByLabel}</Label>
        <Controller
          control={form.control}
          name="pickupBy"
          render={({ field }) => (
            <SegmentedToggle<SalesReturnPickupBy>
              value={field.value ?? null}
              onSelect={(v) => field.onChange(v)}
              options={SALES_RETURN_PICKUP_OPTIONS.map((o) => ({
                value: o.value as SalesReturnPickupBy,
                label: o.label,
                hint: o.hint,
                icon: PICKUP_ICON[o.value as SalesReturnPickupBy],
              }))}
            />
          )}
        />
        <FieldError message={pickupByError} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="space-y-2">
          <Label>{S.form.detailsStep.courierLabel}</Label>
          <Input
            maxLength={100}
            {...form.register("courierName", {
              // Normalize on blur so the on-screen value matches what's
              // saved (§9).
              onBlur: (e) => form.setValue("courierName", e.target.value.trim()),
            })}
            placeholder={S.form.detailsStep.courierPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label>{S.form.detailsStep.awbLabel}</Label>
          <Input
            maxLength={100}
            {...form.register("awbNumber", {
              // AWB numbers are upper-case; trim + uppercase on blur (§9).
              onBlur: (e) =>
                form.setValue("awbNumber", e.target.value.trim().toUpperCase()),
            })}
            placeholder={S.form.detailsStep.awbPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label>{S.form.detailsStep.expectedArrivalLabel}</Label>
          <DatePicker
            min={today}
            value={expectedArrivalDate ?? ""}
            onChange={(v) =>
              form.setValue("expectedArrivalDate", v, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
        </div>
      </div>

      {pickupBy === "customer" && <ShippingDocumentsField docs={docs} />}
    </ReturnSectionCard>
  )
}
