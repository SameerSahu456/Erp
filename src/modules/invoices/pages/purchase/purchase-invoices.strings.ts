// User-facing copy for the invoices › purchase sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, and table column headers live
// here as one typed `as const` object instead of being hardcoded ("naked") in
// JSX. Components import this via a relative path — no translation runtime.
export const PURCHASE_INVOICES_STRINGS = {
  list: {
    title: "Purchase Invoices",
    subtitle: "Vendor bills received against purchase orders.",
    breadcrumbs: {
      invoices: "Invoices",
      purchase: "Purchase",
    },
    tabs: {
      all: "All",
      pending: "Pending",
      approved: "Approved",
      paid: "Paid",
      disputed: "Disputed",
    },
    empty: {
      title: "No purchase invoices yet",
      description:
        "Vendor bills appear here once goods receipts are matched to POs.",
    },
  },

  columns: {
    invoiceNumber: "Our Ref#",
    vendorInvoiceNumber: "Vendor Ref#",
    vendorName: "Vendor",
    grandTotal: "Amount",
    balanceDue: "Balance",
    status: "Status",
    dueDate: "Due Date",
  },
} as const
