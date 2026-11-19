// User-facing copy for the IMS › hsn-codes sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks.
export const HSN_CODES_STRINGS = {
  form: {
    backAriaLabel: "Back",
    editTitle: (code: string) => `Edit HSN code ${code}`,
    createTitle: "Add HSN Code",
    codeLabel: "HSN Code",
    codePlaceholder: "851712",
    codeHelperText: "HSN Code should be of 4 to 6 digits.",
    gstLabel: "GST %",
    gstPlaceholder: "18",
    gstHelperText: "Common slabs: 0, 5, 12, 18, 28. Two-decimal precision allowed.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Mobile phones, smartphones, communication devices.",
    descriptionHelperText: "Optional context for operators picking this HSN code.",
    activeLabel: "Active",
    activeHelperText:
      "Inactive HSN codes stay on the parts and variants already tagged with them, but don’t appear in new selections.",
    activeAriaLabel: "HSN code is active",
    loadError:
      "Couldn’t load this HSN code. The id may be invalid or you may not have access.",
    cancel: "Cancel",
    saving: "Saving…",
    saveChanges: "Save changes",
    createSubmit: "Create HSN code",
    saveFallbackError: "Failed to save HSN code",
  },
  list: {
    title: "HSN Code",
    subtitle:
      "Harmonised System of Nomenclature codes with GST rates — the tax classification picked on parts and variants.",
    addHsnCode: "Add HSN Code",
    editTitle: "Edit HSN code",
    deleteTitle: "Delete HSN code",
    deleteDialogHeading: "Delete this HSN code?",
    deleteDescriptionSuffix:
      "will be deleted. Parts and variants already tagged with this HSN keep their reference, but the code won’t appear in new selections.",
    deleteCancel: "Cancel",
    deleting: "Deleting…",
    deleteConfirm: "Delete HSN code",
    columns: {
      hsnCode: "HSN Code",
      gst: "GST %",
      actions: "Actions",
    },
    editAriaLabel: (code: string) => `Edit HSN ${code}`,
    deleteAriaLabel: (code: string) => `Delete HSN ${code}`,
    empty: {
      title: "No HSN codes yet",
      descriptionWrite:
        "Add HSN codes so they can be selected on parts and variants.",
      descriptionReadOnly:
        "Ask an admin to add HSN codes so they can be selected on parts and variants.",
    },
    error: {
      title: "Couldn’t load HSN codes",
      description: "Something went wrong while loading. Please try again.",
    },
  },
  // CRUD success (useHSN hook).
  toasts: {
    created: "HSN code created",
    updated: "HSN code updated",
    deleted: "HSN code deleted",
  },
} as const
