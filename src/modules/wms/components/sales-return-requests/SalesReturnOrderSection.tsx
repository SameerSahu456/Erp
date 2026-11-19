import { Controller } from "react-hook-form"
import { Undo2 } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { AsyncSelect } from "@/components/ui/async-select"
import { FieldError } from "@/components/common/forms/FieldError"
import type { SalesReturnEligibleSourceWire } from "@modules/crm"

import type { SalesReturnRequestFormState } from "../../hooks/sales-return-requests/useSalesReturnRequestForm"
import { useOrderOptions } from "../../hooks/sales-return-requests/useSalesReturnOrderOptions"
import { ReturnSectionCard } from "./SalesReturnSectionCard"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

type SalesReturnOrderSectionProps = Pick<
  SalesReturnRequestFormState,
  "form" | "orderError" | "order" | "setOrder"
>

/** Sales order — the order picker plus the "what happened" description. */
export function SalesReturnOrderSection({
  form,
  orderError,
  order,
  setOrder,
}: SalesReturnOrderSectionProps) {
  return (
    <ReturnSectionCard
      icon={Undo2}
      title={S.form.sections.order.title}
      description={S.form.sections.order.description}
    >
      {/* The order picker spans the full card width. */}
      <div className="flex w-full flex-col gap-1.5">
        <Label required>{S.form.orderStep.label}</Label>
        <Controller
          control={form.control}
          name="salesOrderId"
          render={({ field }) => (
            <AsyncSelect<SalesReturnEligibleSourceWire & { id: string }>
              value={order}
              onValueChange={(next) => {
                setOrder(next)
                field.onChange(next?.id ?? "")
                // A different order means a different unit pool — the
                // old selection would submit lines from another order.
                form.setValue("units", [], { shouldValidate: true })
              }}
              useOptions={useOrderOptions}
              toLabel={(row) => row.order_number}
              placeholder={S.form.orderStep.placeholder}
              searchPlaceholder={S.form.orderStep.searchPlaceholder}
              className="w-full"
              renderItem={(row) => (
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {row.order_number}
                    {row.account_name ? ` · ${row.account_name}` : ""}
                  </span>
                  <Typography
                    variant="caption"
                    tone="muted"
                    numeric
                    className="shrink-0"
                  >
                    {S.form.orderStep.unitsAvailable(
                      row.returnable_unit_count,
                    )}
                  </Typography>
                </span>
              )}
            />
          )}
        />
        <FieldError message={orderError} />
        {/* A helper describing the field — NOT the "nothing returnable"
            empty text shown unconditionally. The picker surfaces its own
            no-options state when the list is genuinely empty. */}
        <Typography variant="helper" tone="muted">
          {S.form.orderStep.helper}
        </Typography>
      </div>

      {/* What happened — captured with the order it is raised against. */}
      <div className="space-y-2">
        <Label>{S.form.detailsStep.descriptionLabel}</Label>
        <Textarea
          {...form.register("description")}
          placeholder={S.form.detailsStep.descriptionPlaceholder}
          rows={3}
        />
      </div>
    </ReturnSectionCard>
  )
}
