import { type AsyncQueryShape } from "@/components/ui/async-select"
import {
  useSalesReturnEligibleSourcesInfinite,
  useSalesReturnSourceOrdersInfinite,
  type SalesReturnEligibleSourceWire,
  type SalesReturnSourceOrderWire,
} from "@modules/crm"

import { useIdRemappedInfinite } from "../shared/useIdRemappedInfinite"

export type OrderOption = SalesReturnEligibleSourceWire & { id: string }

// Module-level so the adapter's memo sees a stable function.
const toOrderOption = (row: SalesReturnEligibleSourceWire): OrderOption => ({
  ...row,
  id: row.sales_order_id,
})

/** Map eligible-source rows (`sales_order_id`) to AsyncSelect's `id` shape (§16.11). */
export function useOrderOptions(
  search: string,
  options?: { enabled?: boolean },
): AsyncQueryShape<OrderOption> {
  return useIdRemappedInfinite(
    useSalesReturnEligibleSourcesInfinite({ q: search }, options),
    toOrderOption,
  )
}

export type SourceOrderOption = SalesReturnSourceOrderWire & { id: string }

const toSourceOrderOption = (row: SalesReturnSourceOrderWire): SourceOrderOption => ({
  ...row,
  id: row.sales_order_id,
})

/** List-filter picker: only orders that already have a sales return. */
export function useSalesReturnSourceOrderOptions(
  search: string,
  options?: { enabled?: boolean },
): AsyncQueryShape<SourceOrderOption> {
  return useIdRemappedInfinite(
    useSalesReturnSourceOrdersInfinite({ q: search }, options),
    toSourceOrderOption,
  )
}
