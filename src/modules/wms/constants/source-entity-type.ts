// Domain label map (Coding-guideline §16.12 bucket 2): the single source for
// how a GRN batch's `source_entity_type` code is shown to the user.
//
// A batch only carries the polymorphic source-document type code; the detail
// view (BatchDevicesBody) title-cases it for display via this map.
export const SOURCE_ENTITY_TYPE_LABELS: Record<string, string> = {
  purchase_orders: "Purchase Order",
  sales_orders: "Sales Order",
  demo_requests: "Demo Request",
  staff_requests: "Staff Request",
  replacement_requests: "Replacement Request",
  sales_return_requests: "Sales Return",
  warehouse_transfers: "Warehouse Transfer",
}
