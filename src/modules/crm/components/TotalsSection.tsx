import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatCurrency } from './LineItemsEditor'

interface TotalsSectionProps {
  subtotal: number
  discount: number
  onDiscountChange: (discount: number) => void
  taxRate?: number
  className?: string
}

function TotalsSection({
  subtotal,
  discount,
  onDiscountChange,
  taxRate = 18,
  className,
}: TotalsSectionProps) {
  const discountAmount = discount
  const taxableAmount = Math.max(subtotal - discountAmount, 0)
  const gstAmount = taxableAmount * (taxRate / 100)
  const halfTaxRate = taxRate / 2
  const halfGst = gstAmount / 2
  const grandTotal = taxableAmount + gstAmount

  return (
    <div className={cn('flex justify-end', className)}>
      <div className="w-full max-w-sm space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">&#8377;{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
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

        <div className="flex items-center justify-between border-t pt-2 text-sm">
          <span className="text-muted-foreground">Taxable Amount</span>
          <span className="font-medium tabular-nums">&#8377;{formatCurrency(taxableAmount)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">CGST ({halfTaxRate}%)</span>
          <span className="tabular-nums">&#8377;{formatCurrency(halfGst)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">SGST ({halfTaxRate}%)</span>
          <span className="tabular-nums">&#8377;{formatCurrency(halfGst)}</span>
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
          <span>Grand Total</span>
          <span className="tabular-nums">&#8377;{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}

export { TotalsSection }
