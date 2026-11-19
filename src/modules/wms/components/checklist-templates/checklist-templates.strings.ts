// User-facing copy for the WMS › checklist-templates sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error text, and card labels live here as one
// typed `as const` object. Components import via a relative path.
export const CHECKLIST_TEMPLATES_STRINGS = {
  form: {
    editTitle: "Edit Checklist Template",
    loadingSubtitle: "Loading…",
    notFoundTitle: "Checklist Not Found",
    notFoundSubtitle: "It may have been deleted.",
    createTitle: "Create Checklist Template",
    createSubtitle:
      "Define a new checklist template for a category or a specific part.",
    breadcrumbs: {
      wms: "WMS",
      checklistTemplates: "Checklist Templates",
      edit: "Edit",
      new: "New",
    },
    cards: {
      templateDetails: "Template Details",
      checklistItems: "Checklist Items",
    },
    fields: {
      nameLabel: "Name",
      typeLabel: "Type",
      levelLabel: "Assign To Level",
      levelFallback: "Category",
      targetLabel: "Assign To",
      namePlaceholder: "e.g., Laptop Inward Checklist",
      categoryPlaceholder: "Select category…",
      partPlaceholder: "Select part…",
      partSearchPlaceholder: "Search parts…",
      typeSelectPlaceholder: "Select type…",
      itemsHeading: "Items",
    },
    buttons: {
      preview: "Preview",
      cancel: "Cancel",
      saving: "Saving…",
      creating: "Creating…",
      updateTemplate: "Update Template",
      createTemplate: "Create Template",
    },
    toast: {
      saveFailed: "Failed to save checklist",
    },
  },
  list: {
    title: "Checklist Templates",
    subtitle: "Configurable checklists used by Inspection, Repair, and QC workflows.",
    breadcrumbs: {
      wms: "WMS",
      checklistTemplates: "Checklist Templates",
    },
    createTemplate: "Create Template",
    allTab: "All",
    searchPlaceholder: "Search templates by name…",
    columns: {
      name: "Name",
      type: "Type",
      assignedTo: "Assigned To",
      items: "Items",
      active: "Active",
      actions: "Actions",
    },
    cell: {
      categoryPrefix: "Category:",
      partPrefix: "Part:",
      editTitle: "Edit",
      editAriaLabel: (name: string) => `Edit ${name}`,
      nameFallback: "checklist",
      // Active column badge for read-only viewers (authors get the switch).
      active: "Active",
      inactive: "Inactive",
    },
    empty: {
      loadError: "Couldn't Load Checklist Templates",
      noTemplates: "No Checklist Templates Yet",
      loadErrorDescription: "Refresh to try again.",
      noTemplatesDescription:
        "Templates let you customize the fields engineers fill in during inspection or QC.",
      createTemplate: "Create Template",
    },
  },
  preview: {
    title: "Checklist Preview",
    loadingSubtitle: "Loading…",
    notFoundTitle: "Checklist Not Found",
    notFoundSubtitle: "It may have been deleted.",
    backToList: "Back to checklists",
    // A genuine fetch failure is distinct from a missing record (§12): Retry, not
    // the "may have been deleted" copy.
    loadErrorTitle: "Could not load this checklist",
    loadErrorSubtitle: "Something went wrong. Try again.",
    retry: "Try again",
    breadcrumbs: {
      wms: "WMS",
      checklistTemplates: "Checklist Templates",
      preview: "Preview",
    },
    itemsSuffix: (count: number) =>
      `${count} item${count !== 1 ? "s" : ""}`,
    requiredCount: (count: number) => `${count} required`,
    editButton: "Edit",
    cards: {
      templateDetails: "Template Details",
      checklistItems: "Checklist Items",
      checklistItemsHint: "What the inspector sees at this stage.",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
    },
    fields: {
      type: "Type",
      category: "Category",
      part: "Part",
      items: "Items",
    },
  },
} as const
