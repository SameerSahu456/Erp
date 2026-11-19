// User-facing copy for the WMS › warehouses › warehouse detail page.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the page title,
// button labels, info card, storage summary, rack table and empty/error state
// copy live here as one typed `as const` object instead of being hardcoded
// ("naked") in JSX. The components import this single source so copy stays
// consistent and is edited in one place.
export const WAREHOUSE_LOCATIONS_STRINGS = {
  header: {
    fallbackTitle: "Warehouse",
    statusActive: "Active",
    statusInactive: "Inactive",
    editButton: "Edit",
    addRackBinButton: "Add Rack / Bin",
    subtitle: (code: string, createdOn: string) => `${code} · Created on ${createdOn}`,
  },

  info: {
    address: "Address",
    conditions: "Conditions",
    categories: "Eligible categories",
    description: "Description",
  },

  summary: {
    racks: "Racks",
    bins: "Bins",
    pallets: "Pallets",
    utilisation: "Utilisation",
    occupiedSlots: "Slots occupied",
    totalSlots: "Total slots",
    availableSlots: "Available slots",
    donutAria: (share: string) => `${share} of storage slots occupied`,
    errorTitle: "Couldn’t load the storage summary",
    errorDescription: "Refresh to try again.",
  },

  tabs: {
    racksAndBins: "Rack and Bin",
    team: "Team Members",
  },

  racks: {
    searchPlaceholder: "Search racks or bins by name…",
    columns: {
      name: "Name",
      storageSlots: "Storage slots",
      occupied: "Occupied",
      utilisation: "Utilisation",
    },
    filters: {
      typeLabel: "Type",
      typeAll: "All types",
      typeDirect: "Direct storage",
      typeWithBins: "Holds bins",
    },
  },

  states: {
    warehouseErrorTitle: "Couldn’t load this warehouse",
    warehouseErrorDescription:
      "It may have been removed, or the connection dropped. Refresh to try again.",
    racksErrorTitle: "Couldn’t load racks",
    racksErrorDescription:
      "The rack and bin layout for this warehouse failed to load. Refresh to try again.",
    noRacksTitle: "No racks defined yet",
    noRacksDescription:
      "Create a rack or bin to start organising stock in this warehouse. You can add racks that hold bins, or racks that store items directly.",
    noRacksReadOnlyDescription:
      "Racks and bins for this warehouse will appear here once they’re set up.",
    noMatchesTitle: "No racks match your filters",
    noMatchesDescription: "Try a different search or clear the filters.",
    // Retry action on the load-error states.
    retry: "Retry",
  },
} as const;
