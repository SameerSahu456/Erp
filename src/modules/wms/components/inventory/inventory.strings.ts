// User-facing copy for the WMS › Inventory sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, and filter option labels live here as one typed
// `as const` object instead of being hardcoded in JSX/hooks.
export const INVENTORY_STRINGS = {
  page: {
    title: 'Inventory',
    subtitle:
      'All devices in stock across warehouses, with filters by status, brand, and category.',
    breadcrumbWms: 'WMS',
    breadcrumbInventory: 'Inventory',
  },
  filters: {
    warehousePlaceholder: 'Warehouse',
    allWarehouses: 'All Warehouses',
    statusPlaceholder: 'Status',
    allStatuses: 'All Statuses',
    brandPlaceholder: 'Brand',
    allBrands: 'All Brands',
    categoryPlaceholder: 'Category',
    allCategories: 'All Categories',
    searchPlaceholder: 'Search barcode / model...',
  },
  table: {
    emptyTitle: 'No Devices Match Your Filters',
    emptyDescription:
      'Try clearing a filter or widening your search to see more devices.',
  },
} as const
