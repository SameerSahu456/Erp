// User-facing copy for the CRM › demo-requests sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member. The app is single-locale
// (English, IST) — this is a code-quality / consistency rule, not i18n.
//
// `EN_IN_LOCALE` is the locale tag passed to `Number.toLocaleString` for
// ₹ formatting; it lives here so the literal isn't repeated across line/total
// renderers.
export const EN_IN_LOCALE = "en-IN"

// ₹-prefixed amount formatted with the en-IN grouping. Kept here so neither the
// rupee symbol nor the locale tag is a naked literal sprinkled across the line
// / total renderers.
export const formatRupees = (amount: number) =>
  `₹${amount.toLocaleString(EN_IN_LOCALE)}`

export const DEMO_REQUESTS_STRINGS = {
  list: {
    pageTitle: "Demo Requests",
    pageSubtitle:
      "Product demos for prospects — PM approval, dispatch, and return tracking.",
    breadcrumbCrm: "CRM",
    breadcrumbDemoRequests: "Demo Requests",
    newDemoRequest: "New Demo Request",
    columns: {
      demoNumber: "Demo No.",
      requestType: "Request Type",
      account: "Account",
      requestedBy: "Requested By",
      items: "Items",
      returnDate: "Return By",
      overdue: "Overdue",
      status: "Status",
      created: "Created On",
    },
    // KPI cards — every number is a server-side count over the whole filtered
    // set (search + created-on range), never the rows on the current page.
    stats: {
      total: "Total Demos",
      pendingApproval: "Pending Approval",
      inTheField: "Out With Customers",
      overdueReturns: "Overdue Returns",
    },
    // Status dropdown: `label` is the chip, `allLabel` the reset option, and
    // `statusOptions` the buckets (each shown with its server count).
    statusFilter: {
      label: "Status",
      allLabel: "Statuses",
    },
    statusOptions: {
      pending: "Pending Approval",
      partiallyApproved: "Partially Approved",
      approved: "Approved",
      rejected: "Rejected",
      dispatched: "Dispatched",
      withCustomer: "With Customer",
      overdue: "Overdue",
      returned: "Returned",
      closed: "Closed",
    },
    dateFilter: {
      label: "Created On",
      // Empty-chip text — without this the picker falls back to
      // "All Created Date" (placeholder ?? `All ${label}`).
      placeholder: "Created On",
    },
    overdueDays: (days: number) => `${days}d overdue`,
    empty: {
      loadingTitle: "Loading demo requests…",
      title: "No demo requests yet",
      loadingDescription: "Please wait while demo requests are loaded.",
      description: "Create a demo request to ship eval units to a prospect.",
      action: "New Demo Request",
    },
    alert: {
      loadFailedFallback: "Failed to load demo requests.",
    },
  },
  detail: {
    loading: "Loading demo request…",
    notFound: "Demo request not found",
    notFoundDescription:
      "It may have been deleted, or the link is out of date.",
    loadFailed: "Couldn't load this demo request",
    loadFailedDescription: "Something went wrong while loading. Try again.",
    back: "Back to Demo Requests",
    // Follow-up-query placeholders and catalog fallbacks — shown while (or
    // when) the linked account/contact/variant records resolve.
    fallback: {
      loadingAccount: "Loading account…",
      loadingContact: "Loading contact…",
      loadingShippingAddress: "Loading shipping address…",
      loadingRequester: "Loading requester…",
      loadingLead: "Loading lead…",
      loadingDeal: "Loading deal…",
      dispatchCreated: "Dispatch created",
      catalogItem: "Catalog item",
      catalogBrand: "Catalog",
      uncategorized: "Uncategorized",
      emDash: "—",
    },
    stepper: {
      request: "Request",
      pmApproval: "PM Approval",
      dispatch: "Dispatch",
      withCustomer: "With Customer",
      return: "Return",
    },
    itemsSuffix: (count: number) => `${count} item${count > 1 ? "s" : ""}`,
    createSo: "Create SO",
    lifecycleTitle: "Demo Lifecycle",
    // One vocabulary for the card strip AND the per-line chips. The SO page
    // learned this the hard way — two words for one number reads as two
    // different numbers.
    fulfillment: {
      requested: "Requested",
      pendingDispatch: "Pending Dispatch",
      inProgress: "In Progress",
      dispatched: "Dispatched",
      withCustomer: "With Customer",
      underReturn: "Under Return",
      returned: "Returned",
      converted: "Converted to SO",
      rejected: "Rejected",
      qcFailed: "QC Failed",
      error: "Couldn't load fulfillment counts.",
      unitsTitle: "Units",
      noUnits: "No units dispatched on this line yet.",
      serialLabel: "Serial",
    },
    tabs: {
      overview: "Overview",
      materialIssues: "Material Issues",
      dispatchRequests: "Dispatch Requests",
      salesOrders: "Sales Orders",
    },
    docTabs: {
      noMaterialIssues: "No material issues for this demo yet.",
      noDispatchRequests: "No dispatches for this demo yet.",
      noSalesOrders: "No sales orders created from this demo yet.",
      units: "units",
      items: "items",
    },
    convertDialog: {
      title: "Create Sales Order",
      description:
        "Select the demoed units the customer is purchasing. A Sales Order is created and its lines are sent for PM approval — each unit is marked sold only once its line is approved.",
      selectAll: "Select all",
      qty: (n: number) => `Qty ${n}`,
      serialsPrefix: "S/N",
      priceLabel: "Unit price (₹)",
      priceInvalid: "Enter a valid price (0 or more) for each selected item.",
      notesLabel: "Notes (optional)",
      notesPlaceholder: "Add a note for this order…",
      loadError: "Couldn't load the dispatched units.",
      empty:
        "No units are available to convert. A unit shows here only after its dispatch is confirmed and while it isn't already sold, returned, or on another sales order line.",
      noneSelected: "Select at least one item.",
      cancel: "Cancel",
      submit: "Create Sales Order",
      submitting: "Creating…",
    },
    contact: {
      title: "Customer Contact",
      account: "Account",
      contact: "Contact",
    },
    dates: {
      title: "Dates & Return",
      created: "Created On",
      dispatched: "Dispatched",
      returnBy: "Return By",
      actualReturn: "Actual Return",
      overdueBy: (days: number | undefined) =>
        `Overdue by ${days} day${(days ?? 0) > 1 ? "s" : ""}`,
      condition: "Condition",
    },
    items: {
      title: (count: number) => `Demo Items (${count} units)`,
      approverPrefix: "Approver:",
      unassigned: "Unassigned",
      // "Show more" opens the full text in a modal (same as the Quote approval
      // panel's line descriptions), so there is no inline "Show less".
      reasonShowMore: "Show more",
      reasonPrefix: (reason: string) => `Reason: ${reason}`,
      reasonDialogTitle: "Rejection reason",
      notePrefix: (note: string) => `Approver note: ${note}`,
      noteDialogTitle: "Approver note",
      oem: "Brand/OEM",
      category: "Category",
      condition: "Condition",
      /** Rows saved before `demo_request_items.condition` / `.oem_id` existed
       *  carry null — "Not recorded", never an em-dash, which would read as
       *  "no condition" rather than "we never captured one". */
      notRecorded: "Not recorded",
      qty: "Qty",
      unitPrice: "Unit Price",
      tax: "Tax %",
      amount: "Amount",
      approvedTotal: "Approved Total",
    },
    source: {
      title: "Source",
      deal: "Deal",
      lead: "Lead",
      account: "Account",
      requestedBy: "Requested By",
      dispatchRef: "Dispatch Ref",
    },
    notes: {
      title: "Notes",
      returnNotes: "Return Notes",
    },
    banners: {
      convertedTitle: "Converted to sales order",
      convertedWithNumberPrefix: "Sales order ",
      convertedWithNumberSuffix: " created from this demo.",
      convertedNoNumber: "Sales order created from this demo.",
      viewSo: "View SO",
      overdueTitle: (days: number | undefined) =>
        `Return overdue by ${days} day${(days ?? 0) > 1 ? "s" : ""}`,
      overdueBody: (
        expectedReturn: string,
        contactName: string,
        contactPhone: string,
      ) =>
        `Expected return: ${expectedReturn}. Contact ${contactName} at ${contactPhone} immediately.`,
    },
  },
  form: {
    title: "New Demo Request",
    subtitle: "Customer, demo items, and logistics — submit for PM approval.",
    breadcrumbCrm: "CRM",
    breadcrumbDemoRequests: "Demo Requests",
    breadcrumbNew: "New Demo Request",
    demoNumberPlaceholder: "Auto-generated",
    saveLabel: "Submit for PM Approval",
    footerSummary: (qty: number) => `${qty} unit${qty === 1 ? "" : "s"} · `,
    customer: {
      title: "Customer",
      description:
        "Select Lead, Deal, or Account first; dependent contact and address data loads from CRM.",
      leadDescription:
        "Account and contact carry over from Step 1. Enter where the demo units ship.",
      dealDescription:
        "Account is set from the deal. Pick the contact and shipping address.",
      accountLabel: "Account",
      contactLabel: "Contact",
      contactNoReach:
        "This contact has no email or phone. A demo request needs at least one — add it in Step 1.",
      summaryAccount: "Account",
      summaryContact: "Contact",
    },
    source: {
      label: "Source",
      lead: "Lead",
      deal: "Deal",
      account: "Account",
      selectLead: "Select lead",
      searchLeads: "Search leads…",
      selectDeal: "Select deal",
      searchDeals: "Search deals…",
      selectAccount: "Select account",
      searchAccounts: "Search accounts…",
    },
    contact: {
      nameLabel: "Contact name",
      namePlaceholder: "Loaded from lead",
      phoneLabel: "Contact phone",
      phonePlaceholder: "10-digit mobile number",
      emailLabel: "Contact email",
      emailPlaceholder: "name@company.com",
      reachHint: "Provide at least one of contact phone or email.",
      accountLabel: "Account",
      accountFromDeal: "Loaded from deal",
      accountFromDealRo: "From deal",
      contactLabel: "Contact",
      selectContact: "Select contact",
      pickSourceFirst: "Pick source first",
      noAccount: "No account",
      searchContacts: "Search contacts…",
      addNewContact: "Add new contact",
      editContact: (name: string) => `Edit ${name}`,
    },
    shipping: {
      addressLabel: "Shipping address",
      line1Label: "Shipping line 1",
      line1Placeholder: "Site address",
      line2Label: "Shipping line 2",
      line2Placeholder: "Landmark, floor, etc. (optional)",
      cityLabel: "City",
      stateLabel: "State",
      pincodeLabel: "Pincode",
      pickSourceFirst: "Pick source first",
      noAccount: "No account",
      loadingAddresses: "Loading addresses…",
      noAddresses: "No shipping addresses — add one",
      selectAddress: "Select shipping address",
      addAddress: "Add shipping address",
      editAddress: (label: string) => `Edit ${label}`,
      addressFallback: "address",
    },
    items: {
      title: "Demo items",
      description:
        "Search a part and add it as a line. Unit price is taken from the part master and is not editable; enter the quantity.",
      searchPlaceholder: "Search parts by name, Part no, description, brand, or category...",
      searchInputPlaceholder: "Search variants…",
      availableSuffix: "avail",
      empty: "No items yet",
      emptyHint: "Use the search above to add a part.",
      partColumn: "Part",
      // Same wording as the Sales Order items table (`sales-orders.strings.ts`
      // › detail.items.colOem / colCondition) — the two tables show the same
      // two routing dimensions and must not name them differently.
      oemColumn: "Brand/OEM",
      conditionColumn: "Condition",
      qtyColumn: "Qty",
      unitPriceColumn: "Unit price (₹)",
      taxColumn: "Tax %",
      amountColumn: "Amount",
      /** Shown in place of a routing dimension the line does not carry. */
      noValue: "—",
      footerSummary: (totalQty: number, lineCount: number) =>
        `${totalQty} unit${totalQty === 1 ? "" : "s"} across ${lineCount} line${lineCount === 1 ? "" : "s"}`,
      totalLabel: "Total",
    },
    line: {
      removeLine: "Remove line",
    },
    validation: {
      selectLead: "Select a lead.",
      selectDeal: "Select a deal.",
      selectAccount: "Select an account.",
      accountRequired: "Account is required.",
      accountMissingOnDeal: "Account is missing on this deal.",
      selectContact: "Select a contact.",
      contactNameRequired: "Contact name is required.",
      contactReachRequired: "Contact phone or email is required.",
      leadContactNameMissing:
        "Contact name is missing — complete Step 1 first.",
      leadContactReachMissing: "Add a contact email or phone in Step 1.",
      shippingLine1Required: "Shipping line 1 is required.",
      cityRequired: "City is required.",
      stateRequired: "State is required.",
      pincodeRequired: "Pincode is required.",
      pincodeInvalid: "Enter a valid 6-digit pincode.",
      selectShippingAddress: "Select a shipping address.",
      returnDateRequired: "Expected return date is required.",
      returnDateInPast: "Expected return date cannot be in the past.",
      addItem: "Add at least one demo item.",
      tooManyItems: "A demo request can have at most 100 item lines.",
    },
    logistics: {
      title: "Logistics",
      description:
        "Return date and any context that helps the PM approve quickly.",
      returnDateLabel: "Expected return date",
      notesLabel: "Notes",
      notesPlaceholder:
        "Context for PM (e.g., why this demo, customer history, urgency)",
      notesPlaceholderClosedWon:
        "Context for the PM (e.g., why this demo, customer history, urgency)",
    },
  },
  toast: {
    createFailed: "Failed to create demo request",
    createdPendingApproval: (demoNumber: string) =>
      `${demoNumber} created — pending PM approval`,
    itemsApproved: "Demo request item(s) approved",
    approveFailed: "Failed to approve demo request",
    itemsRejected: "Demo request item(s) rejected",
    rejectFailed: "Failed to reject demo request",
    // Sequential per-item batches can fail midway — say how far they got.
    partialBatchFailed: (succeeded: number, total: number, message: string) =>
      `${succeeded} of ${total} item${total === 1 ? "" : "s"} processed before an error: ${message}`,
    documentsUploadFailed: (failed: number) =>
      `${failed} document${failed === 1 ? "" : "s"} couldn't be uploaded to the account. You can add ${failed === 1 ? "it" : "them"} from the account page.`,
    convertedToSo: "Sales Order created — lines sent for PM approval",
    convertFailed: "Failed to convert demo request",
    soAlreadyExists: "A sales order has already been created for this demo",
    noLineItems: "Demo request has no line items to convert",
    fixHighlightedFields: "Please fix the highlighted fields.",
  },
} as const
