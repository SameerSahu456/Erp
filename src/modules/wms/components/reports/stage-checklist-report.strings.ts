// User-facing copy for the WMS › Stage Checklist Report.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, filter labels, option labels, empty/hint text, and toast messages
// live here as one typed `as const` object rather than naked in JSX.
export const STAGE_CHECKLIST_REPORT_STRINGS = {
  page: {
    title: "Stage Checklist Report",
    subtitle:
      "Devices in inspection and repair, with their latest checklist answers.",
  },

  actions: {
    export: "Export CSV",
    exporting: "Exporting…",
    toSummary: "Summary view",
    toGrid: "Full grid",
  },

  filters: {
    filters: "Filters",
    category: "Category",
    allCategories: "All categories",
    stage: "Stage",
    allStages: "Inspection + Repair",
    inspection: "Inspection",
    repair: "Repair",
    from: "From",
    to: "To",
    dateRange: "Date range",
    dateRangePlaceholder: "Select Date Range",
    po: "Purchase Order",
    allPos: "All POs",
    searchPo: "Search PO number…",
    searchCategory: "Search category…",
    part: "Part",
    allParts: "All parts",
    searchPart: "Search part…",
    engineer: "Engineer",
    allEngineers: "All engineers",
    searchEngineer: "Search engineer…",
    result: "Result",
    allResults: "All results",
    resultPass: "Pass",
    resultFail: "Fail",
    resultNa: "N/A",
    clear: "Clear filters",
    clearAll: "Clear all",
    removeFilter: (label: string) => `Remove ${label}`,
  },

  summary: {
    // Result count shown above the table alongside the active-filter chips.
    resultCount: (n: number) => `${n.toLocaleString("en-IN")} device${n === 1 ? "" : "s"}`,
  },

  table: {
    tabLabel: "Devices",
    checklistColumns: (n: number) =>
      `${n} checklist column${n === 1 ? "" : "s"}`,
  },

  // Column headers + their hover-help. The fixed identity columns are the
  // left-hand block of the report grid; the summary columns replace the
  // dynamic checklist columns in the condensed view.
  columns: {
    partName: "Part name",
    partCode: "Part code",
    category: "Category",
    variant: "Variant",
    deviceId: "Device ID",
    mfgSerial: "Mfg Serial",
    stage: "Stage",
    engineer: "Engineer",
    date: "Date",
    result: "Result",
    checklistFrom: "Checklist from",
    checklistFromHelp:
      "Which stage produced these answers. Often differs from Stage — a device " +
      "in repair usually shows the inspection that sent it there.",
    cycles: "Cycles",
    cyclesHelp:
      "Rework cycles. A device on cycle 2+ has been back through this stage.",
    checks: "Checks",
    failed: "Failed",
    failedHelp: "Checklist items answered Fail on the latest run.",
  },

  hints: {
    summaryTitle: "Summary view",
    noChecklistsTitle: "No checklist answers yet",
    // Explains an automatic view switch, so it doesn't look arbitrary.
    summaryBecauseMultiCategory:
      "Showing the summary view because more than one category is in scope. " +
      "Pick a Category to get one column per checklist question.",
    // Rows exist but no checklist has ever run against them. Saying "no data"
    // here would read as a bug rather than as a real state of the warehouse.
    noChecklistsYet:
      "These devices have no completed checklists yet. Checklist columns " +
      "appear once inspections run against a template for this category.",
  },

  empty: {
    title: "No devices matched these filters.",
    hint: "Try widening the stage, date range, or clearing the PO filter.",
  },

  errors: {
    exportFailed: "Export failed",
    loadFailed: "Couldn’t load the report. Please adjust the filters or try again.",
  },
} as const
