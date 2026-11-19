// User-facing copy for the vendors › approvals sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const APPROVALS_STRINGS = {
  // Page header.
  page: {
    title: "Vendor Approvals",
    subtitle: "Review submitted vendor registrations and approve or reject with comments.",
    breadcrumbVendors: "Vendors",
    breadcrumbApprovals: "Approvals",
  },

  // Status filter toolbar.
  filter: {
    statusLabel: "Status:",
    placeholder: "Filter by status",
    allPending: "All Pending",
    submitted: "Submitted",
    underReview: "Under Review",
    documentsPending: "Documents Pending",
    // `{N} vendor(s) pending` count pill.
    pendingCount: (count: number) =>
      `${count} vendor${count !== 1 ? "s" : ""} pending`,
  },

  // Vendor card detail labels.
  card: {
    city: "City:",
    contact: "Contact:",
    submitted: "Submitted:",
    docs: "Docs:",
    // `{verified}/{total} verified` — document verification count.
    docsVerified: (verified: number, total: number) =>
      `${verified}/${total} verified`,
    // `+{n} more` — overflow category badge.
    moreCategories: (n: number) => `+${n} more`,
  },

  // Vendor card action buttons.
  actions: {
    review: "Review",
    approve: "Approve",
    reject: "Reject",
  },

  // Empty state (no pending approvals).
  empty: {
    title: "No Pending Approvals",
    description:
      "All vendor registrations have been reviewed. New submissions will appear here.",
  },

  // Approve confirmation dialog.
  approveDialog: {
    title: "Approve Vendor",
    // `Are you sure you want to approve "<companyName>" as a registered vendor?`
    description: (companyName: string) =>
      `Are you sure you want to approve "${companyName}" as a registered vendor?`,
    cancel: "Cancel",
    approve: "Approve",
  },

  // Reject confirmation dialog.
  rejectDialog: {
    title: "Reject Vendor",
    // `Provide a reason for rejecting "<companyName>".`
    description: (companyName: string) =>
      `Provide a reason for rejecting "${companyName}".`,
    placeholder: "Rejection reason...",
    cancel: "Cancel",
    reject: "Reject",
  },
} as const
