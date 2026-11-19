export const STOCK_TRANSFER_STRINGS = {
  warehouseNameLoading: "…",
  title: "Move Stock",
  // Receipts run to hundreds of units; ticking them individually is not a
  // workflow. Counts the CURRENT filter so "all" after a search means the
  // matches on screen.
  // Over the per-assignment cap: the first `max` are assigned now and the rest
  // kept selected for the next round, rather than rejecting the whole lot.
  relocateOverLimit: (assigned: number, pending: number, max: number) =>
    `${assigned} units assigned. ${pending} pending — at most ${max} units can be assigned at a time. The remaining ${pending} are kept selected; assign them now.`,
  // Crossing warehouses is available-only: a transfer clears the location,
  // flips the unit to in_transit and the destination opens a NEW inspection
  // op, so a mid-pipeline device would end up with two op chains.
  // Moving a mid-pipeline unit is allowed, but its open work does not travel:
  // the op is warehouse-scoped and sits in a named engineer's queue.
  transferRestartsInspection:
    "In progress here — sending it cancels that work; inspection restarts at the destination.",
  transferRestartsInspectionCount: (n: number) =>
    `${n} selected unit(s) are mid-inspection/repair — sending cancels that work and inspection restarts at the destination.`,
  selectAll: (n: number) => `Select all ${n}`,
  clearSelection: (n: number) => `Clear all ${n}`,
  descriptionRelocate:
    "Move units to another rack, bin or pallet in this warehouse.",
  descriptionTransfer:
    "Send units to another warehouse. They will travel and must be received there.",

  sourceWarehouseLabel: "Move from",
  sourceWarehouseHelp:
    "This part has stock in more than one warehouse. Units are moved from one warehouse at a time.",
  destinationWarehouseLabel: "Destination warehouse",
  sameWarehouseOption: "Stay in this warehouse",
  clearDestination: "Clear",
  destinationLocationLabel: "Destination",

  // The consequence banner is the ENTIRE safeguard: because the mode is
  // derived from the destination rather than chosen, nothing else tells the
  // operator that picking a different warehouse starts a two-party workflow.
  consequenceTitle: "These units will leave this warehouse",
  consequenceBody: (warehouse: string) =>
    `They become In Transit and stay unavailable until someone at ${warehouse} receives them. Their destination bin is chosen there, on arrival — not here.`,

  carrierLabel: "Carrier",
  carrierPlaceholder: "Select the carrier",
  carrierOwnVehicle: "Own vehicle",
  carrierCourier: "Courier",
  carrierRoad: "Road transporter",
  carrierAir: "Air",
  carrierRail: "Rail",
  carrierHandDelivery: "Hand delivery",
  vehicleNumberLabel: "Vehicle number",
  vehicleNumberPlaceholder: "e.g. MH12 AB 1234",
  driverNameLabel: "Driver name",
  driverNamePlaceholder: "e.g. Ramesh Kumar",
  driverPhoneLabel: "Driver phone",
  driverPhonePlaceholder: "e.g. 98765 43210",
  courierNameLabel: "Carrier name",
  courierNamePlaceholder: "e.g. Blue Dart, Delhivery",
  docketLabel: "Docket / LR number",
  docketPlaceholder: "e.g. DKT-0045218",
  trackingLabel: "Tracking number",
  expectedDeliveryLabel: "Expected delivery",
  challanNumberLabel: "Challan number (optional)",
  challanNumberPlaceholder: "e.g. CH-2025-0042",
  challanDateLabel: "Challan date (optional)",

  modeSerial: "By serial",
  modeVariant: "By variant",
  searchPlaceholder: "Search by serial, part or SKU…",
  clearSearch: "Clear search",
  // Micro-labels on a unit row so the part and its variant read as two distinct
  // facts, not a repeated value.
  colPart: "Part",
  colVariant: "Variant",
  // Shown on a unit that has no current Rack/Bin (e.g. freshly received). (CP-444)
  unassigned: "Unassigned",
  quantityLabel: "How many?",
  quantityHelp:
    "Oldest units are picked first. The chosen serials are ticked below — uncheck any you do not want.",
  availableCount: (n: number) => `${n} movable`,
  unknownVariant: "Unspecified variant",
  selectedSummary: (n: number) => `${n} selected`,
  emptyUnits: "No units here are available to move.",
  noSearchMatch: "No unit matches that search.",
  notesLabel: "Notes (optional)",
  notesPlaceholder: "e.g. rack re-organisation",
  notesCounter: (used: number, max: number) => `${used}/${max}`,

  cancel: "Cancel",
  submitRelocate: (n: number) =>
    n === 0 ? "Move" : `Move ${n} unit${n === 1 ? "" : "s"}`,
  submitTransfer: (n: number, warehouse: string) =>
    `Send ${n} unit${n === 1 ? "" : "s"} to ${warehouse}`,

  validationNoUnits: "Select at least one unit to move.",
  validationNoDestination: "Choose a destination rack or bin.",
  validationNoVehicle: "Enter the vehicle number.",
  validationNoCarrierMode: "Choose a carrier.",
  validationNoCarrier: "Enter the carrier name and a docket or tracking number.",
  validationNoEta: "Enter the expected delivery date.",
  validationPastEta: "Expected delivery can't be in the past.",
  validationBadPhone: "Driver phone must be 7 to 15 digits.",
} as const;

