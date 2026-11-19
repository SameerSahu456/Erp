// User-facing copy for the IMS › oems sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const OEMS_STRINGS = {
  // ── OEMsBody (list page) ──
  list: {
    title: "Brand/OEMs",
    subtitle:
      "Original Equipment Manufacturers — Brand/OEMs and their contact details.",
    addOEM: "Add Brand/OEM",
    tabLabel: (total: number) => `Brand/OEMs (${total})`,
    columns: {
      name: "Name",
      code: "Code",
      actions: "Actions",
    },
    editButtonTitle: "Edit Brand/OEM",
    deleteButtonTitle: "Delete Brand/OEM",
    empty: {
      title: "No Brand/OEMs yet",
      description:
        "Add Brand/OEMs to associate them with parts and track warranty details.",
      action: "Add Brand/OEM",
    },
    error: {
      title: "Couldn’t load Brand/OEMs",
      description: "Something went wrong while loading. Please try again.",
    },
  },
  // ── OEMDetailBody ──
  detail: {
    notFoundTitle: "Brand/OEM not found",
    notFoundDescription: "The requested Brand/OEM does not exist.",
    quickStats: {
      totalModels: "Total Models",
      activeModels: "Active Models",
      categories: "Categories",
    },
    overview: {
      about: "About",
      noDescription: "No description provided.",
      categoriesHeading: "Categories",
      identity: "Identity",
      identityRows: {
        code: "Code",
        status: "Status",
        created: "Created",
        lastUpdated: "Last updated",
      },
    },
    models: {
      partsCataloguedUnder: (name: string) =>
        `Parts catalogued under ${name}`,
      addModel: "Add Model",
      searchPlaceholder: "Search models by name, part number or description…",
      tableHeaders: {
        srNo: "Sr No",
        model: "Model",
        partNo: "Part no",
        category: "Category",
        price: "Price",
      },
      emptyTitle: "No models found",
      emptyDescription: "No parts are catalogued under this Brand/OEM yet.",
    },
    sidebar: {
      cardTitle: "Brand/OEM Info",
      status: "Status",
      totalModels: "Total Models",
      activeModels: "Active Models",
      categories: "Categories",
    },
    tabs: {
      overview: "Overview",
      models: "Models",
      auditTrail: "Audit Trail",
    },
    actions: {
      edit: "Edit",
      delete: "Delete",
    },
    activeLabel: "Active",
    inactiveLabel: "Inactive",
  },
  // ── OEMFormBody ──
  form: {
    backAriaLabel: "Back",
    editTitle: (name: string) => `Edit Brand/OEM of ${name}`,
    addTitle: "Add Brand/OEM",
    fields: {
      name: "Name",
      namePlaceholder: "Dell",
      code: "Code",
      codePlaceholder: "DELL or dell-inc or hp/2024",
      notes: "Notes",
      notesPlaceholder: "Primary OEM for enterprise hardware.",
      activeLabel: "Active",
      activeDescription: "Inactive OEMs are hidden from pickers and the catalog.",
      activeAriaLabel: "OEM is active",
    },
    actions: {
      cancel: "Cancel",
      saving: "Saving…",
      saveChanges: "Save changes",
      createOEM: "Create OEM",
    },
    loadError:
      "Couldn’t load this OEM. The id may be invalid or you may not have access.",
  },
  // ── OEMOptionsCombobox ──
  combobox: {
    clearAriaLabel: "Clear Brand/OEM",
    placeholder: "Select a Brand/OEM…",
    searchPlaceholder: "Search Brand/OEMs… (min 2 chars)",
    loading: "Loading…",
    loadError: "Failed to load Brand/OEMs",
    noMatches: "No matches",
    noOEMs: "No Brand/OEMs",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
    triggerLoading: "Loading…",
  },
  // ── Shared delete dialog ──
  delete: {
    title: "Delete this Brand/OEM?",
    description:
      "Soft-delete. The OEM hides from new pickers; existing audit references stay intact.",
    confirmLabel: "Delete OEM",
    preconditions: {
      noActiveParts: "No active parts linked to this OEM",
      activePartsDetail: (count: number) =>
        `${count} active part${count === 1 ? "" : "s"} still linked`,
    },
  },
  // CRUD success (useOEMs hook).
  toasts: {
    created: "OEM created",
    updated: "OEM updated",
    deleted: "OEM deleted",
  },
} as const
