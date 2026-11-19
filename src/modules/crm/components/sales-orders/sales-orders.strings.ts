// User-facing copy for the CRM › sales-orders sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Status / orderable / order-type label maps live in
// `../../constants/so-status.ts` (§16.12 bucket 2). Dynamic copy is expressed
// as a function member.
export const SALES_ORDERS_STRINGS = {
  page: {
    title: "Sales Orders",
    subtitle:
      "Confirmed orders progressing from Draft through Submission and per-line approval.",
    breadcrumbCrm: "CRM",
    breadcrumbSelf: "Sales Orders",
    create: "Create Sales Order",
  },
  section: {
    emptyTitle: (noun: string) => `No sales orders for this ${noun}`,
    noMatches: "No sales orders match your search or filters",
    loadError: "Failed to load sales orders.",
    filters: {
      searchPlaceholder: "Search by SO number",
      submittedOn: "Submitted On",
      submittedBy: "Submitted By",
      approvedBy: "Approved By",
      status: "Status",
      total: "Total",
    },
    categoriesPill: {
      summaryLabel: "Categories",
      hoverTitle: "Sales Order Categories",
    },
    approvedByPill: {
      summaryLabel: "Approvers",
      hoverTitle: "Approved By",
    },
    columns: {
      orderNumber: "Order No",
      submittedBy: "Submitted By",
      total: "Total",
      approvedBy: "Approved By",
      categories: "Categories",
      status: "Status",
      createdOn: "Created On",
      submittedOn: "Submitted On",
      submitted: "Submitted",
      // Rental orders only — these four columns are dropped entirely when a
      // lead/deal produced nothing but plain sales. In `RentalAgreementCells`
      // order.
      agreement: ["Agreement", "Invoice Period", "Billed Through", "Next Invoice"],
    },
  },
  list: {
    approvedByPill: {
      summaryLabel: "Approvers",
      hoverTitle: "Approved By",
    },
    tabAll: "All",
    tabLabel: "Sales Orders",
    filters: {
      statusLabel: "Status",
      statusAll: "Statuses",
      approverLabel: "Approved By",
      channelTypeLabel: "Channel Type",
      submittedDateLabel: "Submitted On",
      createdDateLabel: "Created On",
    },
    columns: {
      orderNumber: "SO #",
      version: "Ver.",
      account: "Account",
      channelType: "Channel Type",
      createdBy: "Created By",
      approvedBy: "Approved By",
      items: "Items",
      total: "Total",
      status: "Status",
      submitted: "Submitted On",
      submittedBy: "Submitted By",
      created: "Created On",
    },
    openSalesOrder: "Open sales order",
    demoBadge: "Demo",
    // A charge order: bills a rental deficiency, never dispatched.
    chargeBadge: "Charge",
    rentalBadge: "Rental",
    openOrderable: (label: string) => `Open ${label}`,
    error: "Failed to load sales orders. Try again.",
    loading: "Loading sales orders…",
    empty: {
      title: "No sales orders yet",
      description:
        "Create a sales order from an accepted quote, lead, or deal.",
      action: "Create Sales Order",
    },
    // Shown instead of `empty` when a search / filter is active — same copy, but
    // no "Create Sales Order" button (the filters just match nothing).
    emptyFiltered: {
      title: "No sales orders yet",
      description:
        "Create a sales order from an accepted quote, lead, or deal.",
    },
  },
  // The Sales orders section on a deal or lead page (`OrdersSection`).
  // Restored: a merge dropped it, which crashed the whole CRM module on
  // that tab ("Cannot read properties of undefined (reading 'loading')").
  entitySection: {
    loading: "Loading sales orders…",
    loadError: "Could not load this entity's sales orders.",
    emptyTitle: "No sales orders yet",
    emptyBody: (entity: "deal" | "lead") =>
      entity === "deal"
        ? "Closing this deal as won creates a sales order, and it will appear here."
        : "Converting this lead creates a sales order, and it will appear here.",
    rentalTag: "Rental",
    showingSome: (shown: number, total: number) => `Showing ${shown} of ${total} sales orders`,
    viewAll: "View all",
  },
  detail: {
    loading: "Loading sales order…",
    notFoundTitle: "Sales order not found",
    notFoundDescription:
      "Failed to load this sales order. It may have been deleted.",
    back: "Back to Sales Orders",
    edit: "Edit",
    amend: "Amend",
    delete: "Delete",
    submit: "Submit for Approval",
    tabs: {
      lineItems: "Line Items",
      materialIssues: "Material Issues",
      dispatchRequests: "Dispatch Requests",
      replacementRequests: "Replacement Requests",
      salesReturns: "Sales Returns",
      // A rental order's Rental Return Requests.
      rentalReturns: "Rental Returns",
      history: "History",
    },
    fulfillment: {
      ordered: "Ordered",
      inProgress: "In progress",
      issued: "Issued",
      ready: "Ready",
      dispatched: "Dispatched",
      qcFailed: "QC Failed",
      returned: "Returned",
      replacements: "Replacements",
      error: "Couldn't load fulfillment counts.",
    },
    docTabs: {
      comingSoon: "Coming soon.",
      noMaterialIssues: "No material issues for this order yet.",
      noDispatchRequests: "No dispatches for this order yet.",
      noReplacementRequests: "No replacement requests for this order yet.",
      createRentalReturn: "New return request",
      createRentalReturnDisabled: "No unit on this order is left to return.",
      noRentalReturnRequests: "No return requests on this order yet.",
      noSalesReturns: "No sales returns for this order yet.",
      returnedUnits: (n: number) =>
        n === 1 ? "1 returned unit" : `${n} returned units`,
      
      loadError: "Couldn't load this list.",
      view: "View",
      units: "units",
      createReplacement: "Create Replacement Request",
      createReplacementDisabled: "Available once a unit has been dispatched.",
      createSalesReturn: "Create Sales Return Request",
      createSalesReturnDisabled: "No units on this order are free to return.",
      // replaced_qty counts distinct ordered units replaced at least once,
      // so it is shown beside the request count — one unit swapped three
      // times reads as "1 unit replaced · 3 requests", and neither number
      // shows that on its own.
      rollupUnits: (n: number) =>
        n === 1 ? "1 unit replaced" : `${n} units replaced`,
      rollupRequests: (n: number) => (n === 1 ? "1 request" : `${n} requests`),
      rollupRepeat: "A replacement was itself replaced",
      linesLoading: "Loading items…",
      noLines: "No line items.",
      serialPrefix: "S/N",
      unknownPart: "Item",
      // The Replacement and Sales Return tabs list only requests a customer
      // can act on (approved onward — a pending/rejected/cancelled request is
      // of no use to the salesperson). A completed request reads as its
      // outcome: "Replaced" for a replacement, "Returned" for a return.
      rrStatus: {
        approved: "Approved",
        partially_approved: "Partially Approved",
        in_progress: "In Progress",
        completed: "Replaced",
      } as Record<string, string>,
      sretStatus: {
        approved: "Approved",
        partially_approved: "Partially Approved",
        completed: "Returned",
      } as Record<string, string>,
    },
    sections: {
      orderInformation: "Order Information",
      contactInformation: "Contact Information",
      billingAddress: "Billing Address",
      shippingAddress: "Shipping Address",
      lineItemDetails: "Line Item Details",
      termsNotes: "Terms & Notes",
      totals: "Totals",
    },
    info: {
      companyName: "Company Name",
      saleDate: "Order Date",
      orderType: "Order Type",
      taxTreatment: "Tax Treatment",
      taxInterState: "Inter-state (IGST)",
      taxIntraState: "Intra-state (CGST + SGST)",
      placeOfSupply: "Place of Supply",
      submitted: "Submitted On",
      submittedBy: "Submitted By",
      createdBy: "Created By",
      contactName: "Contact Name",
      contactNumber: "Phone",
      email: "Email",
      source: "Source",
      demoRequest: "Demo Request",
      loading: "Loading…",
    },
    address: {
      loading: "Loading…",
      // Never a raw id: a reader without access to the address sees this.
      notFound: "Address not available",
      default: "Default",
    },
    linkedDocs: {
      quote: "Quote",
      quoteLoading: "Loading…",
      openQuote: "Open quote",
    },
    items: {
      empty: "No items on this order.",
      colNumber: "#",
      colPart: "Part",
      colCategory: "Category",
      colOem: "Brand/OEM",
      colCondition: "Condition",
      colDescription: "Description",
      colQty: "Qty",
      colInProgress: "In progress",
      colDispatched: "Dispatched",
      colRate: "Rate",
      colTax: "Tax",
      colApprover: "Approver",
      colStatus: "Status",
      colAmount: "Amount",
      // Trailing grid columns (same shape as the Quote view).
      columns: {
        approver: "Approver",
        status: "Status",
        rental: "Rental",
        returnQty: "Ret Qty",
      },
      rejectionReason: "Rejection reason",
      approvalReason: "Approval reason",
      // Extra per-line facts the grid has no column for, listed under it.
      lineDetails: "Line details",
      approverPrefix: "Approver: ",
      notesPrefix: "Notes: ",
      warrantyPrefix: "Warranty: ",
      warrantyTitle: "Warranty",
      descriptionTitle: "Description",
      showMore: "Show more",
      serialPrefix: "S/N",
      // A rental line's OWN billing window. Each line bills its own
      // span: an imported rental order carries one line PER PHYSICAL
      // MACHINE, so two machines on one order routinely start and end
      // on different days, and each unit's first invoice counts its
      // own. Captured on the form, used by the engine, shown on
      // quotes — and never displayed here until now.
      rentalWindow: "Rental",
      // Shown on a rental line that carries no dates of its own. It is
      // still billed — the rentals engine falls the window back to the
      // agreement's (`build_billing_settings`) — so the sub-line must say
      // which window applies rather than disappear, which is how the first
      // line of an order looked like it was missing the field.
      rentalWindowFollowsOrder: "Rental: follows the order period",
      soldViaDemo: "Sold via demo",
      raiseReturn: "Raise return",
      // An approved replacement, appended under the line it replaces. The
      // line itself stays what was ordered.
      replacedBy: "Replaced by",
      replacementQty: (qty: number) => (qty === 1 ? "1 unit" : `${qty} units`),
      replacementRate: (rate: string) => `${rate}/month`,
      replacementStatus: {
        awaitingDispatch: "Approved · awaiting dispatch",
        dispatched: "Dispatched · old unit not yet back",
        completed: "Dispatched · old unit returned",
        notNeeded: "Closed",
      },
      inheritsParent: "inherits parent",
      noteEmpty: "No note recorded",
      decidedRejected: "Rejected",
      decidedApproved: "Approved",
      decidedAuto: "Auto-approved",
      showLess: "Show less",
      // Rate → variant grouping. Imported rental orders carry one line per
      // physical machine ("1) HPE DL380", "2) HPE DL380", …), so the table
      // groups by rate and merges same-variant lines into one row. The
      // constituent lines are never dropped — these strings are how the row
      // says it stands for several.
      rateGroupLines: (lines: number) =>
        lines === 1 ? "1 line" : `${lines} lines`,
      /** Under a merged row's name: how many order lines it summarises, and
       *  the way into them. */
      mergedLines: (lines: number) => `${lines} lines · view breakdown`,
      /** The Description column on a merged row. Each merged line has its own
       *  description carrying its own serial, so the cell counts them rather
       *  than showing the first and hiding the rest. */
      mergedDescriptions: (lines: number) => `${lines} configurations`,
      // Not "Lines at this rate": the dialog only opens from a merged row,
      // merged rows only exist on rentals, and a rental order does not show
      // the line rate at all (SoItemsTable `showRate`). A title naming a
      // figure that is nowhere on the screen reads as a missing column.
      breakdownTitle: "Lines merged into this row",
      breakdownDescription:
        "Each line keeps its own serial, approval and units — merged here only for the summary row.",
      /** Approver / status columns when the merged lines disagree. */
      mergedApprovers: (count: number) => `${count} approvers`,
      mergedStatus: (count: number, status: string) => `${count} ${status}`,
      viewUnits: "Tracked units",
      /** Breakdown dialog, rental orders: where the line's units stand. */
      rentalStatus: "Rental status:",
      rentalStatusNone: "Not dispatched yet",
    },
    // "Amend / Revise" dialog — sends a Rejected/approved SO back to Draft.
    reviseDialog: {
      title: (orderNumber: string) => `Amend ${orderNumber}?`,
      bodyBefore: "The order returns to ",
      draftWord: "Draft",
      bodyAfter:
        " and becomes editable. All line approvals/rejections are cleared (assigned approvers are kept), and it will need to be re-submitted for approval.",
      reasonLabel: "Reason",
      reasonPlaceholder: "e.g., Customer requested higher memory config",
      cancel: "Cancel",
      confirm: "Amend",
    },
    // Banner shown on a Rejected SO surfacing per-line rejection reasons.
    rejectionBanner: {
      title: "This sales order was rejected",
      noReason: "No rejection reason was recorded for this order.",
    },
    approver: {
      unknownUser: "Another user",
      missing: "Missing",
      loading: "Loading…",
      assigned: "Assigned approver",
      approvedBy: (name: string) => `Approved by ${name}`,
      rejectedBy: (name: string) => `Rejected by ${name}`,
      approved: "Approved",
      rejected: "Rejected",
      autoApproved: "Auto-approved",
      on: (date: string) => `on ${date}`,
    },
    terms: {
      paymentTerms: "Payment Terms",
      warranty: "Warranty",
      delivery: "Delivery",
      termsConditions: "Terms & Conditions",
      notes: "Notes",
    },
    totals: {
      subtotal: "Subtotal",
      discount: "Discount",
      headerDiscount: "Header discount",
      headerDiscountPct: (pct: number) => `Header discount (${pct}%)`,
      taxableAmount: "Taxable amount",
      cgst: "CGST",
      sgst: "SGST",
      igst: "IGST",
      totalTax: "Total tax",
      grandTotal: "Grand total",
    },
    viewerBanner: {
      viewingAs: "Viewing as ",
      hiddenSuffix: (count: number) =>
        ` · ${count} line(s) on this order aren't yours to review and are hidden.`,
    },
    deleteDialog: {
      title: "Delete this sales order?",
      bodyAfter:
        " will be soft-deleted. This action is reversible from the audit trail but the order won't appear in lists. Continue?",
      cancel: "Cancel",
      confirm: "Delete",
    },
    submitDialog: {
      title: "Submit for approval?",
      bodyMiddle: " will move to ",
      bodyStatus: "Submitted",
      bodyAfter: ".",
      missingApprovers: "Any line without an approver will skip PM approval.",
      cancel: "Cancel",
      confirm: "Submit",
    },
  },
  form: {
    rentalWindowRequired:
      "Pick the rental period — every line of a rental order bills against it.",
    rentalOrderDateRequired: "Pick the rental order date.",
    orderTypeRequired: "Select an order type.",
    rentalEndAfterStart: "End date must be after start date",
    rentalStartInPast: "Start date is in the past — billing starts at dispatch",
    titleCreate: "Create Sales Order",
    titleLoading: "Loading…",
    titleNotFound: "Not found",
    breadcrumbCrm: "CRM",
    breadcrumbSelf: "Sales Orders",
    breadcrumbLoading: "Loading…",
    breadcrumbNotFound: "Not found",
    breadcrumbNew: "New Sales Order",
    loadingSo: "Fetching sales order…",
    loadError: "Failed to load this sales order. It may have been deleted.",
    checkingLinked: "Checking the linked record…",
    notFoundEntity: (entity: string) => `${entity} not found`,
    linkedNotFound: (entity: string) =>
      `The ${entity} this sales order should link to doesn't exist or has been removed. Check the link and try again.`,
    subtitleItems: (count: number, total: string) =>
      `${count} item${count === 1 ? "" : "s"} · ${total}`,
    subtitleFromQuote: "Sales order from an accepted quote.",
    subtitleDirect: "Direct sales order — pick a customer and add line items.",
    saveCreate: "Create Sales Order",
    saveEdit: "Save Changes",
    errorBannerTitle: "Fix the following before saving",
    readOnlyBannerBefore: "This sales order is ",
    readOnlyBannerAfter:
      " and can no longer be edited. Status actions (Submit, line approvals, Revise) live on the detail page.",
    closedWonTitle: (sourceLabel: string) =>
      `Creating Sales Order from ${sourceLabel}`,
    closedWonBody: (sourceType: string) =>
      `The picker below is scoped to this ${sourceType}'s Accepted quotes. The ${sourceType} moves to Closed Won once this sales order is approved.`,
    source: {
      title: "Source",
      subtitle: "Quote linkage for this sales order.",
      lockedOnCreate: "Source is locked once the order is created.",
      fromQuote: "From Quote",
      direct: "Direct",
      lockedClosedWon: (sourceType: string) =>
        `Locked because this order was started from the ${sourceType}'s Closed-Won flow.`,
      salesQuote: "Sales Quote",
      sourcePrefix: "Source: ",
      quoteSummary: (count: number, total: string) =>
        `${count} item(s) · ${total}`,
      leadCascadeNote:
        "Lead-cascade: a new Account + Contact will be created from the lead. You must supply the billing address below; shipping defaults to billing when blank.",
      loadingQuote: "Loading quote details…",
    },
    orderDetails: {
      title: "Order Details",
      subtitleLeadCascade:
        "Lead-cascade — billing/shipping addresses needed for the new account.",
      subtitleFromQuote:
        "Override contact and addresses, or accept the defaults pulled from the quote.",
      subtitleDirect: "Customer, dates, and order configuration.",
      account: "Account",
      accountPlaceholder: "Select account…",
      sourceIsBefore: "Source is",
      sourceLockedEdit: "Customer fields are locked once the SO is created.",
      sourcePickPrompt:
        "Pick the contact and addresses to associate with this sales order.",
      leadCascadeNote:
        "Lead-cascade — a new Account + Contact will be created from the lead. Enter billing/shipping addresses in the Addresses section below.",
      orderType: "Order Type",
      orderTypePlaceholder: "Select order type",
      rentalOrderDate: "Order date",
      rentalStartDate: "Rental start",
      rentalEndDate: "Rental end",
      rentalBillingPeriod: "Billing period",
      rentalBillingPeriodPlaceholder: "Pick the rental window",
      rentalEndDateHelp: "The last day of the rental — this day is included.",
      placeOfSupply: "Place of Supply",
      placeOfSupplyPlaceholder: "2-letter state code (e.g. KA)",
    },
    lineItems: {
      title: "Line Items",
      subtitleFromQuote:
        "Prefilled from the selected quote — adjust qty / rate / approver before saving.",
      subtitleDirect: "Build the bill of materials for this order.",
      add: "Add Line Item",
    },
    addresses: {
      title: "Addresses",
      subtitle: "Pick or add billing & shipping addresses.",
      billing: "Billing Address",
      shipping: "Shipping Address",
      shippingSameAsBilling: "Shipping address same as billing",
    },
    documents: {
      title: "Account Documents (optional)",
      subtitle:
        "PDF, JPG, or PNG up to 20 MB each. Attached to the new Account created by this Sales Order.",
    },
    termsNotes: {
      title: "Terms & Notes",
      subtitle: "Add commercial terms, notes, or special instructions.",
    },
    contact: {
      label: "Contact",
      placeholder: "Select contact…",
      placeholderNoAccount: "Pick an account first",
    },
  },
  line: {
    remove: "Remove line",
    partNumber: "Part Number",
    name: "Name",
    namePlaceholder: "Enter item name",
    description: "Description",
    category: "Category",
    categoryFromPart: "From part",
    categoryPlaceholder: "Select category",
    oem: "Brand/OEM",
    oemFromPart: "From part",
    oemPlaceholder: "Select Brand/OEM",
    condition: "Condition",
    conditionFromPart: "From part",
    conditionPlaceholder: "Select condition",
    oemRequired: "Pick a Brand/OEM.",
    conditionRequired: "Pick a condition.",
    qty: "Qty",
    rate: "Rate",
    discount: "Disc ₹",
    discountAriaLabel: "Line discount in rupees",
    tax: "Tax %",
    fullyDrawn: "Fully drawn — skip on save",
    maxQty: (max: number) => `Max qty ${max} (quoted amount)`,
    period: "Period",
    day: "Day",
    month: "Month",
    startDate: "Start date",
    endDate: "End date",
    rentalLine: "Rental line",
    // The "not yet supported / Save will fail" warning this carried was
    // written before rental sales orders shipped. They have been live
    // since, so the note now says only what is still true about the rate.
    rentalNoteBefore: (period: string) =>
      `Rate is per-${period}, per-unit.`,
    rentalNoteStrong: "",
    rentalNoteAfter: "",
    // Rental duration breakdown, e.g. "3 days × 2 units × ₹500". `period` is the
    // SORentalPeriod wire value; `rate` is the already-coerced number.
    durationBreakdown: (
      units: number,
      period: string,
      qty: number,
      rate: number | string,
    ) =>
      `${units} ${period}${units !== 1 ? "s" : ""} × ${qty} unit${Number(qty) !== 1 ? "s" : ""} × ₹${rate || 0}`,
    lineBillingPeriod: "Billing period",
    lineBillingPeriodPlaceholder: "Same as the order",
    lineBillingPeriodHelp:
      "Defaults to the order's window. Override only if this item is out for a different span.",
    durationGrossSuffix: "gross",
    validation: {
      // Parent line — Part Number is optional; a line without one must carry
      // a description so the saved row is identifiable.
      descriptionRequired: "Add a part number or a description.",
      // Category must be set on every parent line.
      categoryRequired: "Select a category.",
      // Rate must be positive.
      rateRequired: "Rate must be greater than 0.",
      // BOM child — category required.
      componentCategoryRequired: "Component category is required.",
      // BOM child — part name required.
      componentNameRequired: "Component name is required.",
    },
  },
  addressEditor: {
    line1: "Line 1",
    line2: "Line 2 (optional)",
    city: "City",
    state: "State",
    pincode: "Pincode",
    labelField: "Label (optional)",
    labelPlaceholder: "e.g. Head Office",
  },
  addressPicker: {
    addressSuffix: " Address",
    add: "Add",
    pickAccountFirst: "Pick an account first.",
    loading: "Loading addresses…",
    noneAvailable: (kind: string) => `No ${kind} addresses available.`,
    clickAddPrompt: 'Click "Add" to create one.',
    account: "Account",
    both: "Both",
    default: "Default",
    editAddress: (label: string) => `Edit ${label}`,
    editFallbackLabel: "address",
  },
  quotePicker: {
    placeholder: "Select a quote",
    searchPlaceholder: "Search by quote # or notes…",
    loading: "Loading quote…",
    optionLabel: (parts: string) => parts,
  },
  approval: {
    openDetails: (orderNumber: string) => `Open ${orderNumber} details`,
    collapseLines: "Collapse line items",
    expandLines: "Expand line items",
    loadFailed: (suffix: string) => `Failed to load lines${suffix}`,
    noLines: "This sales order has no line items.",
    noLinesAssigned: "No lines on this sales order are assigned to you.",
    cols: {
      item: "Item",
      category: "Category",
      oem: "Brand/OEM",
      condition: "Condition",
      qty: "Qty",
      rate: "Rate",
      tax: "Tax %",
      amount: "Amount",
      statusActions: "Status / Actions",
      // Rental SOs (QA RM19): the rate is per period, and so is the amount —
      // qty × rate, ONE period's rent (2026-11-02), never the whole term.
      ratePer: (period: "day" | "month") => `Rate / ${period}`,
      amountPer: (period: "day" | "month") => `Amount / ${period}`,
      // Lines mixing day and month periods: each row says its own.
      amountPerPeriod: "Amount / period",
    },
    rental: {
      badge: "Rental",
      term: (start: string, end: string, duration: string) => `${start} – ${end} · ${duration}`,
      // Fallback when the server sent no label: the unit count as-is.
      units: (units: number, period: "day" | "month") =>
        `${units} ${period}${units === 1 ? "" : "s"}`,
      perPeriod: (period: "day" | "month") => `/ ${period}`,
    },
    approve: "Approve",
    reject: "Reject",
    reassign: "Reassign",
    panel: {
      loadFailedSo: (suffix: string) => `Failed to load sales order${suffix}`,
      submittedPrefix: "Submitted ",
      grandTotal: "Grand total",
      subtotal: "Subtotal",
      totalTax: "Total tax",
      lineDiscount: "Line discount",
      placeOfSupply: "Place of supply",
      terms: "Terms",
      notes: "Notes",
      lineItems: "Line items",
      lineItemsHelp:
        "Approve / reject lines you're assigned to, or reassign to another PM. Approver-scoped — only lines you own accept your decisions.",
      noLinesOnSo: "This sales order has no lines.",
      noLinesAssigned: "No lines on this sales order are assigned to you.",
      inheritsParent: "inherits parent",
    },
    dialogs: {
      approveTitle: "Approve line",
      approveBodyBefore: "Approve ",
      approveBodyMiddle: " on sales order ",
      approveBodyAfter: "?",
      notesOptional: "Notes (optional)",
      notesPlaceholder: "Add a short note for the audit trail (optional)…",
      approving: "Approving…",
      approve: "Approve",
      cancel: "Cancel",
      rejectTitle: "Reject line",
      rejectBodyBefore: "Reject ",
      rejectBodyMiddle: " on sales order ",
      rejectBodyAfterBefore: "? The whole sales order will be marked ",
      rejectBodyStatus: "Rejected",
      rejectBodyAfterAfter:
        "; other pending lines will freeze until the SO is revised.",
      reason: "Reason",
      rejectReasonPlaceholder:
        "Why is this line being rejected? (required, ≤ 1000 chars)",
      rejecting: "Rejecting…",
      reject: "Reject",
      reassignTitle: "Reassign approver",
      reassignBodyBefore: "Move the pending decision on ",
      reassignBodyAfter:
        " to a different approver. Eligible PMs are scoped by the line's category.",
      newApprover: "New approver",
      approversLoading: "Loading eligible approvers…",
      selectApprover: "Select an approver",
      approversError: "Couldn't load approvers — try again later.",
      noOtherPms: "No other PMs cover this category.",
      reassignReasonPlaceholder:
        "Why is this being reassigned? (required, ≤ 500 chars)",
      reassigning: "Reassigning…",
      reassign: "Reassign",
    },
    validation: {
      notesTooLong: (max: number) => `Notes must be ${max} characters or less.`,
      fixHighlighted: "Please fix the highlighted fields.",
      rejectReasonRequired: "Notes are required when rejecting a line.",
      pickApprover: "Pick an approver.",
      reasonRequired: "Reason is required.",
      reasonTooLong: (max: number) =>
        `Reason must be ${max} characters or less.`,
    },
  },
  toast: {
    fixHighlighted: "Please fix the highlighted fields.",
    created: "Sales order created",
    createFailed: "Failed to create sales order",
    updated: "Sales order updated",
    updateFailed: "Failed to update sales order",
    revised: (orderNumber: string) => `New revision ${orderNumber} created`,
    reviseFailed: "Failed to revise sales order",
    deleted: "Sales order deleted",
    deleteFailed: "Failed to delete sales order",
    submitted: "Sales order submitted for approval",
    submitFailed: "Failed to submit sales order",
    lineApproved: "Line approved",
    lineApproveFailed: "Failed to approve line",
    lineRejected: "Line rejected — sales order marked Rejected",
    lineRejectFailed: "Failed to reject line",
    lineReassigned: "Line reassigned",
    lineReassignFailed: "Failed to reassign line",
    calcFailed: (msg: string) => `Calculation failed — ${msg}`,
    submitMissingApprovers: (count: number) =>
      `Pick an approver on every line first (${count} line${count === 1 ? "" : "s"} missing).`,
    submitNoLines: "Add at least one line item before submitting.",
  },
  approvalErrors: {
    lineNotOwned: "You aren't the approver for this line.",
    lineAlreadyDecided: "This line has already been decided.",
    lineIsBomChild:
      "BOM component lines are decided with their parent — approve or reject the headline instead.",
    soNotAcceptingDecisions:
      "This sales order is no longer accepting line decisions.",
    approverLacksPermission: "The selected user can't approve sales orders.",
    reassignTargetInvalid: "Pick a different approver.",
    lineNotFound: "Line not found on this sales order.",
    soNotFound: "Sales order not found.",
  },
} as const
