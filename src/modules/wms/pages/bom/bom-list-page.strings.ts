// User-facing copy for the WMS › BOM list page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): breadcrumb labels
// and the search placeholder live here as one typed `as const` object instead of
// being hardcoded ("naked") in JSX. The page imports this single source so copy
// stays consistent and is edited in one place. Titles, stats, tabs, columns, and
// empty-state copy for this page come from the shared `BOM_STRINGS.list` map.
export const BOM_LIST_PAGE_STRINGS = {
  breadcrumbs: {
    wms: 'WMS',
    bom: 'BOM',
  },

  searchPlaceholder: 'Search BOMs by number or name…',
} as const
