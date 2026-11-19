// User-facing copy for the Procurement › pm-approvals sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and toast
// messages live here as one typed `as const` object instead of being
// hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const PM_APPROVALS_STRINGS = {
  // PMApprovalsBody — page shell (ListPageShell title/subtitle)
  page: {
    title: "PM Approvals",
    subtitle: "Review and action the requests awaiting your sign-off.",
  },

  // PmQueueTable — shared Review action.
  queueTable: {
    review: "Review",
  },

  // PM Approvals queue toolbars — search box + multi-select filters.
  queueFilters: {
    search: {
      mi: "Search inquiry number…",
      so: "Search SO number…",
      po: "Search PO number or supplier…",
      sret: "Search request or SO number…",
      rr: "Search request number…",
      demo: "Search demo number…",
    },
    // Plural-noun placeholders, like the Accounts toolbar ("Industries", "Types").
    allAccounts: "Accounts",
    // Matches created-by OR submitted-by (see useMyPendingSalesOrders).
    allUsers: "Users",
    // Each tab's user filter is named for the column it filters, Title Case
    // like the headers ("Created By", "Created Date").
    createdBy: "Created By",
    requestedBy: "Requested By",
    // SO matches the creator OR the submitter (see useMyPendingSalesOrders).
    createdOrSubmittedBy: "Created / Submitted By",
    createdDate: "Created Date",
    submittedDate: "Submitted Date",
    accountsSelected: (n: number) => `${n} ${n === 1 ? "account" : "accounts"}`,
    usersSelected: (n: number) => `${n} ${n === 1 ? "user" : "users"}`,
    resolving: "…",
    accountFilterLabel: "Account",
    userFilterLabel: "User",
  },

  // MIPMApprovalCard — header card
  inquiryCard: {
    loading: "Loading inquiry…",
    loadError: "Failed to load inquiry.",
    loadErrorFallback: "You may not have procurement read access.",
    noDescription: "No description",
    // `N response(s) awaiting PM` — inline pluralisation handled at call site
    // via respondingAwaitingPm.
    responsesAwaitingPm: (count: number) =>
      `${count} response${count === 1 ? "" : "s"} awaiting PM`,
    metaLabels: {
      lead: "Lead",
      deal: "Deal",
      clientBudget: "Client Budget",
      timeline: "Timeline",
      notes: "Notes",
    },
    noItems: "This inquiry has no items.",
    noAssignedItems: "No items on this inquiry are assigned to you.",
  },

  // ItemApprovalCard — per-item response table
  itemCard: {
    // Inline quantity/budget/timeline/category summary — parts are assembled
    // at call site; only the "Qty" prefix is a fixed string.
    qtyPrefix: "Qty",
    budgetPerUnit: (value: string) => `Budget ${value}/unit`,
    allocated: "allocated",
    remaining: "remaining",
    blendedSell: (value: string) => `Blended sell ${value}/unit`,
    loadingResponses: "Loading vendor responses…",
    cantLoadResponses: "Couldn't load responses.",
    noResponses: "No vendor responses yet.",
    columns: {
      vendor: "Vendor",
      qtyAvail: "Qty Avail",
      costPerUnit: "Cost / unit",
      sellPerUnit: "Sell / unit",
      available: "Available",
      status: "Status",
      action: "Action",
    },
  },

  // ResponseActionRow — per-response approve/reject buttons
  responseRow: {
    allocSuffix: (n: number) => `(${n} alloc)`,
    approve: "Approve",
    reject: "Reject",
  },

  // PMDecisionBadge — status badge labels
  pmStatus: {
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending PM",
  },

  // ApproveDialog
  approveDialog: {
    title: "Approve vendor response",
    vendorSummary: (vendorName: string, qtyAvail: number, costDisplay: string, qtyRemaining: number) =>
      `Qty avail ${qtyAvail} · Cost ${costDisplay}/unit · ${qtyRemaining} remaining on item`,
    qtyAllocatedLabel: "Qty allocated",
    qtyAllocatedRequired: "*",
    qtyAllocatedHint: (max: number) => `How many units to commit from this vendor (0 to ${max}).`,
    marginPctLabel: "Margin %",
    marginPctPlaceholder: "e.g. 7.5",
    sellPriceLabel: "Sell price (₹/unit)",
    pricingHint: (costDisplay: string) =>
      `Leave both blank to use the default margin. Provide either one to drive pricing — the server derives the other. Sell price must be at least the vendor cost (${costDisplay}/unit).`,
    pmNotesLabel: "PM Notes",
    pmNotesPlaceholder: "Optional commentary visible on the response.",
    cancel: "Cancel",
    approve: "Approve",
    approving: "Approving…",
    // Inline validation errors
    qtyError: "Qty allocated must be ≥ 0.",
    marginError: "Margin % must be between 0 and 100.",
    sellPriceError: "Sell price must be ≥ 0.",
    sellPriceBelowCost: (sell: number, cost: number) =>
      `Sell price (₹${sell}) cannot be less than the vendor cost price (₹${cost}).`,
  },

  // RejectDialog
  rejectDialog: {
    title: "Reject vendor response",
    bodyPrefix: "Rejecting",
    bodySuffix: "'s response. This action freezes the row — backend won't allow further edits.",
    reasonLabel: "Reason (optional)",
    reasonPlaceholder: "Why are you rejecting?",
    cancel: "Cancel",
    confirmRejection: "Confirm Rejection",
    rejecting: "Rejecting…",
  },

  // PMApprovalsBody — tab labels and stats
  tabs: {
    materialInquiry: "Material Inquiry",
    salesOrder: "Sales Order",
    purchaseRequest: "Purchase Request",
    purchaseOrder: "Purchase Order",
    demoRequest: "Demo Request",
  },

  stats: {
    miInquiries: "MI Inquiries",
    salesOrders: "Sales Orders",
    prItems: "PR Items",
    purchaseOrders: "Purchase Orders",
    salesReturns: "Sales Returns",
    replacements: "Replacements",
    demoRequests: "Demo Requests",
  },

  // InlineActions — approve/reject alert dialog
  inlineActions: {
    approvedBadge: "Approved",
    rejectedBadge: "Rejected",
    approveButton: "Approve",
    rejectButton: "Reject",
    approveTitleDialog: "Approve this request?",
    rejectTitleDialog: "Reject this request?",
    approveDescription: "This will mark the item as approved and notify downstream stakeholders.",
    rejectDescription: "This will mark the item as rejected. The requester will be notified.",
    cancel: "Cancel",
    confirmApprove: "Approve",
    confirmReject: "Reject",
  },

  // MI queue table headers
  miQueue: {
    columns: {
      hash: "#",
      inquiry: "Inquiry",
      customer: "Customer",
      items: "Items",
      pending: "Pending",
      oldestPending: "Oldest pending",
      createdBy: "Created By",
      createdAt: "Created At",
      action: "Action",
    },
    review: "Review",
    loading: "Loading your PM queue…",
    loadError: "Failed to load PM queue.",
    empty: "Your PM queue is empty — nothing pending right now.",
  },

  // SO queue table headers
  soQueue: {
    columns: {
      hash: "#",
      order: "Sales Order",
      account: "Account",
      createdBy: "Created By",
      submittedBy: "Submitted By",
      status: "Status",
      total: "Total",
      submittedAt: "Submitted At",
    },
    loading: "Loading sales orders…",
    loadErrorPrefix: "Failed to load sales orders: ",
    loadError: "Failed to load sales orders.",
    empty: "No submitted or partially-approved sales orders.",
  },

  // PR queue table headers
  prQueue: {
    columns: {
      hash: "#",
      pr: "PR",
      item: "Item",
      qty: "Qty",
      estTotal: "Est. Total",
      action: "Action",
    },
    loading: "Loading your PM queue…",
    loadErrorPrefix: "Failed to load PM queue: ",
    loadError: "Failed to load PM queue.",
    empty: "Your PM queue is empty — nothing pending right now.",
    noPRs: "No Purchase Requests require your approval",
    itemsCount: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
  },

  // PO queue table headers
  poQueue: {
    columns: {
      hash: "#",
      po: "PO",
      // PM queue header — no "#" (the PO list keeps its own "PO#").
      poNumber: "PO Number",
      vendor: "Vendor",
      items: "Items",
      total: "Total",
      createdBy: "Created By",
      createdAt: "Created At",
      action: "Action",
    },
    noPOs: "No Purchase Orders match your categories",
    // RealPoApprovalsTab empty state (title + one line).
    emptyTitle: "Nothing to approve",
    emptyDescription: "No purchase orders are awaiting your approval right now.",
  },

  // Demo queue table headers
  demoQueue: {
    columns: {
      hash: "#",
      demo: "Demo",
      account: "Account",
      items: "Items",
      returnBy: "Return By",
      requestedBy: "Requested By",
      createdAt: "Created At",
      action: "Action",
    },
    loading: "Loading Demo Requests…",
    loadErrorPrefix: "Failed to load Demo Requests: ",
    loadError: "Failed to load Demo Requests.",
    empty: "No Demo Requests assigned to you",
    accountFallback: "Account",
    itemsPending: (pending: number, total: number) => `${pending}/${total} pending`,
    overdue: "· overdue",
  },

  // ReplacementApprovalPanel — the SO-approval-styled replacement surface.
  // Actions-column verdict for a decided line (both approval panels).
  decided: {
    rejectionReason: "Reason:",
    showMore: "... Show more",
    showLess: "Show less",
    quoted: (note: string) => `“${note}”`,
  },

  rrPanel: {
    units: "Units",
    unitsCount: (n: number) => `${n} ${n === 1 ? "unit" : "units"}`,
    salesOrder: "Sales Order",
    // Same words as the Replacement tab listing (Raised Date / Created By).
    account: "Account",
    raisedDate: "Raised Date",
    createdBy: "Created By",
    replacementType: "Replacement Type",
    priority: "Priority",
    ticket: "Ticket",
    reason: "Reason",
    showMore: "... Show more",
    showLess: "Show less",
    loadFailed: "Failed to load the replacement request.",
    noLines: "This replacement request has no lines.",
    unknownPart: "Unknown part",
    anyUnit: "Any unit",
    none: "—",
    cols: {
      item: "Item",
      serial: "Serial",
      decision: "Decision",
      substitute: "Substitute",
      actions: "Actions",
    },
    approve: "Approve",
    reject: "Reject",
    rejectDialog: {
      title: "Reject this line?",
      body: "The unit it claimed becomes available again. Say why so the customer can be told.",
      reasonPlaceholder: "Why is this replacement refused?",
      cancel: "Cancel",
      confirm: "Reject line",
    },
  },

  // SalesReturnApprovalPanel — the SO-approval-styled sales-return surface.
  sretPanel: {
    units: "Units",
    unitsCount: (n: number) => `${n} ${n === 1 ? "unit" : "units"}`,
    salesOrder: "Sales Order",
    // Same fields + words as the Replacement details page.
    account: "Account",
    raisedDate: "Raised Date",
    createdBy: "Created By",
    reason: "Reason",
    showMore: "... Show more",
    showLess: "Show less",
    description: "Description",
    notes: "Notes",
    loadFailed: "Failed to load the sales return.",
    noLines: "This sales return has no lines.",
    unknown: "—",
    unknownPart: "Unknown part",
    // A line not pinned to one unit — any unit of the model may come back.
    anyUnit: "Any unit of this model",
    cols: {
      item: "Item",
      serial: "Serial",
      dispatchedDate: "Dispatched Date",
      actions: "Actions",
    },
    approve: "Approve",
    reject: "Reject",
    rejectDialog: {
      title: "Reject this line?",
      body: "The customer is told this unit won't be taken back. Say why.",
      reasonPlaceholder: "Why is this return refused?",
      cancel: "Cancel",
      confirm: "Reject line",
    },
  },

  // PMApprovalDetailBody
  detailBody: {
    subtitleSuffix: "· Approval",
    replacementFallback: "Replacement Request",
    salesReturnFallback: "Sales Return",
    loadingSalesReturn: "Loading sales return…",
    loadingReplacement: "Loading replacement request…",
    backHref: "/procurement/pm-approvals",
    loadingDemoRequest: "Loading demo request…",
    demoRequestFallback: "Demo Request",
    loadingSalesOrder: "Loading sales order…",
    loadingMaterialInquiry: "Loading material inquiry…",
    materialInquiryFallback: "Material Inquiry",
    salesOrderFallback: "Sales Order",
    loadingQuote: "Loading quote…",
    quoteFallback: "Quote",
    noCategories: (pmName: string) => `No categories assigned to ${pmName} on this PR.`,
    noDemoItems: "This demo request has no items.",
    noDemoAssigned: "No items on this demo request are assigned to you.",
    // Display fallbacks for a demo line whose catalog record hasn't resolved
    // (truly-missing person / address values render as `—`, not a word).
    fallbacks: {
      productManager: "Assigned PM",
      catalogItem: "Catalog item",
      uncategorized: "Uncategorized",
      catalog: "Catalog",
    },
    notFound: {
      title: "Record not found",
      description: "The item you were looking for could not be located.",
      backButton: "Back to PM Approvals",
    },
  },

  // Mutation toast messages (useMIResponses hook).
  toast: {
    responseRecorded: "Vendor response recorded",
    responseDeleted: "Response deleted",
    responseApproved: "Response approved",
    responseRejected: "Response rejected",
  },
} as const
