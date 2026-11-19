// User-facing copy for the WMS › work-orders › component movement history view.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): title/subtitle,
// stat-card labels, filter placeholders, column headers, and empty-state text
// live here as one typed `as const` object instead of being hardcoded ("naked")
// in JSX. The component imports this single source so copy stays consistent and
// is edited in one place.
export const COMPONENT_MOVEMENT_HISTORY_STRINGS = {
  header: {
    title: 'Component Movement History',
    subtitle: 'Track every install, removal, swap, and transfer.',
  },

  stats: {
    total: 'Total Movements',
    installed: 'Installed',
    removed: 'Removed',
    transfers: 'Transfers',
  },

  filters: {
    searchPlaceholder: 'Search by component name or serial...',
    typePlaceholder: 'Movement Type',
    allTypes: 'All Types',
    fromPlaceholder: 'From',
    toPlaceholder: 'To',
    rangeSeparator: 'to',
  },

  columns: {
    srNo: 'Sr No',
    dateTime: 'Date / Time',
    component: 'Component',
    movementType: 'Movement Type',
    parentPart: 'Parent Part',
    workOrder: 'Work Order',
    fromTo: 'From → To',
    performedBy: 'Performed By',
    verifiedBy: 'Verified By',
    notes: 'Notes',
  },

  empty: 'No movements found.',
} as const
