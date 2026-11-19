// User-facing copy for the IMS › stock sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const STOCK_STRINGS = {
  list: {
    title: "Stock Items",
    tabLabel: (total: number) => `Stock Items (${total})`,
    subtitle:
      "Stock-keeping items with Part nos, variants, and live inventory levels.",
    empty: {
      title: "No stock items yet",
      description: "Stock items appear here once they exist in the inventory.",
    },
    error: {
      title: "Couldn’t load stock items",
      description: "Something went wrong while loading. Please try again.",
    },
  },
  columns: {
    name: "Name",
    description: "Description",
    aliases: "Aliases",
    oem: "OEM",
    category: "Category",
    condition: "Condition",
    price: "Price",
    inOps: "In-Ops",
    allocated: "Reserved",
    available: "Available",
    expected: "Expected",
    onRent: "On Rent",
    installed: "Installed in Device",
  },
  // Header tooltips. Each column now means what its name says — Available is
  // net of Reserved, so no tooltip has to warn the reader off the obvious
  // reading. They explain scope instead: which units, promised to whom, and
  // arriving from where.
  columnHelp: {
    inOps:
      "In the operations pipeline: received but not yet racked — inspection, repair, QC, awaiting rack. Physically here, not sellable yet.",
    allocated:
      "Promised to open documents (demo requests, sales orders). A commitment count, not a physical one.",
    available:
      "Sellable and unpromised: racked, out of the pipeline, minus Reserved. What you can promise to a new order.",
    expected:
      "Inbound on open purchase orders — ordered but not yet received. Not in the building; drafts and cancelled POs are excluded.",
    onRent:
      "Out with rental customers — on rent, on hold or mid-replacement. Not in the building and not sellable until returned.",
    installed:
      "Fitted inside other devices as components. Goes up when a unit is installed and down when it is pulled out. Not on the shelf and not sellable on its own.",
  },
  // Shown wherever a cell has no value — a plain em dash reads better than
  // an empty cell, which looks like a rendering failure.
  emptyCell: "—",
  filters: {
    allOems: "All Brand/OEM",
    searchOems: "Search Brand/OEM…",
    allCategory: "All Category",
  },
  priceChange: {
    // Shown on hover over the change indicator next to a price.
    wasPrefix: "Was",
    onPrefix: "on",
    increased: "Price increased",
    decreased: "Price decreased",
  },
  priceCell: {
    newPriceAriaLabel: "New price",
    savePriceAriaLabel: "Save price",
    saveTitle: "Save (Enter)",
    invalidFallback: "Invalid",
    cancelAriaLabel: "Cancel",
    cancelTitle: "Cancel (Esc)",
    editTitle: "Click to edit price",
  },
} as const;
