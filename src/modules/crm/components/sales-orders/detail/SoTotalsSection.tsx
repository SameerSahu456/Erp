import { SectionCard, TotalsRow } from "./SoDetailPrimitives"
import type { SalesOrderWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function SoTotalsSection({ so }: { so: SalesOrderWire }) {
  return (
    <SectionCard title={S.detail.sections.totals}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <dl className="space-y-1.5 text-sm">
          <TotalsRow label={S.detail.totals.subtotal} value={so.subtotal} />
          {so.total_line_discount > 0 && (
            <TotalsRow
              label={S.detail.totals.discount}
              value={-so.total_line_discount}
              muted
            />
          )}
          {so.discount_amount > 0 && (
            <TotalsRow
              label={
                so.discount_percentage != null
                  ? S.detail.totals.headerDiscountPct(so.discount_percentage)
                  : S.detail.totals.headerDiscount
              }
              value={-so.discount_amount}
              muted
            />
          )}
          <TotalsRow label={S.detail.totals.taxableAmount} value={so.taxable_amount} muted />
        </dl>
        <dl className="space-y-1.5 text-sm">
          {so.cgst_amount > 0 && (
            <TotalsRow label={S.detail.totals.cgst} value={so.cgst_amount} muted />
          )}
          {so.sgst_amount > 0 && (
            <TotalsRow label={S.detail.totals.sgst} value={so.sgst_amount} muted />
          )}
          {so.igst_amount > 0 && (
            <TotalsRow label={S.detail.totals.igst} value={so.igst_amount} muted />
          )}
          <TotalsRow label={S.detail.totals.totalTax} value={so.total_tax} muted />
          <div className="my-2 border-t border-border" />
          <TotalsRow label={S.detail.totals.grandTotal} value={so.grand_total} strong />
        </dl>
      </div>
    </SectionCard>
  )
}
