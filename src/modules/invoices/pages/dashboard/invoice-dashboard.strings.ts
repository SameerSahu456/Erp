// User-facing copy for the invoices › dashboard sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, table column headers, card titles, and stat labels live here as one
// typed `as const` object instead of being hardcoded ("naked") in JSX.
// Components import this via a relative path — no translation runtime.
export const INVOICE_DASHBOARD_STRINGS = {
  page: {
    title: "Invoice Dashboard",
    subtitle: "Receivables, payables, aging, and collection activity at a glance.",
    breadcrumbs: {
      invoices: "Invoices",
      dashboard: "Dashboard",
    },
  },

  stats: {
    outstandingReceivables: "Outstanding Receivables",
    overdueCount: "Overdue Count",
    collectedThisMonth: "Collected This Month",
    payablesDue: "Payables Due",
  },

  aging: {
    cardTitle: "AR Aging Summary",
    columns: {
      bucket: "Aging Bucket",
      invoices: "Invoices",
      amount: "Amount",
    },
  },

  recentInvoices: {
    cardTitle: "Recent Invoices",
  },
} as const
