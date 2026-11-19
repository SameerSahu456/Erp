// User-facing copy for the Accounting › Ledger page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, subtitles,
// breadcrumb labels, and empty-state copy live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX.
export const ACCOUNTING_LEDGER_STRINGS = {
  breadcrumbs: {
    accounting: "Accounting",
    ledger: "Ledger",
  },
  page: {
    title: "Accounting Ledger",
    subtitle: "All ledger entries — debits, credits, and account balances.",
  },
  emptyState: {
    title: "No ledger entries yet",
    description: "Ledger entries appear here as transactions are recorded.",
  },
} as const