export const TRANSFERS_PAGE_STRINGS = {
  title: "Warehouse Transfers",
  subtitle: "Stock moving between warehouses.",
  colNumber: "Transfer",
  colRoute: "Route",
  colStatus: "Status",
  colUnits: "Units",
  colDispatched: "Sent",
  colExpected: "Expected",
  overdueBadge: "Overdue",
  searchPlaceholder: "Search by transfer number…",
  filterSent: "Sent date",
  filterExpected: "Expected date",
  sentDatePlaceholder: "Sent: any date",
  expectedDatePlaceholder: "Expected: any date",
  filterAll: "All",
  filterOverdue: "Overdue only",
  empty: "No transfers yet.",
  emptyHelper: "Stock moving between warehouses will appear here.",
  error: "Could not load warehouse transfers.",
  tabAll: "All",
  tabInTransit: "In transit",
  tabOverdue: "Overdue",
  tabReceived: "Received",
  kpiTotal: "Total transfers",
  kpiInTransit: "In transit",
  kpiOverdue: "Overdue",
  kpiReceived: "Received",
  outstanding: (n: number) => `${n} still in transit`,

  receiveTitle: "Receive units",
  receiveHint:
    "Assign arriving units to a storage location or send damaged units for inspection.",
  unitsToReceive: (n: number) => `${n} unit${n === 1 ? "" : "s"} to receive`,
  unitsCount: (n: number) => `${n} units`,
  placeAllShort: "Place all",
  inspection: "Inspection",
  searchUnits: "Search by serial or variant",
  statusPlaceholder: "Status",
  statusAll: "All statuses",
  noUnitsMatch: "No units match these filters.",
  noUnitsMatchHint: "Try clearing the search or the status filter to see more units.",
  clearFilters: "Clear filters",
  colSerialNumber: "Serial number",
  colPartVariant: "Part / Variant",
  colDestRack: "Destination rack / pallet",
  colDestBin: "Destination bin",
  rowActionsAria: (serial: string) => `More actions for ${serial}`,
  assignTitle: "Assign Locations",
  assignDescription: (n: number) =>
    `Place the ${n} selected unit${n === 1 ? "" : "s"} into one rack, bin or pallet in this warehouse.`,
  assign: "Assign",
  place: "Place",
  flag: "Flag for inspection",
  markLost: "Mark lost",
  returnToSource: "Return to source",
  lostConfirmTitle: "Write this unit off?",
  lostConfirmBody: (serial: string) =>
    `${serial} will be recorded as lost in transit and removed from stock. This is an inventory write-off, not a correction.`,
  reasonLabel: "Reason",
  loading: "Loading transfer…",
  notFound: "Transfer not found",
  notFoundHelper: "It may have been cancelled or never existed.",
  sectionOverview: "Transfer overview",
  sentDateLabel: "Sent date",
  expectedArrivalLabel: "Expected arrival",
  unitsInTransitLabel: "Units in transit",
  overdueBy: (days: number) => `by ${days} day${days === 1 ? "" : "s"}`,
  overdueExpected: (date: string) => `Expected on ${date}`,
  sectionConsignment: "Consignment",
  carrierLabel: "Carrier",
  carrierOwnVehicle: "Own vehicle",
  carrierCourier: "Courier",
  carrierRoad: "Road transporter",
  carrierAir: "Air",
  carrierRail: "Rail",
  carrierHandDelivery: "Hand delivery",
  vehicleLabel: "Vehicle",
  driverLabel: "Driver",
  driverPhoneLabel: "Driver phone",
  carrierNameLabel: "Carrier name",
  docketLabel: "Docket / tracking",
  packagesLabel: "Packages",
  colActions: "Actions",
  challanLabel: "Challan",
  pickLocationFirst: "Choose a destination bin first.",
} as const;

