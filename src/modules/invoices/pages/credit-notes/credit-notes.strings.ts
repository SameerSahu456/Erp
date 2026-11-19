// User-facing copy for the invoices › credit-notes sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, and table column headers live
// here as one typed `as const` object instead of being hardcoded ("naked") in
// JSX. Components import this via a relative path — no translation runtime.
export const CREDIT_NOTES_STRINGS = {
  list: {
    title: "Credit Notes",
    subtitle: "Credits issued to customers or received from vendors.",
    breadcrumbs: {
      invoices: "Invoices",
      creditNotes: "Credit Notes",
    },
    empty: {
      title: "No credit notes yet",
      description:
        "Credit notes appear here when customer invoices are adjusted or cancelled.",
    },
  },

  columns: {
    creditNoteNumber: "CN#",
    invoiceNumber: "Invoice#",
    customerName: "Customer",
    amount: "Amount",
    reason: "Reason",
    status: "Status",
    issueDate: "Date",
  },
} as const
