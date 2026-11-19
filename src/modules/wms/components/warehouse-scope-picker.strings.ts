// User-facing copy for the WMS navbar warehouse scope picker.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the picker's
// trigger label, search placeholder, aria labels, and empty-state text live here
// as one typed `as const` object instead of being hardcoded ("naked") in the
// component's JSX. The component imports this single source so copy stays
// consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `warehouseCount`).
export const WAREHOUSE_SCOPE_PICKER_STRINGS = {
  // Trigger + "All …" checkbox label; also the count-based summary labels.
  allWarehouses: 'All warehouses',
  oneWarehouse: '1 warehouse',
  warehouseCount: (count: number) => `${count} warehouses`,
  triggerAriaLabel: 'Switch warehouse scope',

  // Search box inside the dropdown.
  search: {
    placeholder: 'Search warehouse…',
    ariaLabel: 'Search warehouse',
    clearAriaLabel: 'Clear search',
  },

  // Empty-state copy for the warehouse list.
  empty: {
    match: 'No warehouses match.',
    none: 'No warehouses.',
  },
} as const
