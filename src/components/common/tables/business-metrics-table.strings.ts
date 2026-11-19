// User-facing copy for BusinessMetricsTable.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const BUSINESS_METRICS_TABLE_STRINGS = {
  // Shown when `tabs` is empty.
  noData: "No data available",
  // Toolbar.
  toolbar: {
    clearSearchAriaLabel: "Clear search",
    // Dynamic filter labels use the column label: `All ${col.label}`.
    allFilter: (label: string) => `All ${label}`,
    // Dynamic filter chip placeholders.
    searchFilter: (label: string) => `Search ${label}...`,
    // Default trigger placeholder for the date-range filter when a page
    // doesn't pass its own `dateRange.placeholder`.
    dateRangePlaceholder: "Select Date Range",
  },
  // Table loading state.
  loadingData: "Loading data...",
  // Header "Sr No" column.
  srNo: "Sr No",
  // Empty state.
  emptyState: {
    filteredTitle: "No results match your filters.",
    filteredDescription:
      "Try clearing the search or adjusting the filters to see more rows.",
    defaultTitle: "No data to show yet",
    clearFilters: "Clear filters",
  },
  // Load-error state (first-load failure). A failed background refresh keeps
  // the existing rows on screen instead; this shows only when there are none.
  errorState: {
    title: "Couldn't load this list",
    description: "Something went wrong fetching the rows. Please try again.",
    retry: "Retry",
  },
  // Sort indicator.
  sortIndicator: {
    unsorted: "↕",
    asc: "↑",
    desc: "↓",
  },
} as const
