// User-facing copy for the "Category — Period Comparison" widget (Coding-guideline §16.12).
export const CATEGORY_COMPARISON_STRINGS = {
  title: "Category — Period Comparison",
  why: (noun: string) =>
    `Leads, deals, sales orders (SO) and closed revenue per product category — this ${noun} compared with the previous three ${noun}s. Pick a metric to see bars and % change per ${noun}.`,
  loadError: "Couldn't load the category comparison.",
  metricLabel: "Metric",
  metrics: {
    all: "All metrics",
    leads: "Leads",
    deals: "Deals",
    so: "SO",
    revenue: "Revenue",
  },
  columns: {
    rank: "#",
    category: "Category",
    trend: "Trend",
    toDate: "To date",
  },
  noValue: "—",
  nouns: { weekly: "week", monthly: "month", quarterly: "quarter", yearly: "year", custom: "month" },
} as const
