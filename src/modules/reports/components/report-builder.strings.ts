// User-facing copy for the Reports Center (Reports › ReportBuilderBody and
// its child components).
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/notice text, filter labels and toast messages
// live here as one typed `as const` object instead of being hardcoded in JSX.
export const REPORT_BUILDER_STRINGS = {
  page: {
    title: 'Reports',
    subtitle:
      'Ready-made reports for directors, sales, purchasing, stock, operations, finance and compliance. Pick one and it runs instantly.',
    breadcrumb: 'Reports',
  },

  nav: {
    title: 'All reports',
    searchPlaceholder: 'Search reports…',
    clearSearch: 'Clear search',
    noResultsTitle: 'No reports match',
    noResultsDescription: 'Try a different word, such as "stock", "overdue" or "GST".',
    mobileLabel: 'Report',
    reportCount: (n: number) => (n === 1 ? '1 report' : `${n} reports`),
    matchCount: (n: number) => (n === 1 ? '1 match' : `${n} matches`),
  },

  header: {
    unknownReport: (id: string, fallback: string) =>
      `We couldn't find a report called "${id}", so we're showing ${fallback} instead.`,
    rowCount: (n: number) => (n === 1 ? '1 row' : `${n} rows`),
    position: (index: number, total: number) => `Report ${index} of ${total}`,
  },

  notice: {
    loading: 'Loading report',
    loadFailed: 'This report could not be loaded. Please try again.',
    snapshot:
      'This report shows the position as of now, so the selected period does not change it.',
    truncated: (n: number) =>
      `Showing the first ${n.toLocaleString('en-IN')} rows. Choose a shorter period to see everything.`,
    unavailableTitle: 'Not available yet',
    pickDatesTitle: 'Choose a period',
    pickDatesDescription: 'Pick a From and To date to run this report.',
  },

  filters: {
    period: 'Period',
    from: 'From',
    to: 'To',
    showing: 'Dates this period covers',
    presets: {
      today: 'Today',
      last7: 'Last 7 days',
      thisMonth: 'This month',
      lastMonth: 'Last month',
      thisQuarter: 'This quarter',
      thisYear: 'This year',
      custom: 'Custom',
    },
  },

  actions: {
    viewLabel: 'View',
    listView: 'List',
    chartView: 'Chart',
    exportCsv: 'Export CSV',
    print: 'Print',
  },

  kpi: {
    // One plain line under each headline number saying how it was worked out.
    hint: {
      count: 'Rows in this report',
      sum: (n: number) => (n === 1 ? 'Total of 1 row' : `Total of all ${n} rows`),
      avg: 'Average per row',
      max: 'Highest single row',
      min: 'Lowest single row',
    },
  },

  chart: {
    title: (value: string, category: string) => `${value} by ${category}`,
    barHint: 'Longer bar means a higher value.',
    lineHint: 'Read left to right to see how it changes over time.',
    noNumericColumn: 'This report has no chartable column.',
  },

  insights: {
    title: 'At a glance',
    highest: 'Highest',
    lowest: 'Lowest',
    average: 'Average',
    peak: 'Peak',
    latest: 'Latest',
    change: 'Change',
    shareOfTotal: (pct: string) => `${pct} of total`,
    acrossRows: (n: number) => `across ${n} rows`,
    changeDetail: (from: string, to: string) => `${from} → ${to}`,
    noChange: 'No change',
  },

  table: {
    title: 'Details',
    hint: 'Click a column heading to sort. Use the search and filters to narrow the rows.',
    searchPlaceholder: 'Search this report…',
    emptyTitle: 'Nothing to show',
    emptyDescription: 'This report has no rows for the selected period.',
    emptySnapshotDescription: 'There is nothing to report right now.',
  },

  toast: {
    exported: (reportLabel: string) => `${reportLabel} exported as CSV`,
  },
} as const
