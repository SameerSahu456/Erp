// User-facing copy for the WMS › locations sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and sub-feature
// toast messages live here as one typed `as const` object instead of being
// hardcoded ("naked") in JSX. Components import this single source so copy
// stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const LOCATIONS_STRINGS = {
  // ── LocationFormDialog ──────────────────────────────────────────────
  form: {
    titleEdit: "Edit Location",
    titleNew: "New Location",

    // One-line context under the dialog title.
    descriptionNew: "Add a rack or bin to organise stock in this warehouse.",
    descriptionEdit: "Update this location’s details.",

    // Level (type) picker
    typeLabel: "Storage type",
    rackTitle: "Rack",
    rackSubtitle: "Holds bins, or stores items directly.",
    binTitle: "Bin",
    binSubtitle: "Final stock slot inside a rack.",

    // Name field
    nameLabelRack: "Rack name",
    nameLabelBin: "Bin name",
    namePlaceholderRack: "Rack A — Laptop Shelf",
    namePlaceholderBin: "Bin 1A",
    nameHelpRack: "this warehouse",
    nameHelpBin: "the parent rack",
    nameHelpPrefix: "Must be unique within ",

    // Rack mode picker
    rackModeLabel: "How is stock stored in this rack?",

    // Parent rack (bin only)
    parentRackLabel: "Parent rack",
    parentRackPlaceholder: "Select parent rack",
    parentRackHelp: "Only racks set to “Holds bins” show up here.",

    // Slot mode + capacity
    slotModeLabel: "Storage slots",
    capacityLabel: "Capacity",
    // Number field placeholder — a concrete example value (PAGE-UI §3.1).
    capacityPlaceholder: "0",
    capacityHelpSingle: "Single-slot is always 1.",

    // Description
    descriptionLabel: "Description",
    descriptionPlaceholder: "Optional notes for store team.",

    // Active toggle (edit only)
    activeLabel: "Active",
    activeAriaLabel: "Location is active",
    activeHelp:
      "Inactive locations are hidden from the rack-assignment picker, but existing stock stays put.",

    // Footer buttons
    cancel: "Cancel",
    saving: "Saving…",
    saveChanges: "Save changes",
    createRack: "Add Rack",
    createBin: "Add Bin",

    // Error fallback when the save call throws a non-Error
    saveFailed: "Failed to save location",
  },

  // ── LocationContentsPanel ────────────────────────────────────────────
  contents: {
    searchPlaceholder: "Search part, variant, SKU or serial…",
    columns: {
      partName: "Part name",
      variant: "Variant",
      serial: "Serial no",
      condition: "Condition",
      status: "Status",
    },
    manufacturerSerial: "Mfr: ",
    filters: {
      conditionLabel: "Condition",
      conditionAll: "All conditions",
      statusLabel: "Status",
      statusAll: "All statuses",
    },
    emptyTitle: "No stock items here",
    emptyDescription: "This location is currently empty.",
    errorTitle: "Couldn’t load stock items",
    errorDescription: "Refresh to try again.",
  },

  // ── Rack table rows ──────────────────────────────────────────────────
  rackTable: {
    expandRack: (name: string) => `Show what is in rack ${name}`,
    expandBin: (name: string) => `Show what is in bin ${name}`,
    binSlots: (occupied: number, capacity: number) => `${occupied}/${capacity} slots`,
    slotsFilledAria: (occupied: number, capacity: number) =>
      `${occupied} of ${capacity} slots filled`,
    noBins: "No bins defined in this rack yet.",
    binsLoadError: "Couldn’t load this rack’s bins. Refresh to try again.",
  },

  // ── Row menu ─────────────────────────────────────────────────────────
  rowMenu: {
    ariaLabel: (name: string) => `Actions for ${name}`,
    edit: "Edit",
    delete: "Delete",
  },

  // ── Rack-kind labels ─────────────────────────────────────────────────
  rackKind: {
    directStorage: "Direct storage",
    inactive: "Inactive",
    // `N bins` / `1 bin`
    binCount: (count: number) => `${count} bin${count === 1 ? "" : "s"}`,
    // Shown instead of a percentage when a location holds more than its
    // capacity (occupancy exceeds slots — a data anomaly worth flagging).
    overCapacity: "Over capacity — more units stored than slots",
    overCapacityShort: "Over",
  },

  // ── Delete rack / bin ───────────────────────────────────────────────
  // Button labels + aria, and the confirm-dialog copy. The toast on a 409
  // (occupied / has live child bins) handles the "empty first" recovery path.
  delete: {
    confirmRackTitle: "Delete this rack?",
    confirmRackDescription: (name: string) =>
      `${name} will be removed from this warehouse. This works only when the rack is empty and has no bins — otherwise empty it, remove its bins, or deactivate it first.`,
    confirmBinTitle: "Delete this bin?",
    confirmBinDescription: (name: string) =>
      `${name} will be removed from this rack. This works only when the bin is empty — otherwise move its stock out or deactivate it first.`,
    confirm: "Delete",
    cancel: "Cancel",
  },
} as const
