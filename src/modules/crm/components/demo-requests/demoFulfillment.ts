// Shared fulfillment helpers for the demo detail page.
//
// The backend already resolved every number that could be computed two ways —
// `with_customer` in particular is derived server-side so a fifth counter can
// never disagree with the other four. The only folding the UI does is the
// "In progress" umbrella below.

import type {
  DemoLineFulfillmentWire,
  DemoStageRollupWire,
  DemoUnitWire,
} from "../../api"

// Everything inside the warehouse but not yet out of the door: issued,
// awaiting outward QC, and QC-failed are all physically in the building. The
// backend keeps them as non-overlapping buckets; a CRM reader acts on one
// number. Mirrors `inProgressCount` on the Sales Order side.
//
// `returned` is deliberately not part of this — a returned unit shipped and
// came back, so counting it here would break the arithmetic against
// `requested`.
export function inProgressCount(c: {
  issued: number
  ready: number
  qc_failed: number
}): number {
  return c.issued + c.ready + c.qc_failed
}

/** True when a line has nothing worth showing a fulfillment row for. */
export function hasNoFulfillmentActivity(line: DemoStageRollupWire): boolean {
  return (
    line.dispatched === 0 &&
    line.under_return === 0 &&
    inProgressCount(line) === 0
  )
}

const ZERO: DemoStageRollupWire = {
  requested: 0,
  pending_dispatch: 0,
  issued: 0,
  ready: 0,
  qc_failed: 0,
  dispatched: 0,
  with_customer: 0,
  under_return: 0,
  returned: 0,
  sold: 0,
  rejected: 0,
}

/**
 * Sum the fulfillment of every demo_request_item behind one display row.
 *
 * The detail card renders GROUPED rows — `mapWireDemo` collapses lines that
 * agree on variant + price + PM state — while the API keys fulfillment per
 * item id. Reading only the first id would under-report any merged row, so
 * callers pass the row's `sourceItemIds` and get the total.
 */
export function aggregateLines(
  byItemId: Map<string, DemoLineFulfillmentWire>,
  sourceItemIds: string[],
): { totals: DemoStageRollupWire; units: DemoUnitWire[] } {
  const totals = { ...ZERO }
  const units: DemoUnitWire[] = []
  for (const itemId of sourceItemIds) {
    const line = byItemId.get(itemId)
    if (!line) continue
    for (const key of Object.keys(totals) as (keyof DemoStageRollupWire)[]) {
      totals[key] += line[key]
    }
    units.push(...line.units)
  }
  return { totals, units }
}
