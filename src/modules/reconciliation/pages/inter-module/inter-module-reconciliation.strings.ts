// User-facing copy for the Reconciliation › inter-module (three-way match) sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, column
// headers, empty text, and stats labels live here as one typed `as const`
// object. Components import this via a relative path.
export const INTER_MODULE_RECONCILIATION_STRINGS = {
  page: {
    title: "PO / GRN / Invoice Matching",
    subtitle:
      "Three-way matching across purchase orders, goods receipts, and invoices.",
    breadcrumbs: {
      reconciliation: "Reconciliation",
      threeWayMatch: "Three-Way Match",
    },
  },
  stats: {
    totalEntries: "Total Entries",
    fullMatch: "Full Match",
    mismatches: "Mismatches",
    pending: "Pending",
  },
  table: {
    cardTitle: "Three-Way Matching: PO vs GRN vs Invoice",
    columns: {
      po: "PO#",
      vendor: "Vendor",
      poAmount: "PO Amount",
      grnAmount: "GRN Amount",
      invoiceAmount: "Invoice Amount",
      matchStatus: "Match Status",
    },
    empty: {
      title: "No PO entries to match",
      description:
        "Once purchase orders are received, the GRN and invoice three-way match will appear here.",
    },
  },
} as const
