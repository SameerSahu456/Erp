import { SoLineItemsSection } from "../SoLineItemsSection"
import type {
  LineFulfillmentWire,
  SalesOrderLineReplacementWire,
  SalesOrderWire,
} from "../../../../api"

// Line Items tab — the ordered lines in the shared read-only grid, with the
// per-line approval + stage-breakdown list under it. The SO-wide rollup card
// lives above the tabs (general stats), so it isn't repeated here; this tab
// only needs the per-line map.
export function SoLineItemsTab({
  so,
  fulfillmentByLineId,
  replacementsByLineId,
}: {
  so: SalesOrderWire
  fulfillmentByLineId: Map<string, LineFulfillmentWire>
  replacementsByLineId?: Map<string, SalesOrderLineReplacementWire[]>
}) {
  return (
    <div className="space-y-6">
      <SoLineItemsSection
        so={so}
        fulfillmentByLineId={fulfillmentByLineId}
        replacementsByLineId={replacementsByLineId}
      />
    </div>
  )
}
