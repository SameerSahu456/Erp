// User-facing copy for the CRM › quotes sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
//
// Note: the PDF/print HTML strings in useQuoteBuilder.ts (clipboard export
// table) are intentionally NOT here — they render outside React (inline-styled
// HTML pasted into Gmail/Docs) and are not "component copy". Domain enum label
// maps (status / quotable type / rental period) live in
// `../../constants/quote-status.ts` (bucket 2).
export const QUOTES_STRINGS = {
  // Prefix rendered before a quote's version number, e.g. `v3`.
  versionPrefix: "v",
  list: {
    approvedByPill: {
      summaryLabel: "Approvers",
      hoverTitle: "Approved By",
    },
    tabLabel: "All Quotes",
    pageTitle: "Quotes",
    pageSubtitle:
      "Manage quotations, track versions, and convert accepted quotes into sales orders.",
    columns: {
      quoteNumber: "Quote #",
      account: "Account",
      createdBy: "Submitted By",
      approvedBy: "Approved By",
      approvedByEmpty: "—",
      for: "For",
      vertical: "Vertical",
      items: "Items",
      total: "Total",
      status: "Status",
      version: "Ver.",
      validUntil: "Valid Until",
      created: "Created On",
    },
    filters: {
      statusLabel: "Status",
      statusAll: "Statuses",
      verticalLabel: "Vertical",
      verticalAll: "Verticals",
      channelTypeLabel: "Channel Type",
      mentionLabel: "Mentions",
      mentionAll: "All quotes",
      mentionOnly: "Only via mention",
      mentionExclude: "Not mentioned",
    },
    loading: "Loading quotes…",
    loadError: "Failed to load quotes. Try again.",
    emptyFiltered: {
      title: "No quotes match your filters",
      description: "Try adjusting or clearing the filters.",
    },
    empty: {
      title: "No quotes yet",
      description: "Draft a quote to get started.",
      action: "Create Quote",
    },
  },
  rowActions: {
    view: "View Quote",
    copyLink: "Copy link",
    downloadPdf: "Download PDF",
    downloadingPdf: "Loading PDF…",
    convertToSO: "Convert to Sales Order",
    amend: "Amend",
    amendNewVersionSuffix: " (new version)",
    linkCopied: (quoteNumber: string) => `Link to ${quoteNumber} copied`,
    copyLinkFailed: "Unable to copy link. Check browser clipboard permissions.",
    pdfUnavailable: "PDF unavailable for this quote.",
    // Shown when the user clicks Download from the row action while the async
    // worker is still rendering (post-save polling in progress).
    pdfGeneratingHint: "PDF is being generated. Try again in a few seconds.",
    pdfDownloadFailedStatus: (status: number) =>
      `Unable to download PDF (${status}).`,
    pdfDownloadFailed: "Unable to download PDF. Try again.",
  },
  statusActions: {
    cancelAmend: "Cancel Amend",
    cancelAmendAria: "Cancel Amend",
    convertToSO: "Convert to SO",
    convertToSOAria: "Convert to Sales Order",
    amend: "Amend",
    amendAria: "Amend (creates a new version)",
    sendNeedsItem: "Add at least one line item before sending.",
  },
  formActions: {
    edit: "Edit",
  },
  // Embedded section on Lead / Deal / Account detail pages.
  section: {
    createQuote: "Create Quote",
    cancel: "Cancel",
    amending: (entity: string) => `Amending a quote on this ${entity}`,
    linkedCount: (count: number, entity: string) =>
      `${count} quote${count === 1 ? "" : "s"} linked to this ${entity}`,
    loadError: (detail: string) => `Failed to load quotes. ${detail}`,
    emptyTitle: (entity: string) => `No quotes linked to this ${entity}`,
    emptyHint: "Create a quote to start building a proposal.",
    noMatches: "No quotes match your search or filters",
    filters: {
      searchPlaceholder: "Search by quote number",
      createdOn: "Created On",
      createdBy: "Submitted By",
      approvedBy: "Approved By",
      status: "Status",
      total: "Total",
    },
    categoriesPill: {
      summaryLabel: "Categories",
      hoverTitle: "Quote Categories",
    },
    approvedByPill: {
      summaryLabel: "Approvers",
      hoverTitle: "Approved By",
    },
    columns: {
      quoteNumber: "Quote No",
      createdBy: "Submitted By",
      total: "Total",
      approvedBy: "Approved By",
      categories: "Categories",
      status: "Status",
      createdOn: "Created On",
    },
    loadingMore: "Loading more quotes…",
    scrollForMore: (loaded: number, total: number) =>
      `Scroll for more · ${loaded} of ${total}`,
  },
  // Per-line approval columns on the quote view (same copy as the Sales Order view).
  approval: {
    columns: { approver: "Approver", status: "Status" },
    rejectionReason: "Rejection reason",
    approvalReason: "Approval reason",
    missing: "Missing",
  },
  builder: {
    pageTitle: "Quote Builder",
    pageSubtitle:
      "Add items by part number or enter descriptions — mix and match per line",
    back: "Back",
    allQuotes: "All Quotes",
    downloadQuote: "Download Quote",
    copyQuote: "Copy Quote",
    pdfNotGeneratedExisting:
      "PDF not generated yet — save the quote to (re)generate.",
    pdfNotGeneratedNew: "Save the quote first to generate a PDF.",
    // Async PDF flow (backend renders in a Celery worker after save; see
    // docs/quote-pdf-async-integration.md). Polling starts on save and settles
    // when `pdf_url` changes from what the FE was showing pre-mutation.
    generatingPdf: "Generating PDF…",
    pdfStillGenerating: "PDF is still being generated. Refresh in a moment.",
    refreshPdf: "Refresh",
    readOnlyView: (quoteNumber: string) => `Read-only view of ${quoteNumber}`,
    readOnlyDraftSuffix: " — click Edit to make changes.",
    readOnlyLockedSuffix: (status: string) =>
      ` — this quote is ${status} and cannot be edited directly.`,
    amendBannerLead: (nextVersion: number, quoteNumber: string) =>
      `Amend mode — your edits will be saved as a new version (v${nextVersion}) of ${quoteNumber}. The current rejected quote stays untouched until you click Save.`,
    fields: {
      quoteNumber: "Quote Number",
      status: "Status",
      account: "Account",
      validUntil: "Valid Until",
      // Sales vs Rental. A quote has no `sellable_type` column — the
      // choice is written down onto every line's `is_rental`.
      orderType: "Order Type",
      orderTypeSales: "Sales",
      orderTypeRental: "Rental",
      rentalWindow: "Rental Period",
      rentalWindowHelp:
        "The window every rental line inherits. A line may be out for less — never longer.",
      // The Rate column on a rental quote is a per-period figure, and the
      // header is the only place that is visible while typing.
      rateMonthly: "Monthly rent",
      rateDaily: "Daily rate",
      linkedTo: "Linked to",
      termsConditions: "Terms & Conditions",
      businessVertical: "Vertical",
      notes: "Notes",
    },
    placeholders: {
      account: "Search and select account…",
      lead: "Search and select lead…",
      deal: "Search and select deal…",
      orderType: "Select order type",
      rentalWindow: "Select from and to dates",
      leadSearch: "Search leads…",
      dealSearch: "Search deals…",
      terms: "Enter terms and conditions...",
      vertical: "Select vertical",
      notes: "Add any notes...",
    },
    // Business Vertical → Terms & Conditions clause builder copy.
    clauses: {
      hydrateFailed: "Couldn't load the default terms for this vertical.",
      resetDone: (brand: string) => `Reset to ${brand} default terms`,
      // Section-level collapse toggle. Shared by the builder's <Button> and the
      // detail page's <div role="button"> (see QuoteClauseSection) so the two
      // renderings can never drift to different wording.
      collapseAll: "Collapse",
      expandAll: "Expand",
    },
    cancel: "Cancel",
    saving: "Saving…",
    saveAsDraft: "Save as Draft",
    submitting: "Submitting…",
    submit: "Submit",
    addComponentTitle: "Add Component",
    selectPartTitle: "Select Part",
    // Provisional quote-number field copy on the create form.
    quoteNumberLoading: "Loading…",
    quoteNumberAuto: "Auto-generated on save",
    loadingPlaceholder: "Loading…",
  },
  // Tabular Line Items grid (QuoteLineItemsGrid). Owns the grid-specific copy;
  // reuses `L.heading` / `L.addLineItem` for the shared pieces.
  grid: {
    columns: {
      partNumber: "Part Number",
      partName: "Part Name",
      category: "Category",
      oem: "OEM",
      condition: "Condition",
      description: "Description",
      qty: "Qty",
      listPrice: "List Price",
      price: "Price",
      discount: "Disc",
      amount: "Amount",
    },
    placeholders: {
      partNumber: "Search part number or description",
      partName: "Part name…",
      categorySelect: "Select…",
      oemSelect: "Select…",
      conditionDash: "—",
      description: "Description",
    },
    parentCount: (count: number) => `${count} parent line${count === 1 ? "" : "s"}`,
    componentCount: (count: number) => `${count} component${count === 1 ? "" : "s"}`,
    parentTitle: "Parent line item",
    addComponent: "Add component",
    removeComponent: "Remove component",
    removeLine: "Remove line",
    subtotal: "Subtotal",
    componentPricingNote:
      "",
  },
  // Paste-line-items-from-Excel dialog (opens from the Line Items toolbar).
  lineItems: {
    heading: "Line Items",
    removeLineAria: "Remove line",
    fields: {
      partNumber: "Part Number",
      name: "Name",
      description: "Description",
      category: "Category",
      qty: "Qty",
      rate: "Rate",
      discount: "Disc",
      tax: "Tax %",
      period: "Period",
      startDate: "Start date",
      endDate: "End date",
      configurationNotes: "Configuration Notes",
      warrantyLevel: "Warranty",
    },
    placeholders: {
      itemName: "Enter item name",
      categoryFromPart: "Set from selected part number",
      categorySelect: "Select a category",
      configurationNotes:
        "e.g., Customer requested 256GB RAM total, add GPU for ML workload",
      warrantyLevel: "e.g., 3 Year Onsite Warranty",
    },
    discountAria: "Line discount in rupees",
    taxAria: "Tax percent (0 to 100)",
    categoryFromPartHint:
      "Category is determined by the selected part number. Clear the part to set a category manually.",
    grossSuffix: "gross",
    addLineItem: "Add Line Item",
    approval: {
      columns: {
        approver: "Approver",
        status: "Status",
      },
      approverNameLabel: "Approver:",
      rejectionReasonLabel: "Rejection reason",
      approvalNoteLabel: "Approver note",
    },
    bom: {
      hide: "Hide BOM",
      view: "View BOM",
      componentCount: (count: number) =>
        `${count} component${count === 1 ? "" : "s"}`,
      columns: {
        component: "Component",
        partNo: "Part no",
        position: "Position",
        qty: "Qty",
        status: "Status",
      },
      replaces: (partName: string) => `Replaces: ${partName}`,
      optional: "Optional",
      removed: "Removed",
      swapped: "Swapped",
      included: "Included",
      reset: "Reset",
      swap: "Swap",
    },
    rentalSummary: (
      durationUnits: number,
      period: string,
      qty: number,
      rate: string,
    ) =>
      `${durationUnits} ${period}${durationUnits !== 1 ? "s" : ""} × ${qty} unit${qty !== 1 ? "s" : ""} × ₹${rate}`,
  },
  partPicker: {
    description:
      "Search by part name, Part no, condition, or brand. Each variant is individually priced.",
    searchPlaceholder: "Search parts, variants, Part no, brand, condition...",
    allCategories: "All Categories",
    empty: "No variants found. Try a different search or category.",
    inStock: (qty: number) => `${qty} in stock`,
    selectionSummary: (price: string, qty: number, category: string) =>
      `₹${price} · ${qty} in stock · ${category}`,
    clear: "Clear",
    selectVariant: "Select variant",
    resultCount: (
      shown: number,
      totalVariants: number,
      partCount: number,
      search: string,
    ) =>
      `${shown} of ${totalVariants} variants across ${partCount} parts${search ? ` matching "${search}"` : ""}`,
  },
  swapDialog: {
    title: "Swap Component",
    // The replaced part name is wrapped in <strong>, so the copy is split
    // into the text before / after the highlighted name.
    replaceBefore: "Replace ",
    replaceAfter: " with an alternative",
    currently: "Currently:",
    searchPlaceholder: "Search components...",
    empty: "No compatible components found.",
    recommended: "Recommended",
    recommendedSubstitutes: "Recommended Substitutes",
    otherComponents: "Other Components",
    available: (qty: number) => `${qty} avail`,
    noStockVariants: "No stock variants. Price will be set manually.",
    back: "Back",
    swapTo: (partName: string) => `Swap to ${partName}`,
    pickVariant: "Pick a variant",
    confirmSwap: "Confirm Swap",
  },
  form: {
    loadingTitle: "Loading…",
    fetchingQuote: "Fetching quote…",
    notFoundTitle: "Quote not found",
    notFoundCrumb: "Not found",
    notFoundMessage: "Failed to load this quote. It may have been deleted.",
    newQuoteCrumb: "New Quote",
    checkingLinkedRecord: "Checking the linked record…",
    prefillNotFoundTitle: (entity: string) => `${entity} not found`,
    prefillNotFoundMessage: (entity: string) =>
      `The ${entity.toLowerCase()} this quote should link to doesn't exist or has been removed. Check the link and try again.`,
    createTitle: "Create Quote",
    createSubtitle:
      "Build a new quote — pick parts or add freeform line items.",
    editSubtitle: (quotableType: string, itemCount: number) =>
      `${quotableType} · ${itemCount} item${itemCount === 1 ? "" : "s"}`,
    breadcrumbCrm: "CRM",
    breadcrumbQuotes: "Quotes",
    viewOnlyTitle: "View only",
    viewOnlyMentioned:
      "You were mentioned on this quote's lead or deal, so you can view it. Editing isn't available.",
  },
  validation: {
    fixHighlighted: "Please fix the highlighted fields.",
    pickEntity: (entity: string) => `Pick a ${entity} before saving.`,
    pickLead: "Pick a lead before saving.",
    pickDeal: "Pick a deal before saving.",
    pickAccount: "Pick an account before saving.",
    selectVertical: "Select a vertical before saving.",
    selectOrderType: "Select an order type before saving.",
    rentalWindowRequired: "Pick the rental period before saving.",
    pickCategory: "Pick a category.",
    addLineItem: "Add at least one line item.",
    nameTooLong: "Name must be ≤ 255 chars.",
    nameRequired: "Enter a part name.",
    // Description is required on every quote line — unlike SO, picking a
    // Part Number does NOT satisfy it. See QuoteLineItemsGrid
    // `descriptionStrict` + REQUIRED_COLUMNS.
    descriptionRequired: "Enter a description.",
    qtyMin: "Qty must be at least 1.",
    rateMin: "Rate must be ≥ 0.",
    // A priced line must carry a rate > 0 — a 0 rate is an unpriced line and
    // is rejected on save (parent line + every BOM component).
    rateRequired: "Rate must be greater than 0.",
    componentRateRequired: "Every component must have a rate greater than 0.",
    // Every line + component must be identifiable — a part number OR a
    // description — else it saves as a placeholder "-" row. Blocked on save.
    identityRequired: "Add a part number or description.",
    componentIdentityRequired:
      "Every component needs a part number or description.",
    // Category is mandatory on every BOM component, same as the parent line.
    componentCategoryRequired: "Every component must have a category.",
    // Part Name is mandatory on every BOM component.
    componentNameRequired: "Every component must have a part name.",
    rentalPeriodRequired: "Rental period is required.",
    rentalStartRequired: "Rental start date is required.",
    rentalEndRequired: "Rental end date is required.",
    rentalEndOrder: "Rental end date must be on or after start date.",
    // T&C clause fields — both required on every editable clause.
    clauseTitleRequired: "Title is required.",
    clauseBodyRequired: "Clause text is required.",
    // Save-path payload errors (toast). Keyed with line numbers.
    lineNameTooLong: (line: number) =>
      `Line ${line}: name must be ≤ 255 chars.`,
    linePickCategory: (line: number) =>
      `Line ${line}: pick a category (or a part).`,
    lineQtyMin: (line: number) => `Line ${line}: qty must be at least 1.`,
    lineRateMin: (line: number) => `Line ${line}: rate must be ≥ 0.`,
    lineIdentityRequired: (line: number) =>
      `Line ${line}: add a part number or description.`,
    lineDescriptionRequired: (line: number) =>
      `Line ${line}: enter a description.`,
    lineComponentIdentity: (line: number) =>
      `Line ${line}: every component needs a part number or description.`,
    lineComponentRate: (line: number) =>
      `Line ${line}: every component must have a rate greater than 0.`,
    lineComponentCategory: (line: number) =>
      `Line ${line}: every component must have a category.`,
    lineRentalPeriod: (line: number) =>
      `Line ${line}: rental period is required.`,
    lineRentalStart: (line: number) =>
      `Line ${line}: rental start date is required.`,
    lineRentalEnd: (line: number) =>
      `Line ${line}: rental end date is required.`,
    lineRentalEndOrder: (line: number) =>
      `Line ${line}: rental end date must be on or after start date.`,
  },
  toast: {
    created: "Quote created",
    createFailed: "Failed to create quote",
    updated: "Quote updated",
    updateFailed: "Failed to update quote",
    versionCreated: (version: number) => `Version ${version} created`,
    versionFailed: "Failed to create new version",
    statusChanged: (status: string) => `Quote status changed to ${status}`,
    statusChangeFailed: "Failed to change status",
    itemRemoved: "Item removed",
    itemRemoveFailed: "Failed to remove item",
    calcFailedPlain: "Calculation failed",
    calcFailed: (detail: string) => `Calculation failed — ${detail}`,
    noChanges: "No changes to save",
    savedAsVersion: (version: number) => `Saved as version ${version}`,
    pdfDownloadFailedStatus: (status: number) =>
      `Unable to download PDF (${status}).`,
    pdfDownloadFailed: "Unable to download PDF. Try again.",
    nothingToCopy: "Nothing to copy — quote has no line items.",
    copied: "Quote copied to clipboard",
    copyFailed: "Unable to copy quote. Check browser clipboard permissions.",
  },
} as const;
