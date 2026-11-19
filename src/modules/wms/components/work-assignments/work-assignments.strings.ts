/**
 * All user-facing copy for work assignments (Coding-guideline §16.12).
 *
 * Single-locale code-quality rule, not i18n — no translation runtime.
 */
export const WORK_ASSIGNMENT_STRINGS = {
  list: {
    title: 'Work Assignments',
    subtitle: 'Devices handed to an engineer, as a document',
    newAction: 'New assignment',
    searchPlaceholder: 'Search by WA number or engineer…',
    stageFilterAll: 'All stages',
    engineerFilterAll: 'All engineers',
    empty: 'No work assignments yet',
    emptyHint: 'Issue a batch of devices to an engineer to get started.',
    error: 'Could not load work assignments',
    tabAll: 'All',
    // "Pending" tab — GRNs whose devices are still waiting to be assigned to an
    // inspection engineer.
    tabPending: 'Pending',
    pendingEmpty: 'No work is pending inspection assignment',
    pendingEmptyHint: 'Devices appear here once a GRN is finalized and inspections are opened.',
    pendingPickWarehouse: 'Select a warehouse from the top bar to see pending inspection work.',
    pendingError: 'Could not load pending work',
  },
  columns: {
    number: 'Number',
    stage: 'Stage',
    issuedTo: 'Issued to',
    issuedBy: 'Issued by',
    issuedAt: 'Issued',
    warehouse: 'Warehouse',
    progress: 'Progress',
    // Pending-tab columns — one row per GRN from the eligible-summary
    // rollup, so the fields differ from a work-assignment row.
    grn: 'GRN',
    received: 'Received',
    parts: 'Parts',
    pending: 'Pending',
    // Per-category rollup columns on the listing table.
    outstanding: 'Outstanding',
    completed: 'Completed',
    withdrawn: 'Withdrawn',
    total: 'Total',
    status: 'Status',
  },
  detail: {
    overview: 'Overview',
    // "Issued to", never "Assigned to": the header is a custody signature and
    // does not move when a line is reassigned (spec D1). Calling it
    // "assigned to" would imply it changes.
    issuedTo: 'Issued to',
    issuedBy: 'Issued by',
    signedFor: 'signed for these devices',
    lines: 'Devices',
    serial: 'Serial',
    srNo: 'Sr No',
    selectAll: 'Select all',
    selectedCount: (n: number) => `${n} selected`,
    added: 'Added',
    currentlyWith: 'Currently with',
    // Search + status filter on the server-side lines table.
    linesSearch: 'Search by serial, part, description or engineer…',
    statusFilterAll: 'All statuses',
    printLabels: 'Print labels',
    printSelected: (n: number) => `Print ${n} label${n === 1 ? '' : 's'}`,
    printJobCard: 'Print job card',
    reassign: 'Reassign',
    withdraw: 'Withdraw',
    withdrawHint: 'Select one or more lines to withdraw',
    close: 'Close',
    cancel: 'Cancel assignment',
    cancelAction: 'Cancel',
    reasonRequired: 'Reason (required)',
    reasonOptional: 'Reason (optional)',
    reasonPlaceholder: 'e.g. Parts unavailable — job cannot proceed',
    // §0.9 — disabled-confirm tooltip naming the empty required reason.
    blockedReason: 'Enter a reason to continue.',
    notFound: 'Work assignment not found',
    loadFailed: "Couldn't load this work assignment. Check your connection and try again.",
    linesEmpty: 'No lines match these filters',
    linesLoadFailed: "Couldn't load this lot's lines",
    closeTitle: 'Close this assignment?',
    closeDescriptionOutstanding: (n: number) =>
      `${n} device${n === 1 ? ' is' : 's are'} still outstanding. Closing is final — there is no reopen — so say why the work stopped short.`,
    closeDescriptionDone: 'All work on this lot has resolved. Closing is final.',
    withdrawTitle: 'Withdraw these devices?',
    withdrawDescription: (n: number) =>
      `${n} device${n === 1 ? '' : 's'} will leave this lot. They stay visible here as history and become available to issue again.`,
    openDevice: 'Open device',
    withdrawnSuccess: (n: number) =>
      `${n} device${n === 1 ? '' : 's'} withdrawn from this lot`,
  },
  issue: {
    workLoadFailed: "Couldn't load the work waiting here. Check your connection and try again.",
    title: 'Issue work',
    scopeTitle: 'Warehouse and stage',
    scopeHint: 'Where the work is issued from.',
    workTitle: 'Work to issue',
    workHint: 'Filter by GRN if you are at a pallet, or take all waiting work.',
    assigneeTitle: 'Assignee and quantity',
    assigneeHint: 'Who takes it, and how many units.',
    stepStage: 'Stage',
    stagePlaceholder: 'Select a stage',
    stepEngineer: 'Engineer',
    stepFilters: 'Filters',
    stepDevices: 'Devices',
    stepReview: 'Review',
    // The engineer is chosen BEFORE the quantity (spec D16) — this count is
    // the only capacity signal there is, and it informs nothing once the
    // number of devices has already been picked.
    outstandingSuffix: 'outstanding',
    noEngineers: 'No engineer at this warehouse holds this stage',
    noEngineersHint:
      'Engineers need a warehouse assignment carrying this capability before work can be issued to them.',
    takeFirst: 'Take first',
    devicesAvailable: 'available',
    noDevices: 'No devices are waiting at this stage',
    // Bulk-received rows are interchangeable, so the LABEL is what binds a row
    // to a machine — and therefore what decides which GRN, PO, supplier and
    // warranty the machine is recorded against (spec §5.6.1).
    grnWarning:
      'Filter to the GRN whose pallet you are at. The label a machine receives decides which PO and warranty it is recorded against, and a mismatch cannot be detected later.',
    confirm: 'Issue devices',
    issuedReadyToPrint: 'Issued. Print the labels before handing the trolley over.',
    stepWarehouse: 'Warehouse',
    stepWork: 'Work waiting',
    grn: 'GRN',
    grnPlaceholder: 'Select a GRN',
    partPlaceholder: 'Select a part',
    allParts: 'All parts',
    pickScopeFirst: 'Choose a GRN — or All GRNs — first.',
    allGrns: 'All GRNs',
    category: 'Category',
    categoryPlaceholder: 'All categories',
    noGrn: 'No GRN',
    waiting: 'waiting',
    part: 'Part',
    qty: 'Qty',
    noWork: 'Nothing is waiting at this stage',
    noWorkHint: 'Devices appear here once a GRN is finalized and inspections are opened.',
    assignTo: 'Assign to',
    engineerPlaceholder: 'Select an engineer',
    howMany: 'How many',
    qtyPlaceholder: '0',
    ofAvailable: (n: number) => `of ${n} available`,
    warehousePlaceholder: 'Select a warehouse',
    warehouseHint: 'A lot is issued at one place, by one team.',
    noWarehouseScope: 'You have no warehouse in scope, so there is nothing to issue from.',
    loading: 'Loading…',
  },
  labels: {
    previewTitle: (n: number) => `${n} label${n === 1 ? '' : 's'}`,
    previewHint:
      'Print from the viewer below, or save the file and print it to the Zebra.',
    download: 'Download',
    done: 'Done',
  },
  states: {
    outstanding: 'Outstanding',
    reassigned: 'Reassigned',
    completed: 'Completed',
    withdrawn: 'Withdrawn',
  },
  progressCard: {
    empty: 'No devices in this assignment yet.',
  },
  devices: {
    grn: 'GRN',
    title: 'Devices',
    serial: 'Serial',
    category: 'Category',
    part: 'Part',
    selectAll: 'Select all shown',
    searchPlaceholder: 'Search by serial, part, description, or GRN…',
    loading: 'Loading devices…',
    empty: 'No devices waiting for this selection.',
    noMatch: 'No devices match your search.',
    hintCount: (n: number) => `Taking the first ${n} — or tick rows to choose exactly.`,
    hintSelected: (n: number) => `${n} device${n === 1 ? '' : 's'} selected — the count is ignored.`,
  },
} as const
