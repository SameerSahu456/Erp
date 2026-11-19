// User-facing copy for the shared PM-approvals components in
// src/modules/procurement/pm-approvals-shared.tsx.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and toast
// messages live here as one typed `as const` object instead of being
// hardcoded ("naked") in JSX/hooks. Dynamic copy is expressed as a function
// member.
export const PM_APPROVALS_SHARED_STRINGS = {
  // Queue tab labels.
  tabs: {
    salesReturn: "Sales Return",
    replacement: "Replacement",
  },

  // Replacement queue tab. Same server-side scoping as sales returns:
  // every row carries a line this PM may actually decide.
  replacement: {
    loading: "Loading replacement requests…",
    loadFailed: "Failed to load replacement requests.",
    empty: "No replacement requests waiting on you",
    columns: {
      request: "Request Number",
      customer: "Customer",
      reason: "Reason",
      // Shown as "mine/total", e.g. 1/2 — your pending units of the request.
      pendingLines: "Awaiting Approval Units",
      awaitingOfTotal: (mine: number, total: number) => `${mine}/${total}`,
      createdBy: "Created By",
      raised: "Raised Date",
      actions: "Decision",
    },
    approve: "Approve",
    reject: "Reject",
    approveAllHint: (n: number) =>
      `Approve ${n} line${n === 1 ? "" : "s"} awaiting you`,
    rejectDialogTitle: "Reject these lines?",
    rejectDialogBody:
      "The units they claimed become available again. Say why so the customer can be told.",
    rejectReasonLabel: "Reason",
    rejectReasonPlaceholder: "Why is this replacement refused?",
    rejectConfirm: "Reject lines",
    dismiss: "Cancel",
  },

  // Sales-return queue tab. Rows are scoped server-side to lines this PM
  // may actually decide, so "assigned to you" is literally true.
  salesReturn: {
    loading: "Loading sales returns…",
    loadFailed: "Failed to load sales returns.",
    empty: "No sales returns waiting on you",
    columns: {
      request: "Request Number",
      order: "Sales Order",
      customer: "Customer",
      pendingLines: "Awaiting Approvals",
      createdBy: "Created By",
      raised: "Raised Date",
      actions: "Decision",
    },
    approve: "Approve",
    reject: "Reject",
    open: "Open",
    // A decision here covers every line on the request this PM may act on —
    // the queue row is the request, not a single unit.
    approveAllHint: (n: number) =>
      `Approve ${n} line${n === 1 ? "" : "s"} awaiting you`,
    rejectDialogTitle: "Reject these lines?",
    rejectDialogBody:
      "The units they claimed become available again. Say why so the customer can be told.",
    rejectReasonLabel: "Reason",
    rejectReasonPlaceholder: "Why is this return refused?",
    rejectConfirm: "Reject lines",
    dismiss: "Cancel",
  },

  // ApprovalActionRow — notes label + action buttons
  approvalActionRow: {
    notesLabel: "Notes (optional)",
    reject: "Reject",
    approve: "Approve",
  },

  // PRApprovalCard — items table column headers
  prTable: {
    notesPlaceholder: "e.g., Recommend negotiating for better pricing...",
    colItem: "Item",
    colDescription: "Description",
    colQty: "Qty",
    colEstRate: "Est. Rate",
    colEstTotal: "Est. Total",
    // Inline status badge labels for approved / rejected category rows
    approved: "Approved",
    rejected: "Rejected",
    // NotesBox label for PR remarks
    remarksLabel: "Remarks",
    // Inline item count pluralisation: "N item(s)"
    itemCount: (n: number) => `${n} item${n !== 1 ? "s" : ""}`,
  },

  // POApprovalCard — items table column headers + NotesBox
  poTable: {
    colPart: "Part",
    colCategory: "Category",
    colQty: "Qty",
    colUnitPrice: "Unit Price",
    colAmount: "Amount",
    // NotesBox label for PO PM notes
    pmNotesLabel: "PM Notes",
    // ApprovalActionRow placeholder for PO
    notesPOPlaceholder: "e.g., Approved. Payment terms acceptable.",
  },

  // DemoApprovalCard — header meta line (requested-by + dates)
  demoMeta: {
    // `By <name> · <date> · Return by <returnDate>`
    byLine: (requestedBy: string, createdAt: string, returnDate: string) =>
      `By ${requestedBy} · ${createdAt} · Return by ${returnDate}`,
  },

  // DemoApprovalCard — items table column headers + misc labels
  demoTable: {
    colItem: "Item",
    colQty: "Qty",
    colUnitPrice: "Unit Price",
    colTax: "Tax %",
    colAmount: "Amount",
    colDecision: "Decision",
    // Inline status badge labels
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending",
    // Approved value summary row label
    approvedValue: "Approved value",
    // Ship-to label
    shipTo: "Ship to:",
    // SO-panel-style header fact labels (no trailing colon)
    shipToLabel: "Ship to",
    notesLabel: "Notes",
    // NotesBox label for demo PM remarks
    pmRemarksLabel: "PM Remarks",
    // Long notes / remarks are cut on the card; this opens the full text in a modal.
    showMore: "Show more",
    // Per-item action buttons
    approve: "Approve",
    reject: "Reject",
  },

  // DemoApprovalCard — item decision dialog (Dialog)
  decisionDialog: {
    approveTitle: "Approve item",
    rejectTitle: "Reject item",
    // `Add the PM note for <partName>.`
    description: (partName: string) => `Add the PM note for ${partName}.`,
    fallbackPartName: "this item",
    approvePlaceholder: "Approval note for this item",
    rejectPlaceholder: "Rejection reason for this item",
    cancel: "Cancel",
    approveAction: "Approve item",
    rejectAction: "Reject item",
  },

  // toast messages fired by store mutations
  toast: {
    // `<category> approved/rejected for <prId>`
    prCategoryActed: (category: string, action: string, prId: string) =>
      `${category} ${action} for ${prId}`,
    // `<poId> approved/rejected`
    poActed: (poId: string, action: string) => `${poId} ${action}`,
  },
} as const
