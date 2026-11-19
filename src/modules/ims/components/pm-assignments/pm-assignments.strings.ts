// User-facing copy for the IMS › pm-assignments sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components import this single
// source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as function members (see `detail.revokedBanner`,
// `list.editAriaLabel`, etc.).
export const PM_ASSIGNMENTS_STRINGS = {
  // Detail page — PMAssignmentDetailBody
  detail: {
    // Revoked-assignment banner. Interpolates the revoked-at date string.
    revokedBanner: (date: string) =>
      `This assignment was revoked on ${date}. The (user, category, Brand/OEM, condition) scope is free to reassign.`,

    // Three-stat header cards
    permissionsCard: "Permissions",
    validityCard: "Validity",
    conditionCard: "Condition",

    viewYes: "View: Yes",
    viewNo: "View: No",
    editYes: "Edit: Yes",
    editNo: "Edit: No",
    allConditions: "All conditions",

    // Product Manager card
    pmCardTitle: "Product Manager",
    pmNameLabel: "Name",
    pmEmailLabel: "Email",

    // Scope card
    scopeCardTitle: "Scope",
    categoryLabel: "Category",
    subcategoryLabel: "Subcategory",
    oemLabel: "Brand/OEM",
    allCategories: "All categories",
    allSubcategories: "All subcategories",
    allOems: "All Brand/OEMs",

    // Notes card
    notesCardTitle: "Notes",

    // Footer audit trail
    createdPrefix: "Created",
    lastUpdatedInfix: " · Last updated",

    // Action buttons
    editButton: "Edit",
    revokeButton: "Revoke",
    revokeButtonPending: "Revoking…",
    revokeButtonDisabledTitle: "Already revoked",
    editButtonDisabledTitle: "Revoked assignments cannot be edited",

    // Revoke confirmation dialog
    revokeDialogTitle: "Revoke this PM assignment?",
    revokeDialogDescription:
      "The PM loses access to this scope immediately. The assignment stays in history — admins can still fetch revoked rows.",
    revokeConfirmLabel: "Revoke assignment",
    revokePendingLabel: "Revoking…",

    // Edit dialog
    editDialogTitle: "Edit PM assignment",
    editDialogSubtitle:
      "Saving will revoke the existing row and create a new one in its place. Audit logs link the two.",
    editDialogCancel: "Cancel",
    editDialogSave: "Save",
    editDialogSaving: "Saving…",
  },

  // List page — PMAssignmentsBody
  list: {
    title: "PM Assignments",
    subtitleSuperuser:
      "Product Manager ownership for category / Brand/OEM / variant combinations.",
    subtitleLimited:
      "Showing only the assignments scoped to you. Ask an admin to see other PMs.",

    addAssignment: "Add Assignment",

    // Load-error state (BMT `error=` prop)
    error: {
      title: "Couldn’t load PM assignments",
      description: "Something went wrong while loading. Please try again.",
    },

    // Table cell display values
    allCategories: "All Categories",
    allOem: "All",
    allCondition: "All",

    // Toolbar filter placeholders
    filters: {
      allCategory: "All Category",
      allBrandOem: "All Brand/OEM",
      allConditions: "All Conditions",
      allStatus: "All Status",
    },

    // Create / Edit dialog
    dialogTitleCreate: "Add PM assignment",
    dialogTitleEdit: "Edit PM assignment",
    dialogEditSubtitle:
      "Saving will revoke the existing row and create a new one in its place. Audit logs link the two.",
    dialogCancel: "Cancel",
    dialogSave: "Save",
    dialogSaving: "Saving…",

    // Revoke confirmation dialog
    revokeDialogTitle: "Revoke this PM assignment?",
    revokeDialogDescription:
      "The PM loses access to this scope immediately. To change the scope, revoke this row and add a fresh assignment.",
    revokeConfirmLabel: "Revoke assignment",
    revokePendingLabel: "Revoking…",

    // Action-button titles / aria-labels (dynamic — interpolate PM name)
    editAssignmentFor: (name: string) => `Edit assignment for ${name}`,
    revokeAssignmentFor: (name: string) => `Revoke assignment for ${name}`,
    editDisabledTitle: "Revoked assignments cannot be edited",
    revokeDisabledTitle: "Already revoked",
  },

  // usePMAssignments hook — CRUD success + error fallbacks.
  toasts: {
    created: "Assignment created",
    updated: "Assignment updated",
    revoked: "Assignment revoked",
    createFailed: "Failed to create assignment",
    updateFailed: "Failed to update assignment",
    revokeFailed: "Failed to revoke assignment",
  },
} as const
