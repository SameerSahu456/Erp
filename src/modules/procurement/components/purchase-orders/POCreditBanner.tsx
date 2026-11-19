import { CreditCard } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { usePermission } from "@shared/rbac"
import { formatINRCompact } from "@/lib/currency"

import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import type { POCreditRollup, PurchaseReturn } from "../../api"

const CB_S = PURCHASE_ORDERS_STRINGS.detail.creditBanner

// Holders of this permission may record that the vendor credit arrived (or
// waive it) — the same gate the backend puts on the settle/waive endpoints.
const SETTLE_PERMISSION = "procurement:po_return_settle"

function money(v: string | number): string {
  return formatINRCompact(Number(v))
}

/** Tax-inclusive banner for vendor credit owed against this PO. Rendered only
 *  when `credit_total > 0`; the Settle link is gated on `po_return_settle`. */
export function POCreditBanner({
  rollup,
  returns,
}: {
  rollup: POCreditRollup
  returns: PurchaseReturn[]
}) {
  const { can } = usePermission()

  if (Number(rollup.credit_total) <= 0) return null

  // base + GST must mirror the SAME live refund set that feeds the headline
  // `credit_total`. Counting replace / undecided items here makes the breakdown
  // disagree with `Credit due` (e.g. ₹1,180 due but ₹2,000 base + ₹360 GST).
  let base = 0
  let gst = 0
  for (const ret of returns) {
    for (const it of ret.items) {
      if (it.status === "cancelled") continue
      if (it.disposition !== "refund") continue
      base += Number(it.credit_base)
      gst += Number(it.credit_tax)
    }
  }

  // Settle deep-links to the first return still carrying pending credit.
  const pendingReturn = returns.find((r) => Number(r.credit_pending) > 0)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <CreditCard className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="min-w-0">
          <Typography variant="body-strong">
            {CB_S.due(money(rollup.credit_total))}
            {" — "}
            {CB_S.breakdown(
              money(rollup.credit_settled),
              money(rollup.credit_pending),
            )}
          </Typography>
          {base > 0 && (
            <Typography variant="caption" tone="muted">
              {CB_S.baseGst(money(base), money(gst))}
            </Typography>
          )}
        </div>
      </div>
      {can(SETTLE_PERMISSION) && pendingReturn && (
        <Button
          size="sm"
          variant="outline"
          render={<Link to={`/wms/purchase-returns/${pendingReturn.id}`} />}
        >
          {CB_S.settle}
        </Button>
      )}
    </div>
  )
}
