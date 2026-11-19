import { useMemo } from "react"

import {
  useReplacementEligibleItems,
  useReplacementEligibleUnits,
} from "@modules/crm"

import type { ReplacementGeneration } from "../../constants/replacement-request-status"
import type { ReplacementRowUnit } from "../../components/replacement-requests/replacement-unit-table-helpers"

/** The order's dispatched units, merged with their bucket's generation + eligibility. */
export function useReplacementEligibleRows(orderId: string | undefined) {
  // Buckets carry generation + eligibility, units carry serials; merge into one row per unit.
  const { data: eligible = [], isLoading: eligibleLoading } =
    useReplacementEligibleItems(orderId)
  const { data: dispatchedUnits = [], isLoading: unitsLoading } =
    useReplacementEligibleUnits(orderId)
  const loading = eligibleLoading || unitsLoading

  const rowUnits: ReplacementRowUnit[] = useMemo(() => {
    const bucketFor = new Map(
      eligible.map((b) => [`${b.sales_order_item_id}:${b.part_variant_id}`, b]),
    )
    return dispatchedUnits.map((u) => {
      // A legacy unit (no dispatch record) has no variant: its bucket is the
      // order line's `no_dispatch_record` row, whose variant is null too.
      const b = bucketFor.get(`${u.sales_order_item_id}:${u.part_variant_id}`)
      const generation = (b?.generation ?? "sales_order") as ReplacementGeneration
      const bucketAvailable = b?.available_count ?? 0
      return {
        ...u,
        unitKey: u.dispatch_request_item_id ?? `legacy:${u.rental_device_id}`,
        generation,
        // Backend caps new claims per bucket, so each unit carries its bucket key + remaining count.
        bucketKey: `${u.sales_order_item_id}:${u.part_variant_id}:${generation}`,
        bucketAvailable,
        // Free to pick: not already claimed, has a sales-order line, and its
        // bucket still has a free slot.
        selectable:
          !u.already_under_replacement &&
          !!u.sales_order_item_id &&
          bucketAvailable > 0,
      }
    })
  }, [dispatchedUnits, eligible])

  return { rowUnits, loading }
}
