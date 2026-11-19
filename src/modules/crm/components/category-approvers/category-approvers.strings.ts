// All user-facing copy for the Category approvers panel + manage dialog.
// §16.12 — no naked strings in components; this file is the single
// source of truth for approver-UI copy. Mirrors the shape of the IMS
// `categories.strings.ts` so the panel reads consistently with
// Subcategories / Parts on the same page.

export const CATEGORY_APPROVERS_STRINGS = {
  // The count lives on the tab badge (like Subcategories / Parts), not in
  // the panel title. Mix across approval types (Quote / SO / PR / DR) stays in one
  // table with a Type column — not multiple panels — so the user sees
  // every approver for this category at a glance.
  panel: {
    title: "Approvers",
    manageButton: "Manage",
    emptyText: "No approvers.",
    loadError: "Failed to load approvers.",
    retry: "Retry",
  },

  // Human-readable scope labels for the Type column. The map stays in
  // sync with the `ApprovalScope` union in `api/category-approvers.ts`
  // — adding a new scope means adding a label here.
  scopeLabel: {
    quote: "Quote",
    sales_order: "Sales Order",
    purchase_request: "Purchase Request",
    demo_request: "Demo Request",
  },

  columns: {
    name: "Name",
    type: "Type",
    role: "Role",
    threshold: "Threshold",
    addedOn: "Added on",
    actions: "",
  },

  rowActions: {
    edit: "Edit approver",
  },

  editDialog: {
    title: "Edit Quote Approver",
    description:
      "Change the approver or adjust the threshold for this row. Saving replaces the current approver set for this category.",
    saveButton: "Save changes",
    savingButton: "Saving…",
    cancelButton: "Cancel",
    errorHeading: "Could not save changes",
    saveFailed: "Could not save changes.",
  },

  // Save toast. Built from the diff between the set before the save and
  // the set the backend returned, so "1 approver added" / "Threshold
  // updated for 2 approvers" reads what actually changed — never a flat
  // "Approvers updated" for a one-row threshold edit.
  toast: {
    added: (n: number) => (n === 1 ? "1 approver added" : `${n} approvers added`),
    removed: (n: number) => (n === 1 ? "1 approver removed" : `${n} approvers removed`),
    thresholdUpdated: (n: number) =>
      n === 1 ? "Threshold updated for 1 approver" : `Threshold updated for ${n} approvers`,
    noChanges: "No changes to approvers",
    // When the previous set isn't in cache there is nothing to diff against.
    fallback: "Approvers updated",
    saveFailed: "Failed to update approvers",
  },

  dialog: {
    // Scope-locked day-1 (approval.md §7 — only `quote` is wired). When
    // SO/PR/DR adopt the shared table, swap for a dynamic title + add
    // a Type selector at the top of the dialog.
    title: "Manage Quote Approvers",
    description:
      "Pick the users who can approve quote lines in this category. Each approver has a threshold — the maximum line value they can auto-approve. Lines above every threshold go to the highest-threshold approver for human review.",
    addRow: "Add approver",
    userPickerLabel: "Approver",
    userPickerPlaceholder: "Select a user…",
    thresholdLabel: "Threshold (₹)",
    thresholdPlaceholder: "e.g. 1000000",
    thresholdHelper:
      "Line value at or below this amount auto-approves. Enter 0 to require every line to go through human review.",
    removeRow: "Remove this approver",
    emptyPicker:
      "No eligible users found. Grant “crm:quote_approve” to a role or create a superuser.",
    saveButton: "Save approvers",
    cancelButton: "Cancel",
    savingButton: "Saving…",
    errorHeading: "Could not save approvers",
    superuserBadge: "superuser",
    searchPlaceholder: "Search users…",
    searchNoResults: "No users match your search.",
    // The dialog loads the COMPLETE approver set itself (the table behind it
    // only holds one page). Shown when that load fails.
    loadError: "Could not load the current approvers.",
    retry: "Retry",
    // One user at most once per category per approval type. Shown under the
    // offending rows — both the first pick and its repeat.
    duplicateApprover: "This approver is already added for this category.",
    userRequired: "Please select a user for this row before saving.",
    invalidThreshold: "Threshold must be a non-negative number.",
    saveFailed: "Could not save approvers.",
  },
} as const
