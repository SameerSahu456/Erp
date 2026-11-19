// User-facing copy for the Settings › roles sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const ROLES_STRINGS = {
  // Page header (RolesPermissionsBody)
  page: {
    title: "Roles & Permissions",
    subtitle:
      "Manage role names and assign backend permission codes directly from the live roles table.",
    addRole: "Add Role",
  },

  // Summary stat cards
  statsCards: {
    totalRoles: "Total roles",
    totalRolesBody: "Live roles loaded from the backend roles directory.",
    currentPage: "Current page",
    noRolesToPaginate: "No roles to paginate yet.",
    // `${start}-${end} of ${total} roles` — built at runtime
    pageRange: (start: number, end: number, total: number) =>
      `${start}-${end} of ${total} roles`,
    visibleOnPage: "Visible on page",
    visibleOnPageBody: "Roles returned by the API for this page.",
  },

  // Roles directory card
  directory: {
    cardTitle: "Roles Directory",
    cardDescription:
      "Search, paginate, edit roles, and assign permission codes from a dedicated modal.",
    searchPlaceholder: "Search roles…",
    clearSearch: "Clear search",
    noRolesFound: "No roles found yet.",
    // `Showing ${start}-${end} of ${total} roles` — built at runtime
    showing: (start: number, end: number, total: number) =>
      `Showing ${start}-${end} of ${total} roles`,
    refreshing: "Refreshing roles…",
    // `${count} returned` — built at runtime
    returned: (count: number) => `${count} returned`,
  },

  // Table headers
  table: {
    headRole: "Role",
    headAssignedPermissions: "Assigned Permissions",
    headActions: "Actions",
    loadingBody: "Loading roles…",
    errorTitle: "Failed to load roles",
    errorFallback: "Something went wrong while loading roles.",
    emptyFiltered: "No roles match this filter",
    emptyDefault: "No roles found",
    emptyFilteredHint: "Try a different name or clear the filter.",
    emptyDefaultHint: "Create a new role to get started.",
    rowSubtitle: "Backend-managed role entry.",
    badgeManagedInModal: "Managed in modal",
    badgeSystemRole: "System role",
    badgeRentalOrdersOnly: "Rental orders only",
    badgeSalesTeam: "Own / team sales orders",
    actionPermissions: "Permissions",
    actionEdit: "Edit",
  },

  // Pagination footer
  pagination: {
    // `Page ${page} of ${total}` — built at runtime
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    previous: "Previous",
    next: "Next",
  },

  // RolePermissionsDialog
  permissionsDialog: {
    title: "Update Permissions",
    // `Assign backend permission codes for ${name}. Existing permissions are preselected.`
    descriptionForRole: (name: string) =>
      `Assign backend permission codes for ${name}. Existing permissions are preselected.`,
    descriptionGeneric: "Assign backend permission codes for this role.",
    roleLabel: "Role",
    roleFallback: "Role",
    selectedCount: (count: number) => `${count} selected`,
    permissionsLabel: "Permissions",
    badgeSystemRoleLocked: "System role — locked",
    loadingAssigned: "Loading assigned permissions…",
    loadingMoreAssigned: "Loading more assigned permissions…",
    currentlyAssigned: "Currently assigned",
    codesCount: (count: number) => `${count} codes`,
    loadingAssignedBody: "Loading assigned permissions…",
    noPermissionsAssigned: "No permissions assigned yet.",
    cancel: "Cancel",
    savePermissions: "Save permissions",
  },

  // RoleFormDialog / RoleFormBody
  formDialog: {
    titleEdit: "Edit Role",
    titleCreate: "Add New Role",
    descriptionEdit:
      "Update the channel scope for this role. Renames are handled separately.",
    descriptionCreate:
      "Create a new role with the same naming rules enforced by the backend.",
    storedValueLabel: "Stored Value",
    storedValueFallback: "role name",
    roleNameLabel: "Role name",
    roleNameRequired: "Role name *",
    roleNamePlaceholder: "e.g. sales manager",
    roleNameHintEdit:
      "Role name is read-only here. Renames are handled separately.",
    roleNameHintCreate:
      "Lowercase letters, numbers and spaces. Up to 2 digits. 2–50 characters.",
    permissionsOnCreate: "Permissions on create",
    channelTagsLabel: "Channel tags",
    channelTagsPlaceholder: "Select channels…",
    channelTagsSystemNote:
      "Channel tags are ignored for superuser roles.",
    channelTagsSystemHint:
      "The built-in admin and superadmin roles bypass visibility filters.",
    channelTagsHint:
      "Restricts which leads and deals users with this role can see. Leave empty for unrestricted access.",
    // Record scope (RBAC-H2).
    dataScopeLabel: "Record scope",
    dataScopeAll: "All records",
    dataScopeAllHelp: "No restriction beyond the role's permissions.",
    dataScopeRental: "Rental orders only",
    dataScopeRentalHelp:
      "Rental sales orders, rental customers and their documents — nothing else, even if CRM permissions are added. A user holding any unrestricted role as well is not restricted.",
    dataScopeSalesTeam: "Own / team sales orders",
    dataScopeSalesTeamHelp:
      "Material issues, dispatches, returns and replacements only on the sales orders the user or their reporting team can see — even with warehouse permissions. Hides the Warehouse menu. A user holding any unrestricted role as well is not restricted.",
    cancel: "Cancel",
    saving: "Saving…",
    saveChanges: "Save changes",
    createRole: "Create role",
    toastFixField: "Please fix the highlighted field.",
  },

  // PermissionCodeMultiSelect
  permissionSelect: {
    defaultPlaceholder: "Select permissions…",
    // `${count} permission(s) selected` — pluralised at runtime
    selectedCount: (count: number) =>
      `${count} permission${count === 1 ? "" : "s"} selected`,
    searchPlaceholder: "Search permission codes…",
    loading: "Loading permissions…",
    loadError: "Failed to load permissions.",
    noMatchSearch: "No permissions match this search.",
    noPermissions: "No permissions found.",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
  },
} as const
