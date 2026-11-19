// User-facing copy for the IMS › dashboard page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const IMS_DASHBOARD_STRINGS = {
  page: {
    title: "Inventory Management",
    subtitle:
      "Live counts from the IMS backend — totals from /stats/overview, with a per-category stock summary below.",
    statsError:
      "Failed to load dashboard stats. The IMS backend may be unavailable.",
  },
  // Headline stat-row labels (StatsRow) — one per `/stats/overview` total.
  stats: {
    parts: "Parts",
    variants: "Variants",
    stockItems: "Stock items",
    categories: "Categories",
    brandOems: "Brand/OEMs",
    zeroStockVariants: "Zero-stock variants",
  },
  // Stock Summary tab (BusinessMetricsTable) — tab label + column headers.
  stockSummary: {
    title: "Stock Summary",
    category: "Category",
    itemsCount: "Items Count",
    totalQty: "Total Qty",
  },
  table: {
    loadingTitle: "Loading…",
    loadingDescription: "Fetching live IMS stats from the backend.",
    emptyTitle: "No data yet",
    emptyDescription: "Once stock and catalog data exist, totals appear here.",
  },
} as const
