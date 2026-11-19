// User-facing copy for the WMS › devices › Assign-to-Rack screen.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): title/subtitle,
// column and tab labels, button labels, placeholders, and empty/error text live
// here as one typed `as const` object instead of being hardcoded ("naked") in
// JSX. The component imports this single source so copy stays consistent and is
// edited in one place.
export const ASSIGN_TO_RACK_STRINGS = {
  header: {
    title: 'Assign to Rack',
    subtitle:
      'QC-passed devices awaiting a warehouse location. Pick an assignable rack or bin to put each unit into stock.',
  },

  stats: {
    awaitingRack: 'Awaiting Rack',
    alreadyInRack: 'Already in Rack',
  },

  columns: {
    partNo: 'Part Number',
    partName: 'Part Name',
    variantName: 'Variant Name',
    category: 'Category',
    grade: 'Grade',
    serial: 'Serial No',
    mfrSerial: 'Mfr Serial',
    warehouse: 'Warehouse',
    received: 'Received',
    actions: 'Actions',
  },

  tabs: {
    queue: 'Awaiting Rack',
  },

  // Grade column badge text.
  gradeBadge: (grade: string) => `Grade ${grade}`,

  rowActions: {
    noAccess: 'No access',
    assignRack: 'Assign Rack',
  },

  table: {
    searchPlaceholder: 'Search by barcode, serial, or part…',
  },

  empty: {
    errorTitle: 'Couldn’t load the queue',
    title: 'Nothing awaiting a rack',
    errorDescription: 'Refresh to try again.',
    description: 'Devices appear here once they pass QC.',
  },
} as const
