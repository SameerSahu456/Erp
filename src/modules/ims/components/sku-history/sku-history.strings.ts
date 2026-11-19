// User-facing copy for the IMS › sku-history sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const SKU_HISTORY_STRINGS = {
  notFound: {
    title: "Stock item not found",
    description: "This stock item does not exist or has been removed.",
  },
  card: {
    detailsTitle: "Stock item details",
    historyTitle: "Lifecycle history",
    noMovements: "No movement records yet for this stock item.",
  },
  fields: {
    serialNumber: "Serial number",
    status: "Status",
    warehouse: "Warehouse",
    rackBin: "Rack / Bin",
    variant: "Variant",
    condition: "Condition",
    created: "Created",
    updated: "Updated",
    notes: "Notes",
  },
} as const
