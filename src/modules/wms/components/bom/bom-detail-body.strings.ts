// User-facing copy for the WMS › BOM detail body component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): loading/error
// text, breadcrumb labels, and card field labels live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX. The component
// imports this single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `componentCard.position`).
export const BOM_DETAIL_BODY_STRINGS = {
  loading: "Loading BOM…",
  loadError: "Couldn’t load this BOM.",

  breadcrumbs: {
    wms: "WMS",
    bom: "BOM",
  },

  componentCard: {
    position: (value: string) => `Position: ${value}`,
  },
} as const
