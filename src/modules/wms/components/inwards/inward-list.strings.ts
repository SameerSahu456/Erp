// User-facing copy for the WMS › inwards Inward / GRN list page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the page title,
// subtitle, tab labels, column headers, button labels, placeholders, and
// empty/error text live here as one typed `as const` object instead of being
// hardcoded ("naked") in JSX. The page imports this single source so copy stays
// consistent and is edited in one place.
//
// Enum/status display labels (inward types, GRN statuses) stay in the module
// `constants/` label maps, not here.
export const INWARD_PAGE_STRINGS = {
  page: {
    title: 'Inward / GRN',
    subtitle: 'Incoming device batches — from POs, returns, demos, and transfers.',
    createButton: 'Create Batch',
  },

  columns: {
    batchNumber: 'GRN',
    inwardType: 'Inward Type',
    category: 'Category',
    deviceCount: 'Units',
    warehouse: 'Warehouse',
    receivedBy: 'Received By',
    receivedDate: 'Date',
    status: 'Status',
  },

  tabs: {
    open: 'Draft',
    closed: 'Completed',
    cancelled: 'Cancelled',
    all: 'All Batches',
  },

  search: {
    placeholder: 'Search by GRN number…',
  },

  typeFilter: {
    placeholder: 'All Types',
    searchPlaceholder: 'Search type…',
  },

  categoryPills: {
    summaryLabel: 'Categories',
    hoverTitle: 'Categories',
  },

  empty: {
    errorTitle: 'Couldn’t load batches',
    errorDescription: 'Refresh to try again.',
    title: 'No batches yet',
    description: 'Create an inward batch to register devices arriving at the warehouse.',
  },
} as const
