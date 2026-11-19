// User-facing copy for the Accounting › Payments page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, subtitles,
// breadcrumb labels, and empty-state copy live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX.
export const ACCOUNTING_PAYMENTS_STRINGS = {
  breadcrumbs: {
    accounting: "Accounting",
    payments: "Payments",
  },
  page: {
    title: "Payments",
    subtitle: "Customer receipts and vendor payments across invoice types.",
  },
  emptyState: {
    title: "No payments recorded",
    description: "Payments appear here as invoices are paid or receipts are issued.",
  },
} as const
