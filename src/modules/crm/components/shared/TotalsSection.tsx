import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatCurrency } from './LineItemsEditor'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

// "−₹" prefix (minus sign + rupee symbol) for the negative line-discount amount.
// Symbols, not user-facing copy — hoisted to module scope so the literal-string
// lint doesn't flag the combined glyph run inside JSX.
const MINUS_RUPEE = '−₹'

interface TotalsSectionProps {
  subtotal: number
  discount: number
  onDiscountChange: (discount: number) => void
  /** Sum of per-line discounts (`total_line_discount` from the /calculate
   *  response). When > 0, a read-only "Discount" row renders between
   *  Subtotal and Tax — mirroring how Sales Orders surface line-level
   *  discounts. Distinct from `discount`, which is the header-level
   *  discount the user types in. Defaults to 0 (row hidden). */
  lineDiscount?: number
  /** Uniform tax rate (legacy callers — used when `taxAmount` isn't passed). */
  taxRate?: number
  /** Precomputed tax amount across all line items (per-line tax_rate). When
   *  provided, overrides `taxRate * subtotal` so the Grand Total reflects
   *  per-line tax edits made by the user. */
  taxAmount?: number
  /** Display label only — single combined "Tax (X%)" row. When omitted,
   *  derived from taxAmount/subtotal so the percentage reflects the
   *  weighted-average effective rate across line items. */
  effectiveTaxRate?: number
  /** Hide the editable Discount input row. Quote / Sales Order forms set
   *  this so users can't apply an ad-hoc discount; Invoice still surfaces
   *  the input. The math is unchanged — a non-zero `discount` prop is
   *  still applied to the totals, so server-side discounts continue to
   *  render correctly. */
  hideDiscount?: boolean
  /** Hide the "Taxable Amount" summary row. The quote builder sets this;
   *  the math is unchanged — the value still feeds Grand Total. */
  hideTaxableAmount?: boolean
  /** Drop the "(X%)" suffix on the Tax row label, showing just "Tax".
   *  The quote builder sets this. */
  hideTaxRate?: boolean
  /** Server-computed totals from the `/calculate` endpoint. When provided,
   *  TotalsSection performs ZERO math — Taxable Amount, Tax, and Grand
   *  Total render verbatim from this object. Quote & Sales Order pass it;
   *  Invoice omits it and the legacy FE calc runs. */
  computed?: {
    taxableAmount: number
    taxAmount: number
    grandTotal: number
  }
  className?: string
}

function TotalsSection({
  subtotal,
  discount,
  onDiscountChange,
  lineDiscount = 0,
  taxRate = 18,
  taxAmount,
  effectiveTaxRate,
  hideDiscount = false,
  hideTaxableAmount = false,
  hideTaxRate = false,
  computed,
  className,
}: TotalsSectionProps) {
  const discountAmount = discount
  // When `computed` is supplied (Quote / Sales Order) every figure is taken
  // verbatim from the server's /calculate response — TotalsSection does ZERO
  // math. Legacy callers (Invoice) fall back to the FE calc below.
  const taxableAmount = computed
    ? computed.taxableAmount
    : Math.max(subtotal - discountAmount, 0)
  const gstAmount = (() => {
    if (computed) return computed.taxAmount
    // Legacy FE calc — prefer the caller-supplied taxAmount (per-line tax),
    // proportionally reduced by any discount; else the uniform-rate calc.
    if (typeof taxAmount === 'number') {
      if (subtotal <= 0) return 0
      return taxAmount * (taxableAmount / subtotal)
    }
    return taxableAmount * (taxRate / 100)
  })()
  const displayedRate = effectiveTaxRate ?? taxRate
  const grandTotal = computed ? computed.grandTotal : taxableAmount + gstAmount

  return (
    <div className={cn('flex justify-end', className)}>
      <div className="w-full max-w-sm space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{CRM_SHARED_STRINGS.totals.subtotal}</span>
          <span className="font-medium tabular-nums">&#8377;{formatCurrency(subtotal)}</span>
        </div>

        {/* Per-line discount rollup — read-only, sits above Tax to match the
            Sales Order totals. Hidden when there are no line discounts. */}
        {lineDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{CRM_SHARED_STRINGS.totals.discount}</span>
            <span className="tabular-nums text-muted-foreground">
              {MINUS_RUPEE}
              {formatCurrency(lineDiscount)}
            </span>
          </div>
        )}

        {!hideDiscount ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{CRM_SHARED_STRINGS.totals.discount}</span>
            <div className="relative w-32">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                &#8377;
              </span>
              <Input
                type="number"
                min={0}
                className="pl-7 text-right"
                value={discount}
                onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        ) : (
          discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{CRM_SHARED_STRINGS.totals.discount}</span>
              <span className="tabular-nums">
                &#8377;{formatCurrency(discount)}
              </span>
            </div>
          )
        )}

        {!hideTaxableAmount && (
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">{CRM_SHARED_STRINGS.totals.taxableAmount}</span>
            <span className="font-medium tabular-nums">&#8377;{formatCurrency(taxableAmount)}</span>
          </div>
        )}

        <div
          className={cn(
            'flex items-center justify-between text-sm',
            // When the Taxable Amount row is hidden, the Tax row picks up
            // the separator so the block above stays visually divided.
            hideTaxableAmount && 'border-t pt-2',
          )}
        >
          <span className="text-muted-foreground">
            {hideTaxRate
              ? CRM_SHARED_STRINGS.totals.tax
              : CRM_SHARED_STRINGS.totals.taxWithRate(Math.round(displayedRate * 100) / 100)}
          </span>
          <span className="tabular-nums">&#8377;{formatCurrency(gstAmount)}</span>
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
          <span>{CRM_SHARED_STRINGS.totals.grandTotal}</span>
          <span className="tabular-nums">&#8377;{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}

export { TotalsSection }
