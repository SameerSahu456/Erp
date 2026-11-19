import { Lock } from "lucide-react"

import { NumericInput } from "@/components/common/forms/NumericInput"
import { Typography } from "@/components/ui/typography"

import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

const S = PURCHASE_ORDERS_STRINGS.form

/** A form line's tax %: locked to the part's HSN rate when it has one, otherwise
 *  the operator's to change. */
export function LineTaxCell({
  hsnGstRate,
  taxRate,
  onChange,
}: {
  hsnGstRate?: number
  taxRate: number
  onChange: (taxRate: number) => void
}) {
  if (hsnGstRate != null) {
    return (
      <div
        className="flex items-center justify-end gap-1 pt-2 whitespace-nowrap"
        title={S.lineItems.hsnTaxTitle}
      >
        <Lock className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        <Typography variant="body" numeric>
          {hsnGstRate}%
        </Typography>
      </div>
    )
  }
  return (
    <NumericInput
      min={0}
      max={100}
      suffix="%"
      value={taxRate}
      onChange={onChange}
      aria-label={S.columns.tax}
      className="h-9 text-right"
    />
  )
}
