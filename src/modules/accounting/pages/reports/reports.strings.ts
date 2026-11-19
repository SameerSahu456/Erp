// User-facing copy for the Accounting › Reports page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, subtitles,
// breadcrumb labels, and empty-state copy live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX.
export const ACCOUNTING_REPORTS_STRINGS = {
  breadcrumbs: {
    accounting: "Accounting",
    reports: "Reports",
  },
  page: {
    title: "Financial Reports",
    subtitle: "P&L, balance sheet, cash flow, and other financial statements.",
  },
  emptyState: {
    title: "No report data yet",
    description: "Financial reports populate as ledger entries accumulate.",
  },
} as const
