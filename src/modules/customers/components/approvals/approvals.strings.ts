// User-facing copy for the customers › approvals sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, and dialog copy live here as
// one typed `as const` object instead of being hardcoded ("naked") in JSX.
// Components import this via a relative path.
//
// Dynamic copy uses function members (e.g. approveDialog.description).
export const APPROVALS_STRINGS = {
  page: {
    title: "Customer Approvals",
    subtitle: "Review KYC, risk, and onboarding checklists before activation.",
    breadcrumbs: {
      customers: "Customers",
      approvals: "Approvals",
    },
  },
  filter: {
    placeholder: "Filter by status",
    all: "All Pending",
    kycPending: "KYC Pending",
    onboarding: "Onboarding",
  },
  empty: {
    heading: "No Pending Approvals",
    description: "All customer registrations have been reviewed.",
    backToCustomers: "Back to Customers",
  },
  card: {
    kycPassed: (passed: number, total: number) =>
      `KYC: ${passed}/${total} items passed`,
    docsVerified: (verified: number, total: number) =>
      `Documents: ${verified}/${total} verified`,
    creditLimit: (amount: string) => `Credit Limit: ${amount}`,
    review: "Review",
    approve: "Approve",
    reject: "Reject",
  },
  approveDialog: {
    title: "Approve Customer",
    description: (companyName: string) =>
      `Approve "${companyName}" as a registered customer?`,
    cancel: "Cancel",
    confirm: "Approve",
  },
  rejectDialog: {
    title: "Reject Customer",
    description: (companyName: string) =>
      `Provide a reason for rejecting "${companyName}".`,
    reasonPlaceholder: "Rejection reason...",
    cancel: "Cancel",
    confirm: "Reject",
  },
} as const
