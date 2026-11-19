import {
  SALES_RETURN_REASON_LABEL,
  type SalesReturnReason,
} from "../../constants/sales-return-status"

export const LIST_ROUTE = "/wms/sales-returns"

const SALES_RETURN_REASONS = [
  "customer_return",
  "damage_in_transit",
] as const satisfies readonly SalesReturnReason[]

/** Typed reason options for the bulk bar (value narrowed to the reason enum). */
export const BULK_REASON_OPTIONS = SALES_RETURN_REASONS.map((value) => ({
  value,
  label: SALES_RETURN_REASON_LABEL[value],
}))
