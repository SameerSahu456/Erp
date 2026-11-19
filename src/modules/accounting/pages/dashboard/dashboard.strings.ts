// User-facing copy for the Accounting › Dashboard page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, subtitles,
// card headers, column headers, and stat labels live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX. Components import this
// single source so copy stays consistent and is edited in one place.
export const ACCOUNTING_DASHBOARD_STRINGS = {
  breadcrumbs: {
    accounting: "Accounting",
    dashboard: "Dashboard",
  },
  page: {
    title: "Accounting Dashboard",
    subtitle: "Revenue, expenses, margins, and trend at a glance.",
  },
  stats: {
    revenue: "Revenue",
    expenses: "Expenses",
    netProfit: "Net Profit",
    profitMargin: "Profit Margin",
  },
  plCard: {
    title: "Profit & Loss Summary",
    categoryHeader: "Category",
    amountHeader: "Amount",
  },
  cashFlowCard: {
    title: "Cash Flow",
    cashInflows: "Cash Inflows",
    cashOutflows: "Cash Outflows",
    netCashFlow: "Net Cash Flow",
  },
} as const
