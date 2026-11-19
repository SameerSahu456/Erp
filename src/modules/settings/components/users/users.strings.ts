// User-facing copy for the Settings › users sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks.
//
// Dynamic copy is expressed as a function member.
export const USERS_STRINGS = {
  // ── UserManagementBody ──────────────────────────────────────────────────
  page: {
    title: "User Management",
    subtitle: "Add, edit, and deactivate users across roles and departments.",
    addUser: "Add User",
  },

  // Table column headers
  columns: {
    name: "Name",
    email: "Email",
    role: "Role",
    status: "Status",
    lastLogin: "Last Login",
    yearlyTarget: "Yearly Target",
    actions: "Actions",
  },

  // Stats row
  stats: {
    total: "Total Users",
    active: "Active",
    inactive: "Inactive",
  },

  // Filters
  filters: {
    searchPlaceholder: "Search by name or email...",
    clearSearch: "Clear search",
    allStatus: "All Status",
    active: "Active",
    inactive: "Inactive",
    // Hover tooltips on the filter controls: "<what it filters>: <what is chosen>".
    searchLabel: "Search",
    statusLabel: "Status",
    filterTip: (label: string, value: string) => `${label}: ${value}`,
  },

  // Table tabs
  tabs: {
    users: "Users",
  },

  // Loading / empty / error states
  table: {
    loading: "Loading users...",
    empty: "No users found",
    emptyDescription: "Try adjusting your filters or add a new user.",
    loadError: "Failed to load users.",
  },

  // Action tooltip labels
  actions: {
    viewActivityLog: "View activity log",
    editUser: "Edit user",
    deactivateUser: "Deactivate user",
    activateUser: "Activate user",
    resetPassword: "Reset password",
    deleteUser: "Delete user",
    /** `Delete user "${name}"?` — native confirm dialog (the list). */
    deleteConfirm: (name: string) => `Delete user "${name}"?`,
    /** Detail page — the `⋯` menu trigger (icon-only, so aria-label only). */
    moreActions: "More actions",
    /** Detail page delete uses the styled `ConfirmDialog`, not a native confirm. */
    deleteConfirmTitle: (name: string) => `Delete ${name}?`,
    deleteConfirmDescription:
      "This removes the user and their access. You can't undo this.",
    deleteConfirmButton: "Delete user",
    deleteCancelButton: "Keep user",
  },

  // ── UserFormDialog ───────────────────────────────────────────────────────
  dialog: {
    titleEdit: "Edit User",
    titleCreate: "Add New User",
    cancel: "Cancel",
    saving: "Saving...",
    saveChanges: "Save Changes",
    createUser: "Create User",
  },

  // Form field labels
  fields: {
    firstName: "First name *",
    lastName: "Last name",
    email: "Email *",
    password: "Password *",
    passwordPlaceholder: "Min 8 chars",
    phone: "Phone",
    department: "Department",
    designation: "Designation",
    roles: "Roles *",
    managers: "Managers",
    active: "Active",
    yearlyTarget: "Yearly Target",
    yearlyTargetPlaceholder: "e.g. 500000",
  },

  // Manager hint text
  managerHint: {
    noRoles: "Select role(s) first — the manager list depends on the chosen role(s).",
    /** Base hint when no org-chart role filter applies. */
    base: "Up to 10. All managers are equal — no primary manager.",
    /** Appended when the picker is narrowed by org-chart rules. */
    filtered: " List is filtered to managers valid for the selected role(s).",
  },

  // Form validation error messages
  validation: {
    firstNameRequired: "First name is required.",
    rolesRequired: "At least one role is required.",
    emailRequired: "Email is required.",
    passwordRequired: "Password is required.",
    passwordMinLength: "Password must be at least 8 characters.",
    // The input's keystroke filter makes a negative / exponent / >18-digit /
    // >2-decimal value untypeable, so none of those need a message. The only
    // rejectable input left is something shaped like a number but isn't one.
    yearlyTargetInvalid: "Yearly target must be a number.",
    fixHighlighted: "Please fix the highlighted fields.",
  },

  // ── RolePicker ──────────────────────────────────────────────────────────
  rolePicker: {
    placeholder: "All Roles",
    allLabel: "All Roles",
    // Name shown in the trigger tooltip ("Role: Sales Manager").
    filterLabel: "Role",
    searchPlaceholder: "Search roles…",
    clearAriaLabel: "Clear role filter",
    loading: "Loading…",
    loadError: "Failed to load roles",
    noMatches: "No matches",
    noRoles: "No roles",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
  },

  // ── RoleMultiPicker ─────────────────────────────────────────────────────
  roleMultiPicker: {
    placeholder: "Select role(s)…",
    searchPlaceholder: "Search roles…",
    loading: "Loading…",
    loadError: "Failed to load roles",
    noMatches: "No matches",
    noRoles: "No roles",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
    /** `Remove ${name}` — chip remove button aria-label. */
    removeChip: (name: string) => `Remove ${name}`,
  },

  // ── ManagerMultiPicker ──────────────────────────────────────────────────
  managerPicker: {
    placeholder: "Pick managers",
    searchPlaceholder: "Search users…",
    loading: "Loading…",
    loadError: "Failed to load users",
    noMatches: "No matches",
    noUsers: "No users",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
    /** `Max ${max} managers reached. Remove one before adding another.` */
    maxReached: (max: number) => `Max ${max} managers reached. Remove one before adding another.`,
    /** `${count} manager(s) selected` — trigger label when at least one is picked. */
    selectedCount: (count: number) => `${count} manager${count === 1 ? "" : "s"} selected`,
    /** `Remove ${label}` — chip remove button aria-label. */
    removeChip: (label: string) => `Remove ${label}`,
  },
} as const
