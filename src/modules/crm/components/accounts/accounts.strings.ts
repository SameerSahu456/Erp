// User-facing copy for the CRM › accounts sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `delete.body`).
export const ACCOUNTS_STRINGS = {
  // Shared breadcrumb trail labels reused across the list / form / detail pages.
  breadcrumbs: {
    crm: "CRM",
    accounts: "Accounts",
    edit: "Edit",
    newAccount: "New Account",
  },
  list: {
    title: "Accounts",
    subtitle:
      "Companies you do business with, their owners, and outstanding invoices.",
    addAccount: "Add Account",
    tabLabel: "All Accounts",
    columns: {
      name: "Name",
      entityType: "Entity Type",
      industry: "Industry",
      type: "Type",
      owners: "Account Owners",
      status: "Status",
      approval: "Approval",
      approvedBy: "Approved By",
      rejectedBy: "Rejected By",
      interested: "Interested",
      bought: "Bought",
      tag: "Tag",
      createdOn: "Created On",
      access: "Access",
      // Rentals › Accounts only.
      firstRentalOrder: "First rental order",
      rentalOrders: "Rental SOs",
    },
    pills: {
      owners: "Owners",
      ownersHover: "Account Owners",
      interested: "Interested",
      interestedHover: "Categories Interested",
      bought: "Bought",
      boughtHover: "Categories Bought",
    },
    loading: "Loading accounts…",
    loadError: "Unable to load accounts.",
    empty: {
      title: "No accounts yet",
      description:
        "Add companies you do business with to track revenue and invoices.",
      action: "Add Account",
    },
    // List toolbar filter labels. `*All` values are the reset-option / empty
    // text shown in the chip when nothing is picked (no "All …" prefix — the
    // bare noun reads cleaner in a compact toolbar).
    filters: {
      statusLabel: "Status",
      statusAll: "Statuses",
      sizeLabel: "Size",
      sizeAll: "Sizes",
      typeLabel: "Type",
      industryLabel: "Industry",
      industryAll: "Industries",
      entityType: "Entity Type",
      // Access checkbox — ticked = only accounts the viewer can already open
      // (the table's Access column left blank).
      accessHas: "Has access",
      createdDate: "Created On",
      owner: "Account Owners",
      approvedBy: "Approved By",
      rejectedBy: "Rejected By",
      // Rentals › Accounts only — the date filter there is on the account's
      // first rental order, not the account's own creation.
      firstRentalOrder: "First rental order",
    },
    // Per-row access affordance + the viewer's access-request status, sourced
    // from the backend `can_request_access` flag and `access_request_status`.
    access: {
      request: "Request Access",
      requested: "Requested",
      granted: "Access Granted",
      rejected: "Access Denied",
    },
  },
  detail: {
    loading: "Loading account…",
    notFoundTitle: "Account not found",
    notFoundDescription:
      "The account you're looking for doesn't exist or has been removed.",
    restrictedTitle: "Access restricted",
    restrictedDescription:
      "You don't have permission to view this account. Contact an administrator if you believe this is a mistake.",
    back: "Back to Accounts",
    edit: "Edit",
    delete: "Delete",
    approval: {
      pending: "Pending Approval",
      approved: "Approved",
      rejected: "Rejected",
    },
    tabs: {
      overview: "Overview",
      addresses: "Addresses",
      contacts: "Contacts",
      deals: "Deals",
      quotes: "Quotes",
      salesOrders: "Sales Orders",
      meetings: "Meetings",
      activities: "Activities",
      notes: "Notes",
      threeSixty: "360°",
    },
    threeSixty: {
      topProductsTitle: "Top Products",
      topProductsWhy:
        "Best-selling products this account bought, ranked by closed value.",
      revenueTitle: "Revenue",
      revenueWhy:
        "Closed-order revenue for this account, bucketed by the selected period.",
      categoryFilterPlaceholder: "Category",
      oemFilterPlaceholder: "OEM",
      clearFilters: (count: number) => `Clear filters (${count})`,
      categoryTitle: "Category — Value Closed",
      categoryWhy:
        "Categories this account bought, ranked by closed value.",
      oemTitle: "OEM — Value Closed",
      oemWhy:
        "OEMs this account bought, ranked by closed value.",
      // Sub-label over the pivot, separating it from the tiles above.
      pivotSectionLabel: "",
      pivotCornerHeader: "Category ↓ · Brand →",
      pivotRowTotal: "Total",
      pivotColumnTotal: "Total",
      pivotZeroCell: "—",
      // 5-tile KPI strip at the top of the 360° tab. Copy is the tile face
      // and the small subtitle underneath; values format elsewhere. Tiles are
      // scoped to this account + the tab's Category/OEM facets.
      //
      // DEALS comes from `GET /crm/dashboard/summary` (the board's own tile
      // source, narrowed by `account_ids`); the other four come from
      // `GET /crm/accounts/{id}/kpis`. Deliberately NOT shown: a deal VALUE
      // on the DEALS tile and a period-over-period delta on REVENUE — neither
      // endpoint returns them, and the dashboard's own trend arrows are
      // hardcoded placeholders, so inventing one here would read as real.
      kpi: {
        dealsLabel: "Deals",
        // `won` is `deals_closed` — deals in the window that reached closed-won.
        dealsSub: (won: number) => `${won.toLocaleString("en-IN")} won`,
        ordersLabel: "Sales Orders",
        lifetimeLabel: "Lifetime Revenue",
        lifetimeSub: (orders: number) =>
          `${orders.toLocaleString("en-IN")} order${orders === 1 ? "" : "s"} all time`,
        revenueLabel: "Revenue",
        lastOrderLabel: "Last Order",
        // Shown in a tile's VALUE slot when there is nothing to show — the
        // same em-dash the pivot uses for an empty cell, so "no data" reads
        // identically everywhere on the tab.
        emptyValue: "—",
        lastOrderDaysAgo: (days: number) =>
          days === 0 ? "today" : `${days.toLocaleString("en-IN")}d ago`,
        // Count of SOs on this account whose header status is `Returned`.
        // These are dropped from Orders / Revenue / Lifetime / Last Order by
        // the counted-order rule (lines pro-rated to zero) — this tile
        // surfaces them so the strip reconciles with the Sales Orders tab.
        // `PartiallyReturned` is NOT counted here; it already counts net on
        // the Orders tile.
        returnedLabel: "Returned Orders",
        returnedSub: (lifetime: number) =>
          `${lifetime.toLocaleString("en-IN")} all time`,
        // Joins the window label to the figure on a tile's sub-line —
        // "Jul 2026 · 0 won".
        subJoin: (window: string, detail: string) =>
          window && detail ? `${window} · ${detail}` : window || detail,
        loading: "Loading KPIs…",
        loadError: "Failed to load KPIs.",
      },
      // Band heading over the widget grid — "Revenue · Jul 2026". The window
      // half is dropped until the KPI response lands, so the rule never shows
      // a trailing separator with nothing after it.
      revenueBand: (window: string) => (window ? `Revenue · ${window}` : "Revenue"),
    },
  },
  // Account create / edit form page (FormPageShell chrome + form body).
  form: {
    editTitle: "Edit Account",
    editLoadingSubtitle: "Loading account details…",
    loadError: "Failed to load account.",
    editTitlePrefix: "Edit Account: ",
    editSubtitle: "Update account profile, addresses, and categories.",
    saveChanges: "Save Changes",
    bodyTitleEdit: "Edit Account Details",
    // Create-mode copy by launch: a plain "New Account", a child created from a
    // parent's detail page, or a parent created from a child's detail page.
    createByKind: {
      account: {
        title: "Create Account",
        subtitle: "Add a new customer or partner account.",
        save: "Create Account",
        body: "New Account Details",
        breadcrumb: "New Account",
      },
      child: {
        title: "Create Child Account",
        subtitle: "Add a new child account under the selected parent account.",
        save: "Create Child Account",
        body: "New Child Account Details",
        breadcrumb: "New Child Account",
      },
      parent: {
        title: "Create Parent Account",
        subtitle: "Add a new parent account for the selected account.",
        save: "Create Parent Account",
        body: "New Parent Account Details",
        breadcrumb: "New Parent Account",
      },
    },
  },
  // Company Details form section.
  company: {
    sectionLabel: "Company Details",
    name: "Company Name",
    namePlaceholder: "Company name",
    industry: "Industry",
    industryPlaceholder: "Select industry",
    type: "Type",
    typePlaceholder: "Select type",
    tag: "Tag",
    tagPlaceholder: "Select tag",
    website: "Website",
    websitePlaceholder: "https://www.example.com",
    pan: "PAN Number",
    panPlaceholder: "e.g. ABCDE1234F (optional)",
    gst: "GST Number",
    gstPlaceholder: "e.g. 27ABCDE1234F1Z5",
  },
  // Size & Revenue form section.
  sizeRevenue: {
    sectionLabel: "Size & Revenue",
    companySize: "Company Size",
    companySizePlaceholder: "Select size (optional)",
    employees: "Employees",
    employeesPlaceholder: "Number of employees",
    annualRevenue: "Annual Revenue (₹)",
  },
  // Status & Ownership form section.
  statusOwnership: {
    sectionLabel: "Status & Ownership",
    status: "Status",
    accountOwners: "Account Owners",
    parentAccount: "Parent Account",
    parentLockedHint:
      "This account will be created as a child of the selected parent.",
    // Shown in edit mode when this account already has sub-accounts and a parent
    // is picked — saving re-parents the children under the new parent too.
    reparentChildrenHint:
      "This account has sub-accounts. Setting a parent will also move them under the new parent.",
  },
  // Account-owner filter (async user picker in the list toolbar).
  ownerFilter: {
    all: "All owners",
    clear: "Clear owner",
    searchPlaceholder: "Search owners…",
    loadError: "Failed to load users",
    noMatches: "No matches",
    noUsers: "No users",
  },
  // "Manage child accounts" dialog (link existing accounts as children).
  linkChildDialog: {
    title: "Manage child accounts",
    accountsLabel: "Accounts",
    placeholder: "Select accounts to link…",
    cancel: "Cancel",
    save: "Save",
    // Live child-account count in the dialog — base total from the API,
    // adjusted by the user's pending ticks/unticks. Pluralised at runtime.
    childCount: (n: number) => `${n} child account${n !== 1 ? "s" : ""}`,
  },
  // "Set parent account" dialog (link an existing account as this one's parent).
  linkParentDialog: {
    title: "Set parent account",
    accountLabel: "Parent account",
    placeholder: "Select a parent account…",
    removeParent: "Remove parent",
    cancel: "Cancel",
    save: "Save",
    // Warning shown when this account already has children — setting a parent
    // promotes them to the new parent too (2-level policy). Pluralised.
    reparentChildrenWarning: (n: number) =>
      `This account has ${n} sub-account${n !== 1 ? "s" : ""}. Setting a parent will also move ${n !== 1 ? "them" : "it"} under the new parent.`,
  },
  // Categories Interested / Bought form fields.
  categoriesFields: {
    interested: "Categories Interested",
    bought: "Categories Bought",
    interestedPlaceholder: "Select categories interested...",
    boughtPlaceholder: "Select categories bought...",
  },
  // Form-mode cards that wrap the address / contact / document editors.
  formCards: {
    addresses: "Addresses",
    contacts: "Contacts",
    documents: "Documents",
    documentsHelp:
      "Optional. Each file ≤ 20 MB, PDF / JPEG / PNG only. Documents upload alongside the account create call and appear under the Documents section afterwards.",
    documentHelperText: "PDF, JPG, PNG · max 20 MB",
  },
  // Overview tab — Company Details info card.
  overview: {
    companyDetails: "Company Details",
    industry: "Industry",
    type: "Type",
    location: "Location",
    companySize: "Company Size",
    employees: "Employees",
    pan: "PAN Number",
    gst: "GST Number",
    annualRevenue: "Annual Revenue",
    website: "Website",
    created: "Created On",
  },
  // Detail header action buttons (Edit / Delete).
  headerActions: {
    edit: "Edit",
    delete: "Delete",
  },
  // Address grid + tab (detail view) and address editor (form view).
  addresses: {
    untitled: "Untitled",
    default: "Default",
    billingTitle: "Billing Addresses",
    shippingTitle: "Shipping Addresses",
    tabHint: "Use the Edit page to add or modify addresses.",
    gridEmptyBilling: "No billing addresses added",
    gridEmptyShipping: "No shipping addresses added",
    line1: "Address Line 1",
    line1Placeholder: "Street address",
    line2: "Address Line 2",
    line2Placeholder: "Apt, suite, area (optional)",
    city: "City",
    cityPlaceholder: "City",
    state: "State",
    statePlaceholder: "State",
    pincode: "Pincode",
    pincodePlaceholder: "Pincode",
    type: "Type",
    both: "Both",
    loading: "Loading addresses…",
    loadError: "Failed to load addresses.",
    useForBoth: "Use for both billing & shipping",
    saveChanges: "Save changes",
    addBilling: "Add Billing Address",
    addShipping: "Add Shipping Address",
    emptyBilling: "No billing addresses added yet.",
    emptyShipping: "No shipping addresses added yet.",
    makeDefault: "Make default",
    labelPlaceholderBilling: "Label (e.g. HQ Billing)",
    labelPlaceholderShipping: "Label (e.g. Warehouse)",
  },
  // Categories card (detail right-rail).
  categoriesCard: {
    title: "Categories",
    interested: "Interested",
    bought: "Bought",
  },
  // Contacts tab + card.
  contacts: {
    cardTitle: "Contacts",
    addContact: "Add Contact",
    primary: "Primary",
    empty: "No contacts linked to this account",
    // `${count} contact(s) linked to this account` — pluralised at runtime.
    linkedCount: (count: number) =>
      `${count} contact${count !== 1 ? "s" : ""} linked to this account`,
  },
  // Deals tab.
  deals: {
    dealNumber: "Deal No",
    dealName: "Deal Name",
    accountOwner: "Account Owner",
    createdOn: "Created On",
    categories: "Categories",
    categoriesPill: {
      summaryLabel: "Categories",
      hoverTitle: "Deal Categories",
    },
    noMatches: "No deals match your search or filters",
    filters: {
      searchPlaceholder: "Search by deal number or name",
      accountOwner: "Account Owner",
      stage: "Stage",
      allStages: "All Stages",
      closedDate: "Closed Date",
      createdOn: "Created On",
    },
    stage: "Stage",
    closedDate: "Closed Date",
    closedOnTip: (when: string) => `Closed on ${when}`,
    empty: "No deals on this account yet",
  },
  // Placeholder tab for modules whose backend is not shipped yet.
  // `The <module> module backend is not shipped yet. …`
  placeholderTab: (label: string) =>
    `The ${label} module backend is not shipped yet. This tab will populate from live data once the service goes live.`,
  // Hierarchy cards (Parent / Child accounts).
  hierarchy: {
    parentAccount: "Parent Account",
    parentPendingApproval: "Pending approval",
    viewParentAccount: "View parent account",
    childAccounts: "Child Accounts",
    addChildAccount: "Add child account",
    addParentAccount: "Add parent account",
    changeParentAccount: "Change parent account",
    linkExisting: "Link existing account",
    createNew: "Create new account",
    childEmpty: "No child accounts yet.",
    noParent: "No parent account.",
    // Shown (tooltip) when the add-child affordance is suppressed because this
    // account is itself a child — a child account can't have sub-accounts.
    childAddBlocked:
      "This is a child account. Child accounts can't have their own sub-accounts.",
  },
  // Owners card + owner row.
  owners: {
    cardTitle: "Account Owners",
    addOwner: "Add owner",
    empty: "No owners assigned yet.",
    makePrimaryOwner: "Make primary owner",
    removeOwner: "Remove owner",
    // Owner card falls back to this when the user has no saved designation.
    defaultDesignation: "Account Manager",
  },
  // AccountOwnersSelect chips.
  ownersSelect: {
    unsetPrimary: "Unset primary",
    makePrimary: "Make primary",
    primaryOwner: "Primary owner",
    removeOwner: "Remove owner",
  },
  // Add owners dialog.
  addOwnerDialog: {
    title: "Add owners",
    description:
      "Pick one or more users from the active directory. Star one to mark them primary — only the starred user will be set as primary.",
    cancel: "Cancel",
    adding: "Adding…",
    addOwner: "Add owner",
    // `Add N owners` when more than one user is picked.
    addOwners: (count: number) => `Add ${count} owners`,
  },
  // Documents section / row / card (edit + overview views).
  documents: {
    title: "Documents",
    loading: "Loading documents…",
    loadError: "Failed to load documents.",
    // `Failed to load documents: <reason>` when an Error is available.
    loadErrorWithReason: (reason: string) =>
      `Failed to load documents: ${reason}`,
    sectionHint:
      "PDF, JPG, or PNG · up to 20 MB each. Picking a file for an occupied slot replaces the document on record.",
    working: "Working…",
    notSavedYet: "— not saved yet",
    uploaded: "uploaded",
    notUploaded: "Not uploaded",
    upload: "Upload",
    replace: "Replace",
    replaceDocument: "Replace document",
    uploadDocument: "Upload document",
    chooseFile: "Choose file",
    saving: "Saving…",
    cancel: "Cancel",
    preview: "Preview",
    download: "Download",
    delete: "Delete",
    // Per-slot accessible action labels (e.g. "Preview PAN Card").
    cancelSelectionFor: (slot: string) => `Cancel file selection for ${slot}`,
    previewFor: (slot: string) => `Preview ${slot}`,
    downloadFor: (slot: string) => `Download ${slot}`,
    replaceFor: (slot: string) => `Replace ${slot}`,
    uploadFor: (slot: string) => `Upload ${slot}`,
    deleteFor: (slot: string) => `Delete ${slot}`,
    deleteTitle: "Delete document?",
    // `"<name>" will be permanently removed. This cannot be undone.`
    deleteConfirm: (name: string) =>
      `"${name}" will be permanently removed. This cannot be undone.`,
  },
  // Inline document preview dialog.
  documentPreview: {
    fallbackTitle: "Preview",
    pdfTitle: "PDF preview",
    loading: "Loading preview…",
    unsupported:
      "This file type can't be previewed in the browser. Use Download to open it locally.",
    download: "Download",
    close: "Close",
  },
  // NOTE: the add/edit-address dialog copy moved to ACCOUNT_CONTACTS_STRINGS.
  // addressDialog (account-contacts.strings.ts) when InlineAddAddressDialog +
  // AddAddressDialog were unified into the single AddressFormDialog.
  delete: {
    title: "Delete account?",
    // Body wraps the account name in <strong>, so it is split into the copy
    // before/after the highlighted name rather than a single string.
    bodyBefore: "This soft-deletes ",
    bodyAfter:
      ". The data remains in the database but is hidden from list/detail queries.",
    cancel: "Cancel",
    confirm: "Delete",
    confirming: "Deleting…",
  },
  toast: {
    created: "Account created",
    createFailed: "Failed to create account",
    updated: "Account updated",
    updateFailed: "Failed to update account",
    childAccountsUpdated: "Child accounts updated",
    childAccountsUpdatedDetail: (parts: string) =>
      `Child accounts updated — ${parts}`,
    childAccountsLinked: (n: number) => `${n} linked`,
    childAccountsUnlinked: (n: number) => `${n} unlinked`,
    childAccountsUpdateFailed: "Failed to update child accounts",
    parentAccountSet: "Parent account updated",
    parentAccountCleared: "Parent account removed",
    parentAccountUpdateFailed: "Failed to update parent account",
    parentAccountPendingApproval:
      "Parent account created and linked — pending approval",
    // Blocked: tried to create/place a sub-account under an account that is
    // itself a child (would create a 3rd level).
    childUnderChildBlocked:
      "You can't add a sub-account to an account that is already a child account.",
    deleted: "Account deleted",
    deleteFailed: "Failed to delete account",
    ownerAdded: "Owner added",
    ownerAddFailed: "Failed to add owner",
    ownerRemoved: "Owner removed",
    ownerRemoveFailed: "Failed to remove owner",
    primaryUpdated: "Primary owner updated",
    primaryUpdateFailed: "Failed to promote primary owner",
    addressAdded: "Address added",
    addressAddFailed: "Failed to add address",
    addressUpdated: "Address updated",
    addressUpdateFailed: "Failed to update address",
    defaultAddressUpdated: "Default address updated",
    defaultAddressFailed: "Failed to set default address",
    addressDeleted: "Address deleted",
    addressDeleteFailed: "Failed to delete address",
    // Address editor (live mode) inline validation + document upload validation.
    addressCoreRequired: "Line 1, city, state, and pincode are required",
    docTypeNotAllowed: "Only PDF, JPG, and PNG files are allowed",
    docTooLarge: "File size must be 20 MB or smaller",
    docSaveFailed: "Failed to save document",
    docReplaceFailed: "Failed to replace document",
    previewFailed: "Failed to load preview",
    fixHighlighted: "Please fix the highlighted fields.",
  },
} as const
