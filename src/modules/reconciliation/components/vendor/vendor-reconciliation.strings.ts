// User-facing copy for the Reconciliation › vendor sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, column headers, empty/error text, and totals labels live here as one
// typed `as const` object. Components import this via a relative path.
export const VENDOR_RECONCILIATION_STRINGS = {
  page: {
    title: "Vendor Reconciliation",
    subtitle:
      "Compare your records against vendor statements and resolve discrepancies.",
    breadcrumbs: {
      reconciliation: "Reconciliation",
      vendor: "Vendor",
    },
  },
  vendorSelect: {
    placeholder: "Select vendor...",
  },
  ourRecords: {
    cardTitle: "Our Records (POs + Payments)",
    columns: {
      ref: "Ref#",
      date: "Date",
      total: "Total",
      paid: "Paid",
      status: "Status",
    },
    empty: {
      title: "No invoices on file",
      description:
        "No purchase invoices recorded for this vendor in the selected period.",
    },
    totalInvoiced: "Total Invoiced:",
    totalPaid: "Total Paid:",
  },
  vendorStatement: {
    cardTitle: "Vendor Statement",
    columns: {
      ref: "Ref",
      date: "Date",
      description: "Description",
      amount: "Amount",
    },
    notUploaded: "Vendor statement not uploaded yet.",
    uploadStatement: "Upload Statement",
  },
  discrepancies: {
    cardTitle: "Discrepancies",
    noDiscrepancy: "No discrepancies found. Records match.",
    columns: {
      item: "Item",
      ourAmount: "Our Amount",
      vendorAmount: "Vendor Amount",
      difference: "Difference",
      status: "Status",
    },
    totalInvoiceAmount: "Total Invoice Amount",
    mismatch: "Mismatch",
  },
} as const
