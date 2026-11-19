// User-facing copy for the WMS › BOM › Related Parts page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): breadcrumb labels
// and the search placeholder live here as one typed `as const` object instead of
// being hardcoded ("naked") in JSX. The page imports this single source so copy
// stays consistent and is edited in one place. Titles, stats, tabs, columns, and
// empty-state copy for this page come from the shared `BOM_STRINGS.relatedParts`
// map; enum→label display values stay in the page's `RELATION_LABELS` record.
export const RELATED_PARTS_PAGE_STRINGS = {
  breadcrumbs: {
    wms: 'WMS',
    bom: 'BOM',
    relatedParts: 'Related Parts',
  },

  searchPlaceholder: 'Search by source or related part…',
} as const
