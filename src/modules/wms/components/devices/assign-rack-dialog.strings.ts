// User-facing copy for the WMS › devices AssignRackDialog.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): dialog title,
// device-header field labels, form labels, placeholders, empty/loading/error
// text, badge/preview copy, and button labels live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX.
//
// Dynamic copy is expressed as a function member.
export const ASSIGN_RACK_DIALOG_STRINGS = {
  // Dialog chrome
  title: 'Assign to rack',
  cancel: 'Cancel',
  assign: 'Assign',
  // Device header fields
  serialNoLabel: 'Serial No',
  mfrSerialLabel: 'Mfr Serial',
  // Warehouse (read-only) field
  warehouseLabel: 'Warehouse',
  warehouseLoading: 'Loading…',
  // Rack / bin loading + empty states
  loadingRacks: 'Loading rack locations…',
  noRacks: 'No racks at this warehouse. Add a rack in Warehouse Locations first.',
  loadingBins: 'Loading bins…',
  noBins: 'This rack has no bins. Pick another rack.',
  // Rack picker
  rackLabel: 'Rack',
  rackPlaceholder: 'Select a rack…',
  rackHasBins: 'has bins',
  // Bin picker
  binLabel: 'Bin',
  binPlaceholder: 'Select a bin…',
  // At-capacity badge (rack or bin)
  full: 'Full',
  // Selected-slot preview
  selectedLocation: 'Selected location',
  // `<occupancy> used`
  occupancyUsed: (occupancy: string) => `${occupancy} used`,
  pickBin: 'Pick a bin in this rack',
  pickRack: 'Pick a rack to continue',
  // Why the Assign button is disabled — first unmet data gate (§0.9).
  blocked: {
    noRack: 'Choose a rack to assign this device.',
    noBin: 'Choose a bin to assign this device.',
  },
} as const