export const TRANSFER_DOCUMENTS_STRINGS = {
  title: "Attachments",
  filesCount: (n: number) => `${n} file${n === 1 ? "" : "s"}`,
  hint: "Paperwork that travels with the consignment. Optional — none of it gates the send.",
  slotLabel: "Document type",
  slotChallan: "Delivery challan",
  slotEwayBill: "E-way bill",
  slotPod: "Proof of delivery",
  upload: "Upload",
  empty: "No documents attached yet.",
  remove: "Remove document",
  formats: "PDF, JPG or PNG · up to 20 MB per file",
  tooLarge: "That file is over the 20 MB limit.",
  view: "View",
  openFailed: "Could not open that document.",
  // One summary toast after a batch upload (per-file success is silenced;
  // per-file errors still surface individually).
  uploaded: (n: number) =>
    n === 1 ? "Document uploaded" : `${n} documents uploaded`,
  removeTitle: "Remove this document?",
  removeDescription: (name: string) =>
    `${name} will be deleted from this transfer. The transfer itself is unaffected.`,
  removeConfirm: "Remove",
} as const;

// The full-page Move Stock form (opened from Warehouse Transfers).
export const MOVE_STOCK_PAGE_STRINGS = {
  title: "Move stock",
  listButton: "Move Stock",
  transferTypeLabel: "Warehouse Transfer",
  internal: "Internal Transfer",
  external: "External Transfer",
  // Field labels of the full page (the dialog keeps its own wording).
  fromLabel: "From",
  toLabel: "To",
  challanLabel: "Challan Number",
  expectedDeliveryLabel: "Expected Delivery",
  warehousePlaceholder: "Select a warehouse",
  warehouseSearch: "Search warehouses…",
  unitsTitle: "Units to move",
  unitsHelp: "Select units by variant or by serial number.",
  variantLabel: "Part / variant",
  variantPlaceholder: "Search part or variant",
  variantSearch: "Search by name or SKU…",
  pickSourceFirst: "Choose the warehouse to move from first.",
  pickVariantFirst: "Pick a part or variant to see its units.",
  unitSearch: "Search by variant, barcode",
  selectAll: "Select all",
  quantity: "Quantity",
  quantityPlaceholder: "Enter quantity to select variant",
  movableIn: (count: number, warehouse: string) =>
    warehouse ? `${count} movable in ${warehouse}` : `${count} movable`,
  colBarcode: "Barcode / MFR Sr No",
  colPartVariant: "Part / Variant",
  colCategory: "Category",
  colCondition: "Condition",
  colRackBin: "Rack / Bin",
  noteLabel: "Note (optional)",
  move: "Move",
  unitsSelected: (n: number) => `${n} unit${n === 1 ? "" : "s"} selected`,
  readyInternal: (location: string) => `Ready to move to ${location}`,
  readyExternal: (warehouse: string) => `Ready to send to ${warehouse}`,
  needRack: "Choose a rack or bin",
  needWarehouse: "Choose a destination warehouse",
  validationNoWarehouse: "Choose a destination warehouse.",
} as const;
