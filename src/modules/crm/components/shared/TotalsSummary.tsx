import { Loader2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { formatINR } from "@/lib/currency"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

interface TotalsSummaryProps {
  /** Shows a small spinner while /calculate is in flight. Strip variant only. */
  loading?: boolean
  subtotal: number
  lineDiscount: number
  headerDiscount?: number
  totalTax: number
  grandTotal: number
  /**
   * Strip variant only. When provided, renders Discount as an inline ₹ input
   * (Direct mode). When null, renders the computed header discount as a
   * read-only row (from-quote mode — qty is the only editable field on the SO).
   */
  discountInput?: {
    value: string
    disabled: boolean
    onChange: (next: string) => void
  } | null
  /**
   * "strip" (default) — the SO / Quote right-aligned totals.
   * "card" — the Closed-Won Order Summary card: titled box with a Line Items
   *   count row and GST / Total labels. Both read from the same /calculate
   *   numbers, so the totals can't drift between the two surfaces.
   */
  variant?: "strip" | "card"
  /** Card variant only — count rendered in the "Line Items" row. */
  lineItemCount?: number
}

export function TotalsSummary({
  loading = false,
  subtotal,
  lineDiscount,
  headerDiscount = 0,
  totalTax,
  grandTotal,
  discountInput = null,
  variant = "strip",
  lineItemCount = 0,
}: TotalsSummaryProps) {
  if (variant === "card") {
    return (
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-2.5 text-[12.5px] font-semibold">
            {CRM_SHARED_STRINGS.totalsSummary.orderSummary}
          </h4>
          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {CRM_SHARED_STRINGS.totalsSummary.lineItems}
              </span>
              <span className="font-medium tabular-nums">{lineItemCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {CRM_SHARED_STRINGS.totalsSummary.subtotal}
              </span>
              <span className="font-medium tabular-nums">{formatINR(subtotal)}</span>
            </div>
            {/* Per-line discount rollup — above the tax row to match the Sales
                Order totals. Hidden at ₹0. */}
            {lineDiscount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {CRM_SHARED_STRINGS.totalsSummary.discount}
                </span>
                <span className="font-medium tabular-nums text-muted-foreground">
                  {formatINR(-lineDiscount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{CRM_SHARED_STRINGS.totalsSummary.gst}</span>
              <span className="font-medium tabular-nums">{formatINR(totalTax)}</span>
            </div>
            <Separator className="my-1.5" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">{CRM_SHARED_STRINGS.totalsSummary.total}</span>
              <span className="text-[13px] font-bold tabular-nums text-primary">
                {formatINR(grandTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-sm space-y-2">
        {loading && (
          <div className="mb-1 flex items-center justify-end">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          </div>
        )}

        <Row label={CRM_SHARED_STRINGS.totalsSummary.subtotal} value={subtotal} />

        {lineDiscount > 0 && (
          <Row label={CRM_SHARED_STRINGS.totalsSummary.discount} value={-lineDiscount} muted />
        )}

        {discountInput ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {CRM_SHARED_STRINGS.totalsSummary.discount}
            </span>
            <div className="relative w-32">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                &#8377;
              </span>
              <Input
                id="so-hdr-amt"
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                placeholder="0.00"
                className="pl-7 text-right"
                value={discountInput.value}
                disabled={discountInput.disabled}
                onChange={(e) => discountInput.onChange(e.target.value)}
              />
            </div>
          </div>
        ) : (
          headerDiscount > 0 && (
            <Row label={CRM_SHARED_STRINGS.totalsSummary.discount} value={-headerDiscount} muted />
          )
        )}

        <div className="my-1 border-t" />
        <Row label={CRM_SHARED_STRINGS.totalsSummary.tax} value={totalTax} muted />
        <div className="my-2 border-t" />
        <Row label={CRM_SHARED_STRINGS.totalsSummary.grandTotal} value={grandTotal} strong />
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string
  value: number
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd
        className={`tabular-nums ${strong ? "text-base font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}
      >
        {formatINR(value)}
      </dd>
    </div>
  )
}
