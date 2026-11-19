import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { useSalesOrder } from "@modules/crm"

import type { ExtendLineRate, ExtendRequest } from "../../api/extend-requests"
import type { LineRateTarget } from "../../api/sales-orders"
import { useRentalSalesOrderLineRateTargets } from "../../hooks/agreements/useRentalSalesOrders"
import { rateList } from "../agreements/extend-so-display"
import { APPROVALS_STRINGS } from "./approvals.strings"

const S = APPROVALS_STRINGS.rateChange

/** Units the rate lands on: the ticked ones, else every unit on rent. */
function unitsOf(rate: ExtendLineRate, target: LineRateTarget | undefined): number {
  return rate.device_ids?.length ?? target?.units_on_rent ?? 0
}

/** Each repriced line as "what its units charge today → the new rate", so a
 *  decision is made on figures, not on line ids. */
export function ExtendRateLines({ request }: { request: ExtendRequest }) {
  const order = useSalesOrder(request.sales_order_id)
  const targets = useRentalSalesOrderLineRateTargets(request.sales_order_id)
  const names = new Map((order.data?.items ?? []).map((line) => [line.id, line.item_name]))
  const byLine = new Map((targets.data ?? []).map((t) => [t.sales_order_item_id, t]))

  return (
    <div className="min-w-0 space-y-2">
      <Typography variant="caption" tone="muted">
        {S.ratesHeading}
      </Typography>
      {request.device_id ? (
        <Typography variant="helper" tone="muted">
          {S.oneUnit}
        </Typography>
      ) : null}
      <ul className="space-y-2">
        {request.line_rates.map((rate) => {
          const target = byLine.get(rate.sales_order_item_id)
          const today = target && target.unit_rates.length > 0 ? rateList(target) : S.todayUnknown
          return (
            <li key={rate.sales_order_item_id} className="min-w-0 rounded-md border border-border p-2">
              <Typography variant="body-strong" className="[overflow-wrap:anywhere]">
                {names.get(rate.sales_order_item_id) ?? S.unknownLine}
              </Typography>
              <Typography variant="helper" tone="muted">
                {S.rateLine(today, formatINR(Number(rate.monthly_rate)), unitsOf(rate, target))}
              </Typography>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
