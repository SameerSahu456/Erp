// User-facing copy for the IMS › checklists sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.

// Media item limits — mirrors the WMS run form's checklist upload field.
const MEDIA_LIMITS = "JPG, PNG, WEBP or PDF · Max 10 MB per file · Up to 5 files";

export const CHECKLISTS_STRINGS = {
  // ChecklistFormPage — full-page create / edit route.
  formPage: {
    backAriaLabel: "Back",
    editTitle: "Edit Checklist",
    addTitle: "Add Checklist",
    loadError: "Couldn’t load this checklist. The id may be invalid.",
  },

  // CreateChecklistDialog — both "dialog" and "page" variants.
  createDialog: {
    editHeading: "Edit checklist",
    newHeading: "New checklist",
    editSubhead:
      "Update the checklist name, items, or active state. Type and target are fixed once a template is created.",
    newSubhead:
      "Author the questions inspectors will answer when stock for this part moves.",
    nameLabel: "Name",
    namePlaceholder: "Inward QC — toner cartridges",
    typeLabel: "Type",
    typeImmutableHint:
      "Type is immutable. To change it, soft-delete this checklist and create a new one.",
    selectTypePlaceholder: "Select type…",
    cancel: "Cancel",
    saving: "Saving…",
    creating: "Creating…",
    saveChanges: "Save changes",
    createChecklist: "Create checklist",
    toast: {
      createFailed: "Failed to create checklist",
      updateFailed: "Failed to update checklist",
    },
  },

  // ChecklistPreviewDialog — read-only preview of a saved template.
  previewDialog: {
    fallbackTitle: "Checklist preview",
    // `{count} item` / `{count} items · what the inspector will see.`
    itemCountSuffix: (count: number) =>
      `${count} item${count === 1 ? "" : "s"} · what the inspector will see.`,
  },

  // ChecklistItemsEditor — the drag-reorder list of item cards.
  itemsEditor: {
    // Item count label: "1 item" / "5 items"
    itemCount: (count: number) => `${count} item${count === 1 ? "" : "s"}`,
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    addItem: "Add item",
    // Per-item drag handle / collapse toggle.
    dragToReorder: "Drag to reorder",
    expandItem: "Expand item",
    collapseItem: "Collapse item",
    expand: "Expand",
    collapse: "Collapse",
    // Reorder drag handle aria-label: "Reorder item 1"
    reorderItem: (n: number) => `Reorder item ${n}`,
    // Required toggle label: "Item 1 required"
    itemRequired: (n: number) => `Item ${n} required`,
    required: "Required",
    // Remove button title.
    removeItem: "Remove item",
    // Remove button aria-label: "Remove item 1"
    removeItemAriaLabel: (n: number) => `Remove item ${n}`,
    // Inline item input placeholder: "Item 1 — e.g. Seal intact"
    itemPlaceholder: (n: number) => `Item ${n} — e.g. Seal intact`,
    // Inspector hint field placeholder.
    inspectorHint: "Inspector hint (optional)",
    // Collapsed card error badge.
    hasErrors: "Has errors",
    // Guidance shown under a Media item's type picker.
    mediaLimits: MEDIA_LIMITS,
  },

  // NumericConfigAndPreview — integer-only toggle inside the item card.
  numericConfig: {
    integerOnlyLabel: "Integer only",
    integerOnlyAriaLabel: "Integer only",
    wholeNumbers: "Whole numbers",
    decimalsOk: "Decimals OK",
  },

  // ChoiceConfigAndPreview — options editor for select / multi_select items.
  choiceConfig: {
    optionsLabel: "Options",
    passFailAriaLabel: "Pass or Fail",
    fixedOptionsHintPrefix: "Fixed options. Switch the item type to",
    fixedOptionsHintSuffix: "to define your own list.",
    singleSelectKindLabel: "Single Select",
    // Per-option input placeholder: "Option 1"
    optionPlaceholder: (n: number) => `Option ${n}`,
    // Per-option remove button aria-label: "Remove option 1"
    removeOptionAriaLabel: (n: number) => `Remove option ${n}`,
    removeOptionTitle: "Remove option",
    addOption: "Add option",
    // Per-item fail routing controls.
    onFailRouteToLabel: "On fail, route to",
    routeTagLabels: { repair: "Repair", paint: "Paint" },
    defaultRouteHint: "Leave empty to default to Repair.",
  },

  // ChecklistPreviewList — read-only preview of checklist items.
  previewList: {
    empty: {
      title: "No items yet",
      description: "This checklist has no items.",
    },
    requiredAriaLabel: "required",
    // Boolean radio group option labels.
    yes: "Yes",
    no: "No",
    // Textarea placeholder (text items).
    textRequiredPlaceholder: "Inspector types here…",
    textOptionalPlaceholder: "Inspector types here (optional)…",
    // Number input placeholder (numeric items).
    numericRequiredPlaceholder: "Inspector enters number…",
    numericOptionalPlaceholder: "Inspector enters number (optional)…",
    // Select item — no options defined.
    noOptionsText: "No options were defined for this question.",
    // Pass / Fail preset button labels.
    pass: "Pass",
    fail: "Fail",
    passFailAriaLabel: "Pass or Fail",
    // Photo upload zone.
    photoUploadAriaLabel: "Media upload zone (preview only)",
    photoDropLabel: "Drop files here or click to upload",
    photoLimits: MEDIA_LIMITS,
  },

  // CRUD success (useChecklists hook).
  // ChecklistActiveSwitch — row-level Active toggle on the list pages.
  activeToggle: {
    ariaLabel: (name: string) => `${name} active`,
    inactive: "Inactive",
  },

  toasts: {
    created: "Checklist created",
    updated: "Checklist updated",
    deleted: "Checklist deleted",
    activated: "Checklist activated",
    deactivated: "Checklist deactivated",
  },
} as const
