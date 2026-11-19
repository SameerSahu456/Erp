import { SoDetailItemsGrid } from "./SoDetailItemsGrid"
import type {
  LineFulfillmentWire,
  SalesOrderLineReplacementWire,
  SalesOrderWire,
} from "../../../api"
import { rentalsPermissions } from "@modules/rentals"
import { usePermission } from "@shared/rbac"

import { crmPermissions } from "../../../permissions"

// Line items on the SO detail page — every order type, rentals included, uses
// the same read-only grid as the Quote view (shared LineItemsGrid), with
// per-line approval and fulfillment facts listed under it. A rental order adds
// one trailing "Rental" column: each line's tracked units, and a shortcut to
// raise a return for just that line while some of its units are out.
export function SoLineItemsSection({
  so,
  fulfillmentByLineId,
  replacementsByLineId,
}: {
  so: SalesOrderWire
  fulfillmentByLineId?: Map<string, LineFulfillmentWire>
  replacementsByLineId?: Map<string, SalesOrderLineReplacementWire[]>
}) {
  const { canAny } = usePermission()
  if (so.sellable_type !== "rental_sales") {
    return (
      <SoDetailItemsGrid
        so={so}
        fulfillmentByLineId={fulfillmentByLineId}
        replacementsByLineId={replacementsByLineId}
      />
    )
  }
  // The return form's own route guard (crm:manage | rentals:return).
  const mayRaiseReturn = canAny([crmPermissions.MANAGE, rentalsPermissions.RETURN])
  return (
    <SoDetailItemsGrid
      so={so}
      fulfillmentByLineId={fulfillmentByLineId}
      replacementsByLineId={replacementsByLineId}
      // A rental line's units are tracked individually in `rental_devices`.
      // Scoped by the LINE's id, not its name: two lines may share an
      // `item_name`, and a name scope would show a neighbour's units too.
      trackedLineHref={(lineId) => `/rentals/tracking?so=${so.id}&line=${lineId}`}
      // Only while the line has units OUT — before dispatch (or once all are
      // back) there is nothing to return — and only for a viewer the return
      // form would let in.
      returnLineHref={
        mayRaiseReturn
          ? (lineId) => {
              const f = fulfillmentByLineId?.get(lineId)
              return f && f.dispatched - f.returned > 0
                ? `/wms/rental-returns/new?sales_order_id=${so.id}&line=${lineId}`
                : undefined
            }
          : undefined
      }
    />
  )
}
