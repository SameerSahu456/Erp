// User-facing copy for the IMS › categories sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components import this single
// source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const CATEGORIES_STRINGS = {
  // ─── CategoriesBody (list page) ───────────────────────────────────────────
  list: {
    title: "Categories",
    newCategory: "New Category",
    searchPlaceholder: "Search categories...",
    clearSearch: "Clear search",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    empty: {
      searchTitle: "No categories found",
      emptyTitle: "No categories yet",
      searchHelper: (search: string) =>
        `No categories match "${search}". Try a different term.`,
      emptyHelper: "Create a category to get started.",
    },
    delete: {
      title: "Delete this category?",
      description:
        "Soft-delete. The category hides from new pickers; existing audit references stay intact.",
      confirmLabel: "Delete category",
    },
    node: {
      editTitle: "Edit",
      deleteTitle: "Delete",
      inactive: "Inactive",
      subcategorySingular: "subcategory",
      subcategoryPlural: "subcategories",
      partSingular: "part",
      partPlural: "parts",
      expandLabel: "Expand",
      collapseLabel: "Collapse",
    },
    preconditions: {
      noSubCategories: "No active sub-categories",
      noActiveParts: "No active parts in this category",
      subCategoryDetail: (count: number) =>
        `${count} sub-categor${count === 1 ? "y" : "ies"} still active — delete or re-parent them first`,
      partsDetail: (count: number) =>
        `${count} active part${count === 1 ? "" : "s"} still linked — move or delete them first`,
    },
    subtitle: {
      searching: (total: number, search: string) =>
        `${total} result${total === 1 ? "" : "s"} for "${search}"`,
      tree: (rootCount: number, subCount: number, partCount: number) =>
        `${rootCount} categories · ${subCount} subcategories · ${partCount.toLocaleString("en-IN")} parts`,
    },
  },

  // ─── CategoryDetailBody (detail page) ────────────────────────────────────
  detail: {
    tabs: {
      subcategories: "Subcategories",
      parts: "Parts",
      specifications: "Specifications",
      approvers: "Approvers",
    },
    specificationsTab: {
      title: (n: number) => `Specifications (${n})`,
      helper:
        "Listed first, in this order, in the Specifications dropdown on this category’s parts and variants.",
      edit: "Edit attributes",
      link: "Link attributes",
      colOrder: "Order",
      colName: "Name",
      colValues: "Suggested values",
      colStatus: "Status",
      active: "Active",
      inactive: "Inactive",
      emptyTitle: "No specification attributes linked",
      emptyHelperWrite:
        "Link attributes so they’re listed first when adding specifications to this category’s parts and variants.",
      emptyHelperReadOnly:
        "Ask an admin to link specification attributes to this category.",
      searchPlaceholder: "Search specifications…",
      noMatchTitle: (q: string) => `No specifications match “${q}”`,
      noMatchHelper: "Try a different name, or clear the search.",
      errorTitle: "Couldn’t load specifications",
      errorHelper: "Something went wrong while loading. Please try again.",
    },
    kpi: {
      parts: "Parts",
      subcategories: "Subcategories",
      bomEligible: "BOM eligible",
      bomYes: "Yes",
      bomNo: "No",
    },
    subcategoriesCard: {
      title: (count: number) => `Subcategories (${count})`,
      newButton: "New",
      searchPlaceholder: "Search subcategories by name…",
      partSingular: "part",
      partPlural: "parts",
      inactive: "Inactive",
      noMatchTitle: (search: string) =>
        `No subcategories match “${search}”`,
      clearSearch: "Clear search",
      emptyText: "No subcategories.",
    },
    partsCard: {
      title: (count: number) => `Parts (${count})`,
      searchPlaceholder: "Search parts by name, part number or description…",
      brandFilter: "Brand/OEM",
      allBrands: "All brands",
      searchBrand: "Search brand…",
      noMatchTitle: (search: string) =>
        `No parts match “${search}”`,
      noMatchHelper: "Try a different search term or clear the field.",
      emptyTitle: "No parts in this category",
      emptyHelper: (categoryName: string) =>
        `Parts created under ${categoryName} will show up here.`,
      tableColSrNo: "Sr No",
      tableColPartName: "Part Name",
      tableColDescription: "Description",
      tableColCategory: "Category",
      tableColBrandOem: "Brand/OEM",
      tableColQuantity: "Quantity",
    },
    infoCard: {
      title: "Category Info",
      productManager: "Product Manager",
      hierarchy: "Hierarchy",
      hierarchySeparator: "›",
      description: "Description",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
    },
    actions: {
      edit: "Edit",
      delete: "Delete",
      deleteAriaLabel: (name: string) => `Delete ${name}`,
    },
    delete: {
      title: "Delete this category?",
      description:
        "Soft-delete. The category hides from new pickers; existing audit references stay intact.",
      confirmLabel: "Delete category",
      noSubCategories: "No active sub-categories",
      noActiveParts: "No active parts in this category",
      subCategoryDetail: (count: number) =>
        `${count} sub-categor${count === 1 ? "y" : "ies"} still active — delete or re-parent them first`,
      partsDetail: (count: number) =>
        `${count} active part${count === 1 ? "" : "s"} still linked — move or delete them first`,
    },
  },

  // ─── CategoryFormBody (create / edit form) ────────────────────────────────
  form: {
    backAriaLabel: "Back",
    titleEdit: "Edit Category",
    titleCreate: "Add Category",
    titleSuffixEdit: (name: string) => `of ${name}`,
    titleSuffixCreate: "under selected category",
    loadError: "Couldn’t load this category. The id may be invalid.",
    fields: {
      name: "Name",
      namePlaceholder: "Drum Units",
      parentCategory: "Parent category",
      parentPlaceholder: "None — top-level (L1)",
      parentHelperLocked:
        "Parent is locked to the category you’re creating this subcategory under.",
      parentHelperDefault: "Pick an L1 to make this an L2 sub-category.",
      description: "Description",
      descriptionPlaceholder: "Short blurb shown in tooltips and pickers…",
      activeLabel: "Active",
      activeHelper:
        "Inactive categories are hidden from pickers and the catalog tree.",
      activeAriaLabel: "Category is active",
      bomLabel: "BOM eligible",
      bomHelper:
        "Allow Reference BOMs on variants under this category. Leave off for catalog categories that don’t need assembly modeling.",
      bomAriaLabel: "Category is BOM eligible",
    },
    actions: {
      cancel: "Cancel",
      savingEdit: "Saving…",
      savingCreate: "Creating…",
      saveEdit: "Save changes",
      saveCreate: "Create category",
    },
    toast: {
      saveFailed: (message: string) => message,
      saveFailedDefault: "Failed to save category",
    },
  },

  // ─── CategoryOptionsCombobox ──────────────────────────────────────────────
  combobox: {
    clearAriaLabel: "Clear category",
    searchPlaceholder: "Search categories… (min 2 chars)",
    loading: "Loading…",
    loadError: "Failed to load categories",
    noMatches: "No matches",
    noCategories: "No categories",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
    triggerLoading: "Loading…",
  },
  // CRUD success (useCategories hook).
  toasts: {
    created: "Category created",
    updated: "Category updated",
    deleted: "Category deleted",
  },
} as const
