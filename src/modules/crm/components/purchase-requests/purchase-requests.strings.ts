// User-facing copy for the CRM › purchase-requests sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error text, table headers, and the sub-feature's
// toast messages live here as one typed `as const` object instead of being
// hardcoded ("naked") in JSX/hooks. Components and hooks import this single
// source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `form.editTitle`).
export const PURCHASE_REQUESTS_STRINGS = {
  list: {
    title: "Purchase Requests",
    subtitle:
      "Multi-category PRs require approval from each Product Manager before procurement.",
    breadcrumbCrm: "CRM",
    breadcrumbSelf: "Purchase Requests",
    createAction: "Create PR",
    stats: {
      total: "Total PRs",
      pendingPM: "Pending PM Approval",
      readyForProcurement: "Ready for Procurement",
    },
    columns: {
      prNumber: "PR #",
      linkedSO: "Linked SO",
      status: "Status",
      pmApprovals: "PM Approvals",
      categories: "Categories",
      items: "Items",
      requestedBy: "Requested By",
      created: "Created On",
    },
    tabs: {
      all: (count: number) => `All (${count})`,
      pendingPM: (count: number) => `Pending PM (${count})`,
      procurement: (count: number) => `Procurement (${count})`,
    },
    categoriesPill: {
      summaryLabel: "Categories",
      hoverTitle: "PR Categories",
    },
    viewAction: "View",
    empty: {
      title: "No purchase requests yet",
      description:
        "Create a PR to kick off the approval flow for a sales order.",
      action: "Create PR",
    },
  },
  form: {
    createTitle: "Create Purchase Request",
    editTitle: (prNumber: string) => `Edit PR: ${prNumber}`,
    createSubtitle: "Request the procurement team to source items for an order.",
    editSubtitle: "Update items, justification, and assignments.",
    breadcrumbCrm: "CRM",
    breadcrumbSelf: "Purchase Requests",
    breadcrumbNew: "New PR",
    breadcrumbEdit: "Edit",
    prNumberLabel: "PR #:",
    linkedSoLabel: "Linked SO:",
    requestedByMetaLabel: "Requested By:",
    cancel: "Cancel",
    saveDraft: "Save Draft",
    submit: "Submit to Procurement",
    cardTitleEdit: "Edit Purchase Request",
    cardTitleNew: "New Purchase Request",
    requestedByLabel: "Requested By",
    statusLabel: "Status",
    totalEstimatedLabel: "Total Estimated:",
    totalConfirmedLabel: "Total Confirmed:",
    notesLabel: "Notes",
    notesPlaceholder: "Add any notes for the procurement team...",
  },
  items: {
    heading: "Items",
    columns: {
      index: "#",
      item: "Item",
      category: "Category",
      qty: "Qty",
      estRate: "Est. Rate (₹)",
      confirmed: "Confirmed (₹)",
      available: "Available",
      vendorNotes: "Vendor Notes",
    },
    itemPlaceholder: "Item name",
    categoryPlaceholder: "Category",
    vendorNotesPlaceholder: "Notes",
    addItem: "Add Item",
  },
  toast: {
    draftSaved: "Purchase request saved as draft",
    submitted: "Purchase request submitted to procurement",
  },
} as const
