// User-facing copy for the WMS › Dashboard sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, card
// titles, and stat labels live here as one typed `as const` object instead of
// being hardcoded in JSX/hooks.
export const WMS_DASHBOARD_STRINGS = {
  page: {
    title: 'Warehouse Dashboard',
    // subtitle is dynamic: `${totalDevices} devices across the pipeline…`
    subtitleSuffix:
      ' devices across the pipeline — track repair, QC, and dispatch throughput.',
    breadcrumbWms: 'WMS',
    breadcrumbDashboard: 'Dashboard',
  },
  workflow: {
    cardTitle: 'Workflow Pipeline',
    // Step description: "${n} devices"
    stepDescription: (count: number) => `${count} devices`,
  },
  kpi: {
    totalDevices: 'Total Devices',
    inRepair: 'In Repair',
    pendingQC: 'Pending QC',
    readyForDispatch: 'Ready for Dispatch',
    assignmentPending: 'Assignment Pending',
    pendingInspection: 'Pending Inspection',
    inspected: 'Inspected',
    waitingForSpares: 'Waiting for Spares',
    inPaint: 'In Paint',
    inQC: 'In QC',
    readyForStock: 'Ready for Stock',
    inStock: 'In Stock',
  },
  charts: {
    barChartTitle: 'Devices by Pipeline Stage',
    pieChartTitle: 'Pipeline Distribution',
    barDataKeyName: 'Devices',
  },
  // Pipeline stage labels shown on the bar-chart axis and pie-chart legend.
  analyticsStages: {
    assignmentPending: 'Assignment Pending',
    pendingInspection: 'Pending Inspection',
    inspected: 'Inspected',
    waitingForSpares: 'Waiting for Spares',
    inPaint: 'In Paint',
    inRepair: 'In Repair',
    inQC: 'In QC',
    readyForStock: 'Ready for Stock',
    inStock: 'In Stock',
  },
  breakdown: {
    cardTitle: 'Device Status Breakdown',
    tabLabel: 'All Statuses',
    columns: {
      status: 'Status',
      count: 'Count',
      percentage: 'Percentage',
    },
  },
  recentActivity: {
    cardTitle: 'Recent Activity',
  },
} as const
