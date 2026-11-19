// User-facing copy for the CRM › material-inquiries sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, table/tab
// labels, and the sub-feature's toast messages live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX/hooks.
// Components and hooks import this single source so copy stays consistent and
// is edited in one place. Dynamic copy is expressed as a function member.
//
// Domain status → label maps live in `constants/material-inquiry-status.ts`
// and `constants/mi-response-status.ts` (bucket 2), not here.
export const MATERIAL_INQUIRIES_STRINGS = {
  list: {
    pageTitle: "Material Inquiries",
    pageSubtitle:
      "Category-level inquiries sent to product managers for availability and pricing.",
    breadcrumbCrm: "CRM",
    breadcrumbSelf: "Material Inquiries",
    createAction: "Create Inquiry",
    tabLabel: "All Material Inquiries",
    columns: {
      enquiryNumber: "Inquiry No.",
      linkedTo: "Lead / Deal",
      categories: "Categories",
      items: "Items",
      status: "Status",
      requestedBy: "Requested By",
      created: "Created On",
      description: "Description",
      budget: "Budget",
    },
    linkedTo: {
      lead: "Lead",
      deal: "Deal",
    },
    pills: {
      categories: "Categories",
      categoriesHover: "MI Categories",
    },
    filters: {
      statusLabel: "Status",
      statusAll: "Statuses",
    },
    loading: "Loading material inquiries…",
    loadError: "Unable to load material inquiries.",
    empty: {
      title: "No material inquiries yet",
      description:
        "Create an inquiry to check product availability and pricing before quoting.",
      action: "Create Inquiry",
    },
  },
  // Embedded "Material Inquiries" panel on Lead / Deal detail pages.
  section: {
    create: "Create Material Inquiry",
    linkedNoun: {
      lead: "lead",
      deal: "deal",
    },
    loadErrorPrefix: "Failed to load material inquiries.",
    empty: (linkedTo: string) =>
      `No material inquiries linked to this ${linkedTo}`,
    emptyHelper:
      "Create an inquiry to check material availability and pricing.",
    loadingMore: "Loading more inquiries…",
    scrollForMore: (loaded: number, total: number) =>
      `Scroll for more · ${loaded} of ${total}`,
    createdAt: (date: string) => `Created ${date}`,
  },
  detail: {
    loading: "Loading material inquiry…",
    notFoundTitle: "Material Inquiry not found",
    notFoundDescription:
      "The inquiry you're looking for doesn't exist or has been removed.",
    back: "Back to Material Inquiries",
    noDescription: "No description",
    tabs: {
      request: "Request",
      responses: "Responses",
      comments: "Comments",
      messages: "Messages",
    },
    messagePlaceholder: "Type a message…",
    messageNounSingular: "message",
    messageNounPlural: "messages",
    actions: {
      edit: "Edit",
      submit: "Submit to Procurement",
      submitting: "Submitting…",
      close: "Close",
      closing: "Closing…",
      delete: "Delete",
      deleting: "Deleting…",
      deleteTitle: "Delete material inquiry?",
      deleteDescription: (enquiryNumber: string) =>
        `This will soft-delete ${enquiryNumber}.`,
    },
  },
  // "Request" tab on the MI detail page.
  requestTab: {
    linkedEntityTitle: "Linked Entity",
    requestDescriptionTitle: "Request Description",
    showMore: "Show more",
    showLess: "Show less",
    clientRequirementsTitle: "Client Requirements",
    overallBudget: "Overall Budget",
    timeline: "Timeline",
    inquiryItemsTitle: "Inquiry Items",
    columns: {
      item: "Item",
      category: "Category",
      qtyRequested: "Qty Requested",
      clientBudgetPerUnit: "Client Budget/Unit",
      sellingPrice: "Selling Price",
    },
    notesTitle: "Notes",
  },
  // Linked Lead / Deal rows (resolve UUID → human label on demand).
  linkedEntity: {
    leadLabel: "Lead:",
    dealLabel: "Deal:",
    loading: "Loading…",
    leadFallback: (idPrefix: string) => `Lead ${idPrefix}…`,
    dealFallback: (idPrefix: string) => `Deal ${idPrefix}…`,
  },
  // "Responses" tab on the MI detail page.
  responsesTab: {
    awaitingTitle: "Awaiting procurement response",
    awaitingCount: (count: number) =>
      `· ${count} item${count !== 1 ? "s" : ""}`,
  },
  // Per-item response card.
  itemResponseCard: {
    qtyPrefix: (qty: number) => `Qty ${qty}`,
    budgetPart: (perUnit: string) => ` · Budget ${perUnit}/unit`,
    timelinePart: (timeline: string) => ` · ${timeline}`,
    addResponse: "Add Response",
    loading: "Loading vendor responses…",
    loadError:
      "Couldn't load responses. You may not have procurement read access.",
    empty: "No procurement responses yet",
    counts: {
      approved: (n: number) => `${n} approved`,
      pending: (n: number) => `${n} pending`,
      rejected: (n: number) => `${n} rejected`,
    },
    columns: {
      vendor: "Vendor",
      qtyAvail: "Qty Avail",
      costPerUnit: "Cost / unit",
      sellPerUnit: "Sell / unit",
      available: "Available",
      status: "Status",
    },
  },
  // Single response row in the per-item table.
  responseRow: {
    allocatedSuffix: (qty: number) => `(${qty} alloc)`,
    deleteTitle: "Delete response",
  },
  // Add Procurement Response dialog.
  addResponse: {
    title: "Add Procurement Response",
    vendorLabel: "Vendor",
    vendorPlaceholder: "Search vendors…",
    vendorSearchPlaceholder: "Search by name, code, or contact…",
    qtyAvailableLabel: "Qty Available",
    qtyPlaceholder: "0",
    costLabel: "Cost / unit (₹)",
    costPlaceholder: "0",
    availableDateLabel: "Available Date",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Sourcing notes, lead times, etc.",
    cancel: "Cancel",
    save: "Add Response",
    saving: "Saving…",
    errors: {
      vendorRequired: "Vendor is required.",
      costMin: "Cost price must be ≥ 0.",
      qtyMin: "Qty must be ≥ 0.",
    },
  },
  // PM decision badge labels.
  pmDecision: {
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending PM",
  },
  // Response detail page.
  responseDetail: {
    loading: "Loading vendor response…",
    loadErrorTitle: "Couldn’t load this response",
    loadErrorDescription:
      "You may not have procurement read access. Ask procurement for the vendor quote details.",
    notFoundTitle: "Response not found",
    notFoundDescription:
      "This response may have been removed or the link is invalid.",
    back: "Back to Inquiry",
    title: (vendorName: string) => `Response from ${vendorName}`,
    subtitle: (vendorCode: string) => `Vendor ${vendorCode}`,
  },
  // Coverage card on the response detail page.
  coverage: {
    title: "Coverage Against Request",
    clientRequested: "Client Requested",
    thisResponseCovers: "This Response Covers",
    shortfall: "Shortfall",
    fullyCovered: "Fully covered",
    units: (n: number) => `${n} units`,
    clientBudgetPerUnit: "Client Budget / Unit",
    sellPricePerUnit: "Sell Price / Unit",
    costPricePerUnit: "Cost Price / Unit",
    budgetHeadroom: "Budget Headroom",
    overBudgetBy: "Over Budget By",
    quantityCoverage: "Quantity Coverage",
  },
  // Hero stats on the response detail page.
  heroStats: {
    qtyAvailable: "Qty Available",
    costPerUnit: "Cost / Unit",
    totalCost: "Total Cost",
    availableOn: "Available On",
    ofRequested: (qty: number) => `of ${qty} requested`,
    allocated: (qty: number) => `${qty} allocated`,
    units: (n: number) => `${n} units`,
  },
  // Vendor-offer / procurement-response / PM-decision cards.
  offerDecision: {
    vendorOfferTitle: "Vendor Offer",
    qtyAvailable: "Qty Available",
    qtyAllocated: "Qty Allocated",
    costPerUnit: "Cost / Unit",
    totalCost: "Total Cost",
    margin: "Margin",
    sellPerUnit: "Sell / Unit",
    units: (n: number) => `${n} units`,
    procurementResponseTitle: "Procurement Response",
    respondedBy: "Responded By",
    respondedOn: "Responded On",
    pmDecisionTitle: "PM Decision",
    approved: "Approved",
    rejected: "Rejected",
    pendingPm: "Pending PM",
    byPrefix: "by",
    descriptionLabel: "Description",
    noNote: "No note left by PM on this decision.",
    waiting: "Waiting for PM to approve or reject this option",
  },
  // Response detail sidebar.
  sidebar: {
    vendorTitle: "Vendor",
    inquiryItemTitle: "Inquiry Item",
    loadingItem: "Loading inquiry item…",
    itemUnavailable: "Inquiry item details are unavailable.",
    qtyRequested: "Qty Requested",
    clientBudgetPerUnit: "Client Budget / Unit",
    clientTimeline: "Client Timeline",
    units: (n: number) => `${n} units`,
    parentInquiryTitle: "Parent Inquiry",
    materialInquiryFallback: "Material Inquiry",
    assignedTo: "Assigned To",
    overallBudget: "Overall Budget",
    status: "Status",
    loadingDetails: "Loading inquiry details…",
    detailsUnavailable: "Inquiry details are unavailable.",
  },
  // Stat helpers — resolved labels for linked lead/deal and missing users.
  statBits: {
    loading: "Loading…",
    leadLabel: "Lead",
    dealLabel: "Deal",
    leadFallback: (idPrefix: string) => `Lead ${idPrefix}…`,
    dealFallback: (idPrefix: string) => `Deal ${idPrefix}…`,
  },
  // Create / edit form.
  form: {
    cardTitleEdit: "Edit Material Inquiry",
    cardTitleNew: "New Material Inquiry",
    notesLabel: "Notes",
    notesPlaceholder: "Add any notes for procurement team...",
    cancel: "Cancel",
    saveDraft: "Save as Draft",
    submitToProcurement: "Submit to Procurement",
    linkedToLabel: "Linked to",
    linkedToRadioGroupLabel: "Link this inquiry to a lead or a deal",
    lead: "Lead",
    deal: "Deal",
    leadFieldLabel: "Lead",
    leadPlaceholder: "Search and select a lead…",
    leadSearchPlaceholder: "Search leads…",
    dealFieldLabel: "Deal",
    dealPlaceholder: "Search and select a deal…",
    dealSearchPlaceholder: "Search deals…",
    clientBudgetLabel: "Client Budget (₹)",
    clientBudgetPlaceholder: "0.00",
    clientTimelineLabel: "Client Timeline",
    clientTimelinePlaceholder: "e.g., 4-6 weeks",
    assignedToLabel: "Assigned to Procurement",
    assignedToPlaceholder: "Select team member",
    assignedToSearchPlaceholder: "Search users…",
    pickLinked: (linkedType: string) => `Pick a ${linkedType}`,
    descriptionLabel: "Description",
    descriptionPlaceholder: "What does the customer need?",
    descriptionHelper: "Provide a description or add at least one line item below.",
    items: {
      heading: "Items",
      readOnlyHint: "Items are read-only past Draft status.",
      columnIndex: "#",
      columnItem: "Item",
      columnCategory: "Category",
      columnDescription: "Description",
      columnQty: "Qty",
      columnPrice: "Price (₹)",
      itemNamePlaceholder: "Item name",
      categoryPlaceholder: "Select a category",
      descriptionPlaceholder: "Description",
      addItem: "Add Item",
    },
    pageTitleNew: "Create Material Inquiry",
    pageTitleEdit: (enquiryNumber: string) => `Edit: ${enquiryNumber}`,
    pageSubtitleEdit:
      "Update header fields and line items. Items are editable while the inquiry is in Draft.",
    pageSubtitleNew: "Send a list of items to procurement for sourcing.",
    breadcrumbCrm: "CRM",
    breadcrumbSelf: "Material Inquiries",
    breadcrumbEdit: "Edit",
    breadcrumbNew: "New Inquiry",
    saveChanges: "Save Changes",
    createInquiry: "Create Inquiry",
    // Message-shell (loading / not-found) screens.
    loadingTitle: "Loading…",
    loadingCrumb: "Loading…",
    loadingMessage: "Loading material inquiry…",
    notFoundTitle: "Material inquiry not found",
    notFoundCrumb: "Not found",
    notFoundMessage: "Material inquiry could not be loaded.",
    checkingLinkedMessage: "Checking the linked record…",
    prefillNotFoundTitle: (entity: string) => `${entity} not found`,
    prefillNotFoundMessage: (entity: string) =>
      `The ${entity.toLowerCase()} this inquiry should link to doesn't exist or has been removed. Check the link and try again.`,
  },
  // Inline (non-Zod) form-validation messages produced by the form hook.
  validation: {
    descriptionOrItem: "Add a description or at least one line item.",
    clientBudgetNumber: "Client budget must be a number.",
    leadRequired: "Lead is required.",
    dealRequired: "Deal is required.",
    lineItemNameRequired: (line: number) => `Line ${line}: item name is required.`,
    lineItemCategoryRequired: (line: number) =>
      `Line ${line}: category is required.`,
    lineItemQtyMin: (line: number) => `Line ${line}: qty must be ≥ 1.`,
    lineItemBudgetNumber: (line: number) =>
      `Line ${line}: budget per unit must be a number.`,
    notLoaded: "Not loaded",
  },
  // AsyncSelect chip placeholder shown until the real label resolves.
  chipLoading: "Loading…",
  toast: {
    created: "Material inquiry created",
    updated: "Material inquiry updated",
    deleted: "Material inquiry deleted",
    closed: "Material inquiry closed",
    submitted: (enquiryNumber: string) => `Submitted as ${enquiryNumber}`,
    submittedToProcurement: "Submitted to procurement",
    submitFailed: "Unable to submit to procurement.",
    itemAdded: "Item added",
    itemUpdated: "Item updated",
    itemDeleted: "Item deleted",
    fixHighlightedFields: "Please fix the highlighted fields.",
    linkBeforeSubmit:
      "Link a Lead or Deal before submitting to procurement.",
  },
} as const
