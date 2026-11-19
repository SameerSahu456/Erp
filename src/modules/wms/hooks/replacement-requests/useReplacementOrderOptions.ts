import {
  useReplacementEligibleSourcesInfinite,
  useReplacementSourceOrdersInfinite,
  type SalesOrderForReplacementRowWire,
  type SalesOrderWithReplacementRowWire,
} from "@modules/crm"

import { useIdRemappedInfinite } from "../shared/useIdRemappedInfinite"

/** An eligible-source row re-keyed for AsyncSelect (rows key on `sales_order_id`). */
export type EligibleOrderOption = SalesOrderForReplacementRowWire & { id: string }

/** A source-order row re-keyed for AsyncSelect, labelled on `order_number`. */
export type ReplacementSourceOrderOption = SalesOrderWithReplacementRowWire & {
  id: string
  order_number: string
}

// Module-level so the adapter's memo sees a stable function.
const toEligibleOrderOption = (
  row: SalesOrderForReplacementRowWire,
): EligibleOrderOption => ({ ...row, id: row.sales_order_id })

const toSourceOrderOption = (
  row: SalesOrderWithReplacementRowWire,
): ReplacementSourceOrderOption => ({
  ...row,
  id: row.sales_order_id,
  order_number: row.so_number,
})

/** Create-form picker: sales orders with units eligible for replacement. */
export function useEligibleOrderOptions(
  search: string,
  options?: { enabled?: boolean },
) {
  return useIdRemappedInfinite(
    useReplacementEligibleSourcesInfinite({ q: search }, options),
    toEligibleOrderOption,
  )
}

/** List-filter picker: only orders that have a replacement request. */
export function useReplacementSourceOrderOptions(
  search: string,
  options?: { enabled?: boolean },
) {
  return useIdRemappedInfinite(
    useReplacementSourceOrdersInfinite({ q: search }, options),
    toSourceOrderOption,
  )
}
