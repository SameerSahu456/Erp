// User-facing copy for the dashboard module.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, section
// headers, badge labels, and inline stat copy live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX. Components import this
// single source so copy stays consistent and is edited in one place.
export const DASHBOARD_STRINGS = {
  // PageHeader copy at the top of the dashboard.
  page: {
    title: "Dashboard",
    subtitle:
      "Real-time insights across CRM, warehouse, inventory, and procurement modules.",
    metaLabel: "Overview",
  },

  // Section header titles used inside DashboardBody.
  sections: {
    kpi: "Key Performance Indicators",
    wmsLifecycle: "WMS Device Lifecycle",
    businessMetrics: "Business Metrics",
    recentActivity: "Recent Activity",
    teamMembers: "Team Members",
    statusBadges: "Status Badges",
    quickStats: "Quick Stats",
  },

  // StatusBadge demo labels shown in the Status Badges section.
  statusBadgeDemo: {
    active: "Active",
    pendingReview: "Pending Review",
    failed: "Failed",
    inTransit: "In Transit",
    draft: "Draft",
    overdue: "Overdue",
  },

  // Quick Stats inline data labels and values.
  quickStats: {
    devicesRepaired: "Devices repaired this week",
    avgRepairTurnaround: "Avg repair turnaround",
    avgRepairTurnaroundValue: "3.2 days",
    warehouseUtilization: "Warehouse utilization",
    pendingInspections: "Pending inspections",
  },
} as const
