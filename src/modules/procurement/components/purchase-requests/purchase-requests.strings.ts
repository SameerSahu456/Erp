// User-facing copy for the Procurement › purchase-requests sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const PR_STRINGS = {
  // List page chrome (ListPageShell).
  list: {
    title: "Purchase Requests",
    subtitle: "Manage and track purchase requisitions from teams and approvers.",
    createPR: "Create PR",
    breadcrumbs: {
      procurement: "Procurement",
      purchaseRequests: "Purchase Requests",
    },
    tabs: {
      all: "All",
      draft: "Draft",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
    },
    columns: {
      prNumber: "PR#",
      title: "Title",
      department: "Department",
      items: "Items",
      totalEstimated: "Est. Total",
      status: "Status",
      requestedBy: "Requested By",
      requestedDate: "Date",
    },
    stats: {
      totalPRs: "Total PRs",
      pendingApproval: "Pending Approval",
      approved: "Approved",
      totalValue: "Total Value",
    },
    empty: {
      title: "No purchase requests yet",
      description:
        "Create a PR to start the procurement flow for parts, equipment, or services.",
      action: "Create PR",
    },
  },

  // Form page chrome (PageHeader).
  form: {
    title: "Create Purchase Request",
    subtitle:
      "Fill in request info, line items, approval chain, then review and submit.",
    breadcrumbs: {
      procurement: "Procurement",
      purchaseRequests: "Purchase Requests",
      new: "New",
    },
    cancel: "Cancel",
    // Wizard step labels (also used as step IDs are elsewhere — only the label strings live here).
    steps: {
      requestInfo: "Request Info",
      lineItems: "Line Items",
      approvalChain: "Approval Chain",
      reviewSubmit: "Review & Submit",
    },
  },

  // Step 1 — Request Information.
  requestInfo: {
    heading: "Request Information",
    subtitle: "Fill in the basic request information",
    titleLabel: "Title",
    titlePlaceholder: "PR title",
    departmentLabel: "Department",
    departmentPlaceholder: "Select department",
    justificationLabel: "Justification",
    justificationPlaceholder: "Why is this purchase needed?",
    requiredByDateLabel: "Required By Date",
    urgencyLabel: "Urgency",
    urgencyPlaceholder: "Select urgency",
  },

  // Step 2 — Line Items.
  lineItems: {
    heading: "Line Items",
    subtitle: "Add the parts you need to purchase",
    columns: {
      part: "Part",
      partNo: "Part no",
      category: "Category",
      qty: "Qty",
      estUnitCost: "Est. Unit Cost",
      notes: "Notes",
    },
    partPlaceholder: "Select part",
    notesPlaceholder: "Notes",
    addItem: "Add Item",
    estimatedTotal: "Estimated Total",
  },

  // Step 3 — PM Approval.
  approval: {
    heading: "PM Approval",
    subtitle:
      "Based on the line items selected, the following Product Manager(s) will review this PR:",
    autoApprovedNotice:
      "This PR will be auto-approved as you are the assigned PM for all items.",
    unassignedWarningPrefix: "Some items have no PM assigned.",
    configurePMAssignments: "Configure PM Assignments",
    itemsUnderPM: "Items under this PM:",
    pendingBadge: "Pending",
    allOEMs: " / All OEMs",
    allVariants: " / All Variants",
    variantNew: "New",
    variantRefurb: "Refurbished",
    approvalRoutingNote:
      "Approval is routed by Category x OEM. If items span multiple categories/OEMs, each relevant PM must approve. Any rejection cancels the entire PR.",
    // Fallback step when no PM is assigned — used by getApprovalSteps().
    noPMLabel: "No PM Assigned",
    noPMDescription: "Configure PM Assignments",
    pmLabel: (pmName: string) => `PM: ${pmName}`,
  },

  // Step 4 — Review & Submit.
  review: {
    heading: "Review & Submit",
    subtitle: "Verify the details below before submitting your purchase request",
    requestInfoCard: "Request Info",
    itemsCard: (count: number) => `Items (${count})`,
    approvalChainCard: "Approval Chain",
    fields: {
      title: "Title",
      department: "Department",
      requiredBy: "Required By",
      urgency: "Urgency",
      justification: "Justification",
    },
    lineItemLabel: (partName: string, qty: number) => `${partName} x ${qty}`,
    total: "Total",
  },

  // Detail page.
  detail: {
    notFoundTitle: "Purchase Request not found",
    notFoundDescription: "The purchase request you are looking for does not exist.",
    backToPRs: "Back to Purchase Requests",
    convertToPO: "Convert to PO",
    approvalsCompleted: " approvals completed",
    // Quick-info strip labels.
    requestedBy: "Requested By",
    department: "Department",
    requiredBy: "Required By",
    totalEstimated: "Total Estimated",
    // Tabs.
    tabs: {
      items: "Items",
      approvalChain: "Approval Chain",
      linkedDocuments: "Linked Documents",
    },
    // Items tab.
    itemsTable: {
      part: "Part",
      partNo: "Part no",
      category: "Category",
      qty: "Qty",
      unitCost: "Unit Cost",
      estTotal: "Est. Total",
      urgency: "Urgency",
      notes: "Notes",
    },
    totalEstimatedLabel: "Total Estimated: ",
    // Approval tab inline actions.
    rejectButton: "Reject",
    approveButton: "Approve",
    // Linked documents tab.
    materialInquiry: "Material Inquiry",
    salesOrder: "Sales Order",
    notLinked: "Not linked",
    // High-priority sidebar alert.
    highPriorityTitle: "High Priority Items",
    highPriorityDetail: (count: number, urgencyLabel: string) =>
      `${count} item(s) marked as ${urgencyLabel} urgency`,
    urgencyLabelCritical: "Critical",
    urgencyLabelHigh: "High",
    // Right-rail cards.
    requestDetailsTitle: "Request Details",
    requestDetailFields: {
      prNumber: "PR Number",
      created: "Created",
      items: "Items",
      totalQty: "Total Qty",
    },
    justificationTitle: "Justification",
    notesTitle: "Notes",
    categoryBreakdownTitle: "Category Breakdown",
  },
} as const
