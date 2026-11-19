// User-facing copy for the Procurement › dashboard sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and toast
// messages live here as one typed `as const` object instead of being
// hardcoded ("naked") in JSX/hooks.
export const PROCUREMENT_DASHBOARD_STRINGS = {
  // PageHeader chrome
  page: {
    title: "Procurement Dashboard",
    subtitle:
      "Overview of purchase requests, orders, vendor performance, and spend analytics.",
    breadcrumbs: {
      procurement: "Procurement",
      dashboard: "Dashboard",
    },
  },

  // KPI stat row labels
  stats: {
    openPRs: "Open PRs",
    activePOs: "Active POs",
    pendingApprovals: "Pending Approvals",
    totalSpendThisMonth: "Total Spend This Month",
  },

  // Chart section card titles
  charts: {
    prStatusDistribution: "PR Status Distribution",
    poSpendByVendor: "PO Spend by Vendor",
  },

  // List section card titles + link labels
  lists: {
    recentPurchaseRequests: "Recent Purchase Requests",
    topVendors: "Top Vendors",
    pendingApprovals: "Pending Approvals",
    viewAll: "View all",
    // Vendor on-time delivery rate display: "On-time <N>%"
    onTimeRate: (pct: number) => `On-time ${pct}%`,
  },

  // PendingApprovalCard inline action buttons + alert dialog copy
  pendingCard: {
    reject: "Reject",
    approve: "Approve",
    cancel: "Cancel",
    // AlertDialog titles  — dynamic
    approveTitleDialog: (prNumber: string) => `Approve ${prNumber}?`,
    rejectTitleDialog: (prNumber: string) => `Reject ${prNumber}?`,
    // AlertDialog descriptions — dynamic
    approveDescription: (total: string, requestedBy: string) =>
      `This will approve a request worth ${total} from ${requestedBy}.`,
    rejectDescription: (requestedBy: string) =>
      `This will reject the request from ${requestedBy}. The requester will be notified.`,
    // AlertDialogAction labels
    approveAction: "Approve",
    rejectAction: "Reject",
  },

  // Toast messages fired on inline approve/reject
  toast: {
    approved: (prNumber: string) => `${prNumber} approved`,
    rejected: (prNumber: string) => `${prNumber} rejected`,
  },
} as const
