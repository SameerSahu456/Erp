// User-facing copy for the Reconciliation › inventory sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, column headers, empty text, and status badge labels live here as one
// typed `as const` object. Components import this via a relative path.
export const INVENTORY_RECONCILIATION_STRINGS = {
  page: {
    title: "Inventory Reconciliation",
    subtitle:
      "Compare physical counts against system records and submit adjustments.",
    breadcrumbs: {
      reconciliation: "Reconciliation",
      inventory: "Inventory",
    },
    actions: {
      submitAdjustment: "Submit Adjustment",
    },
  },
  stats: {
    totalItems: "Total Items",
    matched: "Matched",
    variances: "Variances",
    totalVarianceUnits: "Total Variance (units)",
  },
  table: {
    cardTitle: "Physical Count vs System Count",
    columns: {
      item: "Item",
      category: "Category",
      systemQty: "System Qty",
      physicalQty: "Physical Qty",
      variance: "Variance",
      action: "Action",
    },
    empty: {
      title: "No items to reconcile",
      description:
        "Add inventory items to begin a physical count vs. system reconciliation.",
    },
    statusBadge: {
      investigate: "Investigate",
      ok: "OK",
    },
  },
} as const
