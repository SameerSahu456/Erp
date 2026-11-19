// User-facing copy for the IMS › variants sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const VARIANTS_STRINGS = {
  priceHistory: {
    tabLabel: "Price History",
    empty: {
      title: "No price changes yet",
      description:
        "Every price update is recorded here with who made it and when. This variant has not been repriced.",
    },
    columns: {
      srNo: "Sr No",
      when: "When",
      from: "From",
      to: "To",
      change: "Change",
      by: "Changed by",
      notes: "Notes",
    },
    firstPrice: "First price",
    emptyCell: "—",
  },
  // VariantDetailBody — overview tab
  overview: {
    mediaTitle: "Media",
    descriptionHeading: "Description",
    specificationsHeading: "Specifications",
    noSpecsRecorded: "No specifications recorded.",
    additionalInfoHeading: "Additional Info",
    aliasLabel: "Alias",
    aliasesSummaryLabel: "Aliases",
    aliasesHoverTitle: "Aliases",
    skuCodeLabel: "SKU code",
    conditionLabel: "Condition",
    statusLabel: "Status",
    active: "Active",
    inactive: "Inactive",
    hsnCodeLabel: "HSN Code",
    priceLabel: "Price",
  },

  // VariantDetailBody — inventory tab
  inventory: {
    noStockItems: "No stock items recorded for this variant.",
    searchPlaceholder: "Search stock by serial, rack, bin, or status…",
    statusFilter: {
      label: "Status",
      all: "All statuses",
      searchPlaceholder: "Search status…",
    },
    noMatchTitle: (search: string) => `No stock items match “${search}”`,
    noFilterMatch: "No stock items match these filters.",
    noMatchHint: "Try a different search term or clear the field.",
    tableAriaLabel: "Stock items",
    colSrNo: "Sr No",
    colSku: "SKU",
    colCondition: "Condition",
    colSerialQty: "Serial",
    colLocation: "Location",
    colStatus: "Status",
    colAdded: "Added",
    bulkUnit: "Bulk unit",
  },

  // VariantDetailBody — variant not found
  notFound: {
    title: "Variant not found",
    description:
      "This variant may have been deleted or you do not have access.",
    backLabel: "Back to Part",
  },

  // VariantDetailBody — quick-stat labels
  quickStats: {
    totalUnits: "Total Units",
    available: "Available",
    reserved: "Reserved",
    dispatched: "Dispatched",
    inOperations: "In Operations",
    // Component-tracking D1: units of THIS variant currently sitting inside a
    // parent device. The other half of "how many of these do we hold?" — a
    // 32GB stick fitted in a laptop is stock we own, just not stock we can
    // sell without pulling it first.
    installed: "Installed in Devices",
  },

  // VariantDetailBody — right-rail cards
  parentProduct: {
    cardTitle: "Parent Product",
    notAvailable: "Parent part not available.",
  },
  variantInfo: {
    cardTitle: "Variant Info",
    skuCode: "SKU code",
    parentPart: "Parent part",
    category: "Category",
    brandOem: "Brand/OEM",
    hsnCode: "HSN Code",
    productType: "Product Type",
    productTypeValue: "Variant",
    condition: "Condition",
    defaultLabel: "Default",
    defaultVariantBadge: "Default variant",
    price: "Price",
    currency: "Currency",
    created: "Created",
  },

  // VariantDetailBody — header action buttons
  headerActions: {
    edit: "Edit",
    delete: "Delete",
    deleting: "Deleting…",
  },

  // VariantDetailBody — delete dialog
  deleteDialog: {
    title: "Delete this variant?",
    description:
      "Soft-delete. The variant hides from new pickers; existing stock-movement records stay intact.",
    confirmLabel: "Delete variant",
    noStockLabel: "No stock linked to this variant",
    stockStillLinked: (qty: number) =>
      `${qty} unit${qty === 1 ? "" : "s"} of stock still linked — clear or transfer them first`,
  },

  // VariantFormBody — page title
  pageTitle: {
    editWithPart: (partName: string) => `Edit Variant of ${partName}`,
    editFallback: "Edit Variant",
    addVariant: "Add Variant",
  },

  // VariantFormBody — form section header
  formSection: {
    editHeading: "Edit Variant",
    newHeading: "New Variant",
  },

  // VariantFormBody — fields
  fields: {
    partName: "Part Name",
    partNameLoading: "Loading…",
    variantName: "Variant name",
    variantNamePlaceholder: (partName: string) => `${partName} — New / Local`,
    variantNameFallbackPart: "Part",
    skuCode: "SKU code",
    skuCodePlaceholder: "e.g. P74651-D65",
    skuImmutable: "SKU is immutable post-creation.",
    skuManufacturer: "Manufacturer SKU.",
    condition: "Condition",
    conditionPlaceholder: "Select condition…",
    conditionNew: "New",
    conditionRefurbished: "Refurbished",
    conditionNewPull: "New Pull",
    conditionPickError: "Pick a condition",
    conditionImmutable: "Condition is immutable after creation.",
    sellPrice: "Sell price *",
    sellPriceMinHint: (min: number) => `(min ${min})`,
    sellPricePlaceholder: "0.00",
    description: "Description",
    descriptionPlaceholder: "Optional notes about this variant…",
    aliases: "Aliases",
    aliasesPlaceholder: "Press Enter to add an alias…",
    aliasesError: "Check the alias entries.",
    hsnCode: "HSN Code",
    specifications: "Specifications",
    specsCategoryHint: (categoryName: string) =>
      `“${categoryName}” specifications are listed first in the dropdown. New specifications are added from the Specification Attributes page.`,
    specsHelper:
      "Pick a specification and enter its value. New specifications are added from the Specification Attributes page.",
    specsPartHint:
      "Enter the values for the specifications chosen on the part. Which specifications apply is set on the part.",
    specsNoPartAttrs:
      "No specifications are set on this part yet. Add them on the part to enter values here.",
    active: "Active",
    activeHint: "Inactive variants are hidden from pickers and the catalog.",
    activeAriaLabel: "Variant is active",
    media: "Media",
  },

  // VariantFormBody — footer actions
  footer: {
    backAriaLabel: "Back",
    cancel: "Cancel",
    saving: "Saving…",
    creating: "Creating…",
    saveChanges: "Save changes",
    createVariant: "Create variant",
  },

  // VariantFormBody — toast messages
  toast: {
    // CRUD success (useVariants hook).
    created: "Variant created",
    updated: "Variant updated",
    deleted: "Variant deleted",
    attachmentSyncFailed: "Saved variant, but some attachments didn't sync.",
    attachmentSyncFailedWithReason: (reason: string) =>
      `Saved variant, but some attachments didn't sync: ${reason}`,
    attachmentUploadFailed:
      "Created variant, but some attachments didn't upload.",
    attachmentUploadFailedWithReason: (reason: string) =>
      `Created variant, but some attachments didn't upload: ${reason}`,
    saveFailed: "Failed to save variant",
  },

  // BomTab — eligibility / loading
  bom: {
    loadingCategory: "Loading category settings…",
    bomsNotEnabled: (categoryName: string) =>
      `BOMs not enabled for ${categoryName}`,
    bomsNotEnabledDetail: (categoryName: string) =>
      `Each category opts into Reference BOMs explicitly — parents and sub-categories don't inherit. Open ${categoryName} and turn on "BOM eligible" to start declaring an assembly for variants under it.`,
    openCategory: (categoryName: string) => `Open ${categoryName}`,
    recheckAriaLabel: "Re-check eligibility",
    checking: "Checking…",
    recheck: "Re-check",
    searchPlaceholder: "Search by part number, name, description, or brand…",
    emptyTitle: "No BOM defined",
    addFirstComponent: "Use the search above to add the first component.",
    noBomDefined: "An assembly BOM hasn't been defined for this variant.",
    saving: "Saving…",
  },

  // BomTab — remove row confirmation dialog
  removeDialog: {
    title: "Remove this component?",
    descriptionSuffix: " will be removed from the BOM and saved immediately.",
    fallbackRowLabel: "This row",
    cancel: "Cancel",
    remove: "Remove",
  },

  // BomTab — BomHeaderNotes
  bomNotes: {
    label: "BOM notes",
    optionalSpan: "(optional)",
    placeholder: "Context that applies to the whole BOM",
    ariaLabel: "BOM notes",
  },

  // BomTab — BomLine
  bomLine: {
    componentRemovedFallback: "(component removed)",
    quantityAriaLabel: "Quantity",
    removeComponentAriaLabel: "Remove component",
  },

  // BomTab — toast messages
  bomToast: {
    selfReference: "A variant can't reference itself in its BOM.",
    alreadyInBom: (label: string) => `${label} is already in the BOM.`,
    missingComponent: (row: number) => `Row ${row}: missing component.`,
    selfReferenceRow: (row: number) =>
      `Row ${row}: a variant can't reference itself.`,
    qtyOutOfRange: (row: number) =>
      `Row ${row}: quantity must be between 1 and 10,000.`,
    duplicateComponent: (row: number, label: string) =>
      `Row ${row}: ${label} is already in the BOM.`,
    // useVariants hook — save/delete BOM error fallbacks.
    saveFailed: "Failed to save BOM",
    deleteFailed: "Failed to delete BOM",
  },
} as const;
