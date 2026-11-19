// User-facing copy for the CRM › shared (cross-sub-feature) components.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and aria labels
// for the components under `components/shared/` live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX. Components
// import this single source so copy stays consistent and is edited in one place.
//
// Grouped by component. Dynamic copy is expressed as a function member.
//
// NOT here: domain enum→label maps (activity type, audit action) — those are
// bucket 2 and live in `activityFeedConfig.tsx` / `auditTrailHelpers.ts`
// alongside their icon/colour config. Zod-style validation messages stay with
// their owners.
export const CRM_SHARED_STRINGS = {
  activityFeed: {
    heading: "Activities",
    loadErrorFallback: "Failed to load activities",
    loadingMore: "Loading more…",
    emptyTitle: "No activities yet",
    emptyDescriptionCanLog: "Log your first activity to start tracking interactions.",
    emptyDescription: "Activities logged on this record will appear here.",
  },
  activityLogDialog: {
    trigger: "Log Activity",
    title: "Log Activity",
    description: "Record a new activity for this record.",
    typeLabel: "Type",
    titleLabel: "Title",
    titlePlaceholder: "Activity title",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Add details...",
    outcomeLabel: "Outcome",
    outcomePlaceholder: "Select outcome (optional)",
    directionLabel: "Direction",
    directionPlaceholder: "Select direction (optional)",
    directionInbound: "Inbound",
    directionOutbound: "Outbound",
    cancel: "Cancel",
    saving: "Saving…",
    save: "Save",
  },
  activityRow: {
    system: "System",
    loading: "Loading…",
    unknown: "(unknown)",
  },
  auditEntry: {
    changedToLabel: "changed to",
    lostReasonLabel: "Lost Reason:",
    hideChanges: "Hide changes",
    showChanges: "Show changes",
    added: "+ added",
    removed: "− removed",
  },
  auditResolvedName: {
    loading: "Loading…",
    unknown: "(unknown)",
    referenceHidden: "(reference hidden)",
    showMore: "Show more",
    showLess: "Show less",
  },
  auditTrail: {
    heading: "Audit Trail",
    filteringComingSoon: "Filtering coming soon",
    forbidden: "Audit trail is restricted to administrators.",
    loadError: "Failed to load audit trail.",
    retry: "Retry",
    loadingAriaLabel: "Loading audit trail",
    loadingMore: "Loading more…",
    empty: "No audit entries found",
  },
  dataTable: {
    noDataAvailable: "No data available",
    srNo: "Sr No",
    loadingData: "Loading data...",
    allColumn: (label: string) => `All ${label}`,
  },
  dataTableEmpty: {
    filteredTitle: "No results match your filters",
    defaultTitle: "No data to show yet",
    filteredDescription:
      "Try clearing the search or adjusting the filters to see more rows.",
    clearFilters: "Clear filters",
  },
  userRoles: {
    // Hover card listing all of a user's roles (same layout as the Categories hover).
    srNo: "SR No",
    columnHeader: "Role",
  },
  filterAside: {
    heading: "Filters",
    close: "Close filters",
    clearAll: "Clear all",
    category: "Category",
    allCategories: "All Categories",
    oem: "OEM",
    allOems: "All OEMs",
    totalMin: "Min",
    totalMax: "Max",
    totalPrefix: "₹",
    totalRangeError: "Max total can't be less than min total",
  },
  listToolbar: {
    clearSearch: "Clear search",
    filters: "Filters",
  },
  tableToolbar: {
    searchPlaceholder: "Search…",
    clearSearch: "Clear search",
  },
  // Search + filters bar shared by the embedded detail-page tabs (Deals / Quotes /
  // Sales Orders) — see EmbeddedListToolbar.
  embeddedToolbar: {
    clearSearch: "Clear search",
    clearFilters: "Clear filters",
  },
  paginationFooter: {
    refreshing: (noun: string) => `Refreshing ${noun}…`,
    showingFrom: "Showing ",
    showingTo: " to ",
    showingOf: " of ",
  },
  listState: {
    loading: (noun: string) => `Loading ${noun} from the API…`,
    loadError: (noun: string) => `Unable to load ${noun}.`,
  },
  picker: {
    loading: "Loading…",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
    noMatches: "No matches",
    loadError: "Failed to load",
    clearSearch: "Clear search",
  },
  lineItemsEditor: {
    heading: "Line Items",
    colItem: "Item",
    colDescription: "Description",
    colQty: "Qty",
    colRate: "Rate (₹)",
    colAmount: "Amount (₹)",
    itemPlaceholder: "Item name",
    descriptionPlaceholder: "Description",
    addLineItem: "Add Line Item",
  },
  lostReasonDialog: {
    title: "Mark as Closed Lost",
    descriptionBefore: "Why is ",
    descriptionAfter: " being marked as lost? This helps track win/loss patterns.",
    reasonLabel: "Lost Reason",
    reasonPlaceholder: "Select a reason",
    notesLabel: "Additional Notes",
    notesPlaceholder: (entityType: string) =>
      `Any additional context about why this ${entityType} was lost...`,
    reasonRequired: "Lost reason is required.",
    fixHighlighted: "Please fix the highlighted fields.",
    cancel: "Cancel",
    confirm: "Mark as Lost",
    impactLoading: "Checking linked orders…",
    impactCancelHeading: "These will be cancelled:",
    impactNothing: "No open sales orders or demo requests will be affected.",
    impactBlockedHeading: "Cannot mark as lost — these orders have already been dispatched:",
    impactBlockedHint: "Return or close them first.",
    impactSalesOrder: (number: string, status: string) => `Sales order ${number} · ${status}`,
    impactDemoRequest: (number: string, status: string) => `Demo request ${number} · ${status}`,
  },
  mentionInput: {
    searchPlaceholder: "Type to search users…",
    loading: "Loading…",
    loadError: "Failed to load users",
    noMatches: "No matches",
    startTyping: "Start typing a name",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
  },
  noteComposer: {
    placeholder: "Write a note…",
    keyboardHint: "Enter to save · Shift+Enter for a new line.",
    adding: "Adding…",
    addNote: "Add Note",
  },
  noteItem: {
    system: "System",
    loading: "Loading…",
    unknown: "Unknown",
    cancel: "Cancel",
    saving: "Saving…",
    save: "Save",
    edited: "edited",
    editAriaLabel: "Edit note",
    deleteAriaLabel: "Delete note",
  },
  notesSection: {
    heading: "Notes",
    loading: "Loading notes…",
    loadError: "Failed to load notes.",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
    emptyTitle: "No notes yet",
    emptyDescription: "Add a note to keep track of important details.",
    // Shown to a read-only viewer (no note-write permission) — doesn't invite
    // an action they can't take.
    emptyDescriptionReadOnly: "Notes added to this record will appear here.",
  },
  partLineFields: {
    partNumberLabel: "Part Number",
    nameLabel: "Name",
    namePlaceholder: "Enter item name",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Add description…",
    clearPartSelection: "Clear part selection",
    // Part-number search dropdown (grid cell) states.
    searchPlaceholder: "Search part number or description…",
    searchLoading: "Loading…",
    searchLoadingMore: "Loading more…",
    searchScrollForMore: "Scroll for more",
    searchTypeToSearch: "Type to search…",
    // Shown when the request itself fails and the API returned no message
    // (a 422 such as "search: String should have at least 2 characters"
    // renders the backend's own text instead).
    searchLoadError: "Could not search parts",
    searchNoMatch: (term: string) => `No parts match “${term}”`,
    // Empty list with no search term: the row's Category / OEM / Condition
    // filters are what excluded everything.
    searchNoneForFilters: "No parts for this category / OEM / condition.",
    searchNoneForFiltersHint: "Clear a filter to widen the search.",
    // Empty list, no search term, no filters — the catalog itself has nothing.
    searchNoneInCatalog: "No parts found.",
    searchNoMatchHint: "Use Part Name to add it as free text.",
    clearPart: "Clear part",
    availableSuffix: "avail",
  },
  totals: {
    subtotal: "Subtotal",
    discount: "Discount",
    taxableAmount: "Taxable Amount",
    tax: "Tax",
    taxWithRate: (rate: number) => `Tax (${rate}%)`,
    grandTotal: "Grand Total",
  },
  totalsSummary: {
    orderSummary: "Order Summary",
    lineItems: "Line Items",
    subtotal: "Subtotal",
    discount: "Discount",
    gst: "GST",
    total: "Total",
    tax: "Tax",
    grandTotal: "Grand total",
  },
  // AsyncUserMultiSelect (shared user picker used by lead/deal/account filters).
  userMultiSelect: {
    searchPlaceholder: "Search users…",
    loadError: "Failed to load users",
    noMatches: "No matches",
    noUsers: "No users",
  },
  accountMultiSelect: {
    searchPlaceholder: "Search accounts…",
    loadError: "Failed to load accounts",
    noMatches: "No matches",
    noAccounts: "No accounts",
  },
  // Toast messages for the shared notes / activities / comments hooks
  // (hooks/shared/useNotes, useActivities, useComments).
  toast: {
    noteAdded: "Note added",
    noteAddFailed: "Failed to add note",
    noteUpdated: "Note updated",
    noteUpdateFailed: "Failed to update note",
    noteDeleted: "Note deleted",
    noteDeleteFailed: "Failed to delete note",
    activityLogged: "Activity logged",
    activityLogFailed: "Failed to log activity",
    commentAdded: "Comment added",
    commentAddFailed: "Failed to add comment",
    commentDeleted: "Comment deleted",
    commentDeleteFailed: "Failed to delete comment",
  },
} as const
