// User-facing copy for the WMS › Spares sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, labels, dialog copy, and toast messages live here as
// one typed `as const` object instead of being hardcoded in JSX/hooks.
// Dynamic copy is expressed as a function member.
export const SPARES_STRINGS = {
  page: {
    title: 'Spares',
    subtitle: 'Spare part requests from inspections and spare-shop inventory.',
    breadcrumbWms: 'WMS',
    breadcrumbSpares: 'Spares',
  },
  sections: {
    requestsHeading: 'Spare Requests',
    inventoryHeading: 'Spare Shop (Inventory)',
    addStockBtn: 'Add Stock',
  },
  requestTable: {
    emptyTitle: 'No Open Spare Requests',
    emptyDescription:
      'Spare requests raised during inspection or repair will appear here.',
    searchPlaceholder: 'Search by device serial, part, variant, SKU, or description…',
    // Variant cell for a request raised by description, before a part is chosen.
    partToBeChosen: 'Part to be chosen',
    actionFulfill: 'Fulfill',
    actionReturn: 'Return',
    actionCancel: 'Cancel',
  },
  inventoryTable: {
    emptyTitle: 'No Spares in Stock',
    emptyDescription: 'Add stock to populate the spare-shop inventory.',
    emptyActionLabel: 'Add Stock',
  },
  fulfillDialog: {
    title: 'Fulfill Spare Request',
    fieldDevice: 'Device',
    fieldModel: 'Model',
    fieldSpare: 'Spare',
    fieldQty: 'Qty',
    notesLabel: 'Notes',
    notesPlaceholder: 'Add any notes about this fulfillment…',
    cancel: 'Cancel',
    submit: 'Submit',
  },
  returnDialog: {
    title: 'Return Spare Units',
    description:
      'Take back units that were not needed or came out of the device. Unused ones go back on the rack; one that may be faulty goes to QC or repair; a dead one is scrapped. The request stays fulfilled — this records what came back, it does not re-open it.',
    unitsHeading: 'Units to return',
    // Where each returned unit goes (backend `send_to`).
    sendToLabel: 'Send to',
    sendTo: {
      stock: 'Stock — unused, back on the rack',
      qc: 'QC — needs checking',
      repair: 'Repair — faulty',
      scrap: 'Scrap — dead',
    },
    locationOptional: 'Where it is parked meanwhile (optional).',
    reasonLabel: 'Reason',
    reasonPlaceholder: 'Pick a reason…',
    reasonHelp:
      'Required. This is the record of why stock re-entered the available pool.',
    notesLabel: 'Notes',
    notesPlaceholder: 'Anything worth recording…',
    notesRequiredHelp: 'Required when the reason is "Other".',
    emptyTitle: 'Nothing Left to Return',
    emptyDescription:
      'Every unit fulfilled against this request is already back in stock.',
    loadError: 'Could not load the units for this request.',
    noWarehouse:
      'This unit has no warehouse on record, so there is nowhere to rack it back to.',
    unitSerialFallback: 'Unit',
    cancel: 'Cancel',
    submit: 'Return',
    submitting: 'Returning…',
    success: 'Spare units returned',
    // Why the Return button is disabled — first unmet data gate (§0.9).
    blocked: {
      noUnits: 'Select at least one unit to return.',
      noLocation: 'Choose a rack location for every unit going back to stock.',
      noReason: 'Select a return reason to continue.',
      noNote: 'Add a note explaining the return reason.',
    },
  },
  // Canonical return reasons. A faulty or dead part is offered now that each
  // unit says where it goes: it is sent to QC, repair or scrap, never straight
  // back into the available pool.
  returnReasons: [
    'Not needed — repair used fewer units',
    'Wrong part picked',
    'Fitted, then removed — not required',
    'Issued in error / duplicate',
    'Faulty — taken out of the device',
    'Other',
  ],
  returnReasonOther: 'Other',
  fitDialog: {
    title: 'Fit in Device',
    description:
      'Record spares that went inside this device as its components (e.g. RAM, SSD). They then show in the Components card, count as installed stock, and can be pulled out later. The request still counts them as fulfilled.',
    unitsHeading: 'Units fitted',
    positionLabel: 'Position (optional)',
    positionPlaceholder: 'e.g. DIMM-A',
    emptyTitle: 'Nothing Left to Fit',
    emptyDescription: 'Every unit fulfilled against this request is already fitted or returned.',
    loadError: 'Could not load the units for this request.',
    unitSerialFallback: 'Unit',
    cancel: 'Cancel',
    submit: 'Fit in Device',
    submitting: 'Recording…',
    noUnits: 'Select at least one unit.',
    success: (n: number) => (n === 1 ? 'Spare recorded inside the device' : `${n} spares recorded inside the device`),
    trigger: 'Fit in device',
  },
  addStockDialog: {
    title: 'Add Stock',
    sparePartLabel: 'Spare Part',
    sparePlaceholder: 'Select spare...',
    // "Current: <n>" is appended at runtime inside the SelectItem
    spareCurrentPrefix: 'Current:',
    quantityLabel: 'Quantity to Add',
    quantityPlaceholder: 'Enter quantity...',
    cancel: 'Cancel',
    addStock: 'Add Stock',
  },
  toast: {
    fulfilled: (spareName: string, deviceBarcode: string) =>
      `Spare "${spareName}" issued for ${deviceBarcode}`,
    addStockValidation: 'Please select a spare and enter a valid quantity.',
    addStockSuccess: (qty: number, name: string) =>
      `Added ${qty} units of "${name}" to stock.`,
  },
  // SparesBody.tsx worklist screen — byte-exact copy for what the component
  // renders today. Added as a fresh self-contained group (§16.12) rather than
  // reusing the older `page` / `sections` / `requestTable` / `inventoryTable`
  // groups above, whose values have drifted from the live component (e.g.
  // `page.subtitle`, `requestTable.emptyTitle`). Those groups are left untouched.
  bodyView: {
    title: 'Spares',
    subtitle:
      'Spare-part requests raised during inspection and repair, plus available spare-shop inventory.',
    inventoryHeading: 'Spare Shop (Inventory)',
    fulfillAction: 'Fulfill',
    cancelRequestAria: 'Cancel spare request',
    requestColumns: {
      device: 'Device',
      part: 'Part',
      variant: 'Variant',
      category: 'Category',
      issuedUnit: 'Issued Unit',
      status: 'Status',
      requestedBy: 'Requested By',
      requestedOn: 'Requested On',
      actions: 'Actions',
    },
    // The "Issued Unit" cell collapses several issued serials into one pill
    // (`<serial> +N`); the hover card lists every serial in full, each a link to
    // its unit's device.
    issuedUnitPills: {
      srNo: 'SR No',
      serial: 'Issued Unit',
      openUnitAria: (serial: string) => `Open device ${serial}`,
    },
    inventoryColumns: {
      part: 'Part',
      variant: 'Variant',
      category: 'Category',
      available: 'Available Qty',
    },
    tabs: {
      pending: 'Pending',
      fulfilled: 'Fulfilled',
      returned: 'Returned',
      cancelled: 'Cancelled',
      inventory: 'Inventory',
    },
    requestsEmpty: {
      noAccessTitle: 'No access to spare requests',
      loadErrorTitle: 'Couldn’t load spare requests',
      emptyTitle: 'No spare requests',
      fulfilledEmptyDescription: 'No fulfilled spare requests yet.',
      cancelledEmptyDescription: 'No cancelled spare requests yet.',
      defaultDescription:
        'Spare requests raised during inspection or repair will appear here.',
    },
    inventoryEmpty: {
      noAccessTitle: 'No access to spares inventory',
      loadErrorTitle: 'Couldn’t load inventory',
      emptyTitle: 'No spares in stock',
      defaultDescription: 'Available spare units appear here as stock is received.',
    },
    cancelDialog: {
      title: 'Cancel Spare Request?',
      description:
        'The request is marked cancelled. Any prior fulfilments are not reversed.',
      confirmLabel: 'Cancel request',
      // A reason is mandatory on the device-detail cancel (recorded on the
      // backend against the request), so the engineer who raised it can see why.
      reasonLabel: 'Reason for cancelling',
      reasonPlaceholder: 'Why is this spare request being cancelled?',
      dismiss: 'Keep request',
      // Reason recorded on the backend when a request is cancelled from this queue.
      defaultReason: 'Cancelled from spares queue',
    },
  },
  // FulfillSpareDialog.tsx — byte-exact copy for the live serial-slot fulfil
  // dialog (name one physical unit per requested quantity). Self-contained new
  // group per §16.12; reuses byte-identical keys that already exist elsewhere in
  // this file (`fulfillDialog.title` / `fulfillDialog.cancel` / `fulfillDialog.fieldQty`
  // and `bodyView.fulfillAction`) rather than duplicating them.
  fulfillDialogView: {
    progress: (fulfilled: number, requested: number, remaining: number) =>
      `${fulfilled}/${requested} fulfilled · ${remaining} to issue`,
    loading: 'Loading available units…',
    noUnits:
      'No available units in stock for this part yet — it can be issued once matching stock is received.',
    serialFieldLabel: 'Units issued',
    chosenCount: (chosen: number, remaining: number, inStock: number) =>
      `${chosen}/${remaining} chosen · ${inStock} in stock`,
    // The headline number once a part is chosen: units that can be issued now
    // (available and not in the ops pipeline), in this warehouse.
    availableHere: (n: number) => (n === 1 ? '1 unit available to issue' : `${n} units available to issue`),
    // Shown on each part in the part dropdown (all warehouses).
    availableInPicker: (n: number) => `${n} available`,
    unitRow: (n: number) => `Unit ${n}`,
    slotPlaceholder: 'Search or scan a serial…',
    slotSearchPlaceholder: 'Search by serial or name…',
    slotEmptyText: 'No matching units.',
    // Why the Fulfill button is disabled — no unit picked yet (§0.9).
    blocked: 'Pick a unit to fulfil this request.',
    blockedNoPart: 'Choose the part this request is being fulfilled with.',
    // Part chooser — the engineer may have described the part instead of
    // picking it, or picked the wrong one; the store manager settles it here.
    askedFor: (description: string) => `Engineer asked for: ${description}`,
    categoryFieldLabel: 'Category',
    partFieldLabel: 'Part',
    partPlaceholder: 'Choose the part to issue…',
    partSearchPlaceholder: 'Search by part number, name or description…',
    categoryFilterPlaceholder: 'All categories',
    partLocked: 'The part cannot be changed once units have been issued against it.',
    unnamedPart: '(unnamed part)',
  },
} as const
