// User-facing copy for the IMS › parts sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const PARTS_STRINGS = {
  // ── List page (PartsBody) ────────────────────────────────────────────────
  list: {
    title: "Parts",
    subtitle: "Master catalog of parts, their variants, and pricing.",
    addPart: "Add Part",
    columns: {
      partNo: "Part No",
      description: "Description",
      type: "Type",
      condition: "Condition",
      alias: "Alias",
      category: "Category",
      brand: "Brand/OEM",
      qty: "Qty",
      // Component-tracking D1 — units fitted inside parent devices. `Qty`
      // counts only `available`, so without this column a part whose whole
      // stock sits in machines reads 0 and looks absent.
      installedQty: "In Devices",
      price: "Price",
      priceHelp: "Default variant's price — variants may price differently",
      actions: "Actions",
    },
    filterPlaceholders: {
      allCategory: "All Category",
      allBrandOem: "All Brand/OEM",
      searchBrandOem: "Search Brand/OEM…",
    },
    empty: {
      title: "No parts yet",
      description: "Add a part to start building your catalog and pricing.",
      action: "Add Part",
    },
    error: {
      title: "Couldn’t load parts",
      description: "Something went wrong while loading. Please try again.",
    },
    tooltips: {
      editVariant: "Edit variant",
      deleteVariant: "Delete variant",
      editPart: "Edit part",
      deletePart: "Delete part",
    },
    summaryLabel: "Aliases",
    hoverTitle: "Aliases",
    tabLabel: (total: number) => `Parts (${total})`,
    rowType: { parent: "Parent", variant: "Variant" },
    // Parent rows have no condition / price of their own.
    dash: "-",
    editAriaLabel: (label: string) => `Edit ${label}`,
    deleteAriaLabel: (label: string) => `Delete ${label}`,
  },

  // ── Detail page (PartDetailBody) ─────────────────────────────────────────
  detail: {
    notFoundTitle: "Part not found",
    notFoundDescription:
      "This part may have been deleted or you do not have access.",
    backToPartsLabel: "Back to Parts",
    actions: {
      edit: "Edit",
      delete: "Delete",
    },
    quickStats: {
      totalUnits: "Total Units",
      available: "Available",
      reserved: "Reserved",
      dispatched: "Dispatched",
      inOperations: "In Operations",
      // Component-tracking D1 — units of this part fitted inside parent
      // devices. Without it, a part whose entire stock is inside machines
      // reads "0 in stock" and the reader concludes it is absent.
      installedInDevices: "Installed in Devices",
    },
    tabs: {
      overview: "Overview",
      inventory: "Inventory",
      variants: "Variants",
      checklist: "Checklist",
      compatible: "Compatible",
      movements: "Movements",
      linkedOrders: "Linked Orders",
      auditTrail: "Audit Trail",
    },
    variantsCard: {
      title: (count: number) => `Variants (${count})`,
      qtyHeader: "Qty",
      empty: "No variants yet.",
      moreInTab: (count: number) =>
        `+ ${count} more in the Variants tab`,
    },
    sidePanel: {
      partInfoTitle: "Part Info",
      partNo: "Part no",
      category: "Category",
      brandOem: "Brand/OEM",
      hsnCode: "HSN Code",
      productType: "Product Type",
      productTypeValue: "Parent",
      condition: "Condition",
      price: "Price",
      unitOfMeasure: "Unit of Measure",
      created: "Created",
    },
  },

  // ── Overview tab ─────────────────────────────────────────────────────────
  overview: {
    mediaTitle: "Media",
    descriptionHeading: "Description",
    specificationsHeading: "Specifications",
    additionalInfoHeading: "Additional Info",
    noSpecificationsRecorded: "No specifications recorded.",
    aliasLabel: "Alias",
    aliasesSummaryLabel: "Aliases",
    aliasesHoverTitle: "Aliases",
    hsnCodeLabel: "HSN Code",
    unitOfMeasureLabel: "Unit of Measure",
    brandOemLabel: "Brand/OEM",
    modelLabel: "Model",
  },

  // ── Inventory tab ────────────────────────────────────────────────────────
  inventory: {
    noStockYet: "No stock items recorded under this part yet.",
    unitsAcrossVariants: (total: number) =>
      `${total} ${total === 1 ? "unit" : "units"} across all variants`,
    // Short enough to fit the laptop-width search box; all three are searched.
    searchPlaceholder: "Search serial, SKU or location…",
    statusFilter: {
      label: "Status",
      all: "All statuses",
      searchPlaceholder: "Search status…",
    },
    conditionFilter: {
      label: "Condition",
      all: "All conditions",
      searchPlaceholder: "Search condition…",
      options: {
        new: "New",
        refurbished: "Refurbished",
        new_pull: "New Pull",
      },
    },
    noMatchTitle: (q: string) => `No stock items match “${q}”`,
    noFilterMatch: "No stock items match these filters.",
    noMatchHelper: "Try a different search term or clear the field.",
    tableAriaLabel: "Stock items",
    columns: {
      srNo: "Sr No",
      variant: "Variant",
      sku: "SKU",
      condition: "Condition",
      serialQty: "Serial",
      location: "Location",
      status: "Status",
      added: "Added",
    },
    bulkUnit: "Bulk unit",
  },

  // ── Variants tab ─────────────────────────────────────────────────────────
  variants: {
    addVariant: "Add Variant",
    searchPlaceholder: "Search variants by SKU, name or description…",
    noVariantsTitle: "No variants yet",
    noVariantsHelper:
      "Add a variant to track different conditions or configurations.",
    noMatchTitle: (q: string) => `No variants match “${q}”`,
    noMatchHelper: "Try a different search term or clear the field.",
    columns: {
      srNo: "Sr No",
      variant: "Variant",
      sku: "SKU",
      condition: "Condition",
      price: "Price",
    },
    tooltips: {
      editVariant: "Edit variant",
      deleteVariant: "Delete variant",
    },
    actionsAriaLabel: "Actions",
  },

  // ── Compatible tab ───────────────────────────────────────────────────────
  compatible: {
    heading: "Compatible Parts",
    subheading: "Compatible parts",
    subheadingHelper: "Search by part number, name, description or Brand/OEM and add directly.",
    searchPlaceholder: "Search by part number, name, description, or Brand/OEM...",
    noPartsYet: "No parts added yet. Use the search above to find and add parts.",
  },

  // ── Movements tab ────────────────────────────────────────────────────────
  movements: {
    noMovementsTitle: "No movements yet",
    noMovementsHelper:
      "Unit movements will appear here once inventory is received, inspected, or dispatched.",
  },

  // ── Linked Orders tab ────────────────────────────────────────────────────
  linkedOrders: {
    noLinkedOrdersTitle: "No linked sales orders",
    noLinkedOrdersHelper: "Sales orders that include this part will appear here.",
  },

  // ── Checklist tab ────────────────────────────────────────────────────────
  checklist: {
    addChecklist: "Add checklist",
    checklistsLoadError: "Couldn’t load checklists",
    checklistsLoadErrorHelper:
      "The list will retry on the next visit. If this keeps happening, ask an admin to check the legacy checklist data.",
    searchPlaceholder: "Search checklists by name or type…",
    noMatchTitle: (q: string) => `No checklists match “${q}”`,
    noMatchHelper: "Try a different search term or clear the field.",
    fallbackErrorMessage:
      "Failed to load checklists. Try again or refresh the page.",
    columns: {
      items: "Items",
      required: "Required",
    },
    tooltips: {
      viewChecklist: "View checklist",
      editChecklist: "Edit checklist",
    },
    empty: {
      title: "No checklists yet",
      description:
        "Author an inward QC, outward QC, or inspection template that inspectors will fill out when stock for this part moves.",
    },
    updatedPrefix: "Updated ",
  },

  // ── Delete dialogs ───────────────────────────────────────────────────────
  deleteVariant: {
    title: "Delete this variant?",
    description:
      "Soft-delete. The variant hides from new pickers; existing stock-movement records stay intact.",
    preconditionLabel: "No stock linked to this variant",
    stockLinkedDetail: (qty: number) =>
      `${qty} unit${qty === 1 ? "" : "s"} of stock still linked — clear or transfer them first`,
    confirmLabel: "Delete variant",
  },
  deletePart: {
    title: "Delete this part?",
    description:
      "Soft-delete. The part hides from new pickers; existing stock-movement records stay intact.",
    precondition1Label: "No additional variants (only the default may remain)",
    precondition1Detail: (count: number) =>
      `${count} variants — delete the non-default ones first`,
    precondition2Label: "No stock items on the default variant",
    precondition2Detail: (qty: number) =>
      `${qty} unit${qty === 1 ? "" : "s"} of stock still linked — clear or transfer them first`,
    confirmLabel: "Delete part",
  },

  // ── Form page (PartFormBody) ─────────────────────────────────────────────
  form: {
    backAriaLabel: "Back",
    editTitle: (name: string | undefined) =>
      name ? `Edit Part of ${name}` : "Edit Part",
    createTitle: "Add Part",
    sectionEditLabel: "Edit Part",
    sectionCreateLabel: "New Part",
    fields: {
      partNumber: "Part number",
      partNumberPlaceholder: "HP-CE285A",
      partName: "Part name",
      partNamePlaceholder: "HP LaserJet Toner 85A",
      aliases: "Aliases",
      aliasesPlaceholder: "Type alias and press Enter…",
      aliasesHelper: "Alternative names or SKUs used by suppliers.",
      aliasesError:
        "You can add up to 20 aliases, each a short text without emojis.",
      description: "Description",
      descriptionPlaceholder: "Optional description, specifications, or notes…",
      category: "Category",
      categoryPlaceholder: "Select category…",
      categoryImmutableHint: "Category is immutable after creation.",
      brandOem: "Brand/OEM",
      brandOemPlaceholder: "Select Brand/OEM…",
      brandOemSearchPlaceholder: "Search Brand/OEMs…",
      brandOemImmutableHint: "Brand/OEM is immutable after creation.",
      hsnCode: "HSN Code",
      specifications: "Specifications",
      specsTemplateHint: (categoryName: string) =>
        `Pick which “${categoryName}” specifications apply to this part. The values are entered on each variant. New specifications are added from the Specification Attributes page.`,
      specsHelper:
        "Pick which specifications apply to this part. The values are entered on each variant. New specifications are added from the Specification Attributes page.",
      active: "Active",
      activeHelper: "Inactive parts are hidden from pickers and the catalog.",
      activeAriaLabel: "Part is active",
      serialisedTracking: "Serialised tracking",
      serialisedTrackingHelper:
        "On = each unit gets a serial. Off = bucket count per location.",
      serialisedTrackingAriaLabel: "Part uses serialised tracking",
      media: "Media",
    },
    footer: {
      cancel: "Cancel",
      saving: "Saving…",
      saveChanges: "Save changes",
      createPart: "Create part",
    },
  },

  // ── Toasts (PartFormBody) ─────────────────────────────────────────────────
  // Partial-failure copy: the part itself saved, but staged attachments failed
  // to sync/upload. The backend error message is intentional detail, so the
  // *WithReason variants keep it interpolated; the plain variants cover
  // non-Error throwables where no message is available.
  toasts: {
    // CRUD success (useParts / usePrice hooks).
    created: "Part created",
    updated: "Part updated",
    deleted: "Part deleted",
    priceUpdated: "Price updated",
    attachmentsSyncFailed: (msg: string) =>
      `Saved part, but some attachments didn’t sync: ${msg}`,
    attachmentsSyncFailedGeneric: "Saved part, but some attachments didn’t sync.",
    attachmentsUploadFailed: (msg: string) =>
      `Created part, but some attachments didn’t upload: ${msg}`,
    attachmentsUploadFailedGeneric:
      "Created part, but some attachments didn’t upload.",
  },

  // ── Specifications editor (SpecificationsEditor) ──────────────────────────
  specs: {
    removeSpecAriaLabel: "Remove specification",
    addSpecification: "Add specification",
  },

  // ── HSN Async Select (HsnAsyncSelect) ─────────────────────────────────────
  hsn: {
    defaultLabel: "HSN Code",
    defaultPlaceholder: "Select HSN code…",
    searchPlaceholder: "Search HSN…",
    gstLabel: "GST",
    gstAriaLabel: "GST percentage for the selected HSN code",
    gstTitle: "GST rate of the selected HSN code",
  },
} as const
