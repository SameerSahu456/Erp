export const SCRAP_PLACEMENT_QUEUE_STRINGS = {
  title: 'Scrap Placement',
  subtitle:
    'Condemned devices with no recorded shelf location — assign one to get them findable.',
  searchPlaceholder: 'Search by serial or part…',
  /** An empty cell (no maker serial, warehouse, reason, …). */
  none: '—',
  columns: {
    serial: 'Internal Serial',
    mfrSerial: 'Mfr Serial',
    variant: 'Variant',
    warehouse: 'Warehouse',
    scrappedBy: 'Scrapped By',
    scrappedAt: 'Scrapped At',
    reason: 'Reason',
    actions: 'Actions',
  },
  rowActions: {
    assignLocation: 'Assign Location',
    // The manager's other judgement on this worklist: overrule the engineer
    // rather than shelve the unit (D5/D9).
    unscrap: 'Un-scrap',
    noAccess: '—',
  },
  assignDialog: {
    // Shown only for a condemned unit that holds no warehouse at all — the
    // rack picker needs one before it can list anything.
    warehouseLabel: 'Warehouse',
    warehousePlaceholder: 'Select a warehouse',
    warehouseHelp:
      'This device has no warehouse on record. Choose where it physically is, then pick its shelf.',
    cancel: 'Cancel',
  },
  empty: {
    title: 'No scrapped devices awaiting placement',
    description: 'Every condemned unit already has a shelf. New ones land here the moment an engineer scraps a unit with no location.',
  },
  // A DISTINCT state from empty (PAGE-UI-RULES §0.6 / §1.1) — a 403 rendering
  // as an empty table would tell the store manager there is nothing to do,
  // and they would believe it.
  error: {
    title: "Couldn't load the placement queue",
    description: 'Something went wrong loading this list. Try again.',
    retry: 'Retry',
  },
} as const
