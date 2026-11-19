// User-facing copy for the WMS › warehouses list page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the page
// title/subtitle, table column & tab labels, search placeholder, row-action
// titles/aria-labels, and empty/error state copy live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX. The component
// imports this single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `tab` and the aria-labels).
export const WAREHOUSES_BODY_STRINGS = {
  // ListPageShell header
  title: "Warehouses",
  subtitle:
    "Physical stock areas, the conditions they handle, and the categories they cover.",
  newWarehouse: "New Warehouse",

  // BusinessMetricsTable search
  searchPlaceholder: "Search warehouses by name or code…",

  // Toolbar filters
  filters: {
    conditionLabel: "Condition",
    conditionAll: "All conditions",
  },

  // Status tab labels — the per-tab record count rides on BusinessMetricsTable's
  // `count` pill (server slim-count queries), not baked into the label.
  tabs: {
    active: "Active",
    inactive: "Inactive",
    all: "All",
  },

  // Table column labels
  columns: {
    name: "Name",
    code: "Code",
    location: "Location",
    conditions: "Conditions",
    status: "Status",
    actions: "Actions",
  },

  // Row-action button titles + aria-labels
  actions: {
    editTitle: "Edit",
    activateDeactivateTitle: (active: boolean) =>
      active ? "Deactivate" : "Activate",
    deleteTitle: "Delete",
    menuAria: (name: string) => `Actions for ${name}`,
    nameFallback: "warehouse",
  },

  // Delete confirmation — shown before the request; the toast on a 409
  // handles the "still has data" recovery path.
  deleteConfirm: {
    title: "Delete this warehouse?",
    description: (name: string) =>
      `${name} will be removed from the warehouse list. This works only when the warehouse has no stock and no racks or bins — otherwise empty or deactivate it first.`,
    confirm: "Delete",
    cancel: "Cancel",
  },

  // Empty / error states (passed to BusinessMetricsTable.emptyState)
  emptyTitle: "No Warehouses Yet",
  emptyDescription:
    "Create a warehouse to start tracking physical stock areas.",
  errorTitle: "Couldn't Load Warehouses",
  errorDescription: "Refresh to try again.",
  retry: "Retry",
} as const;
