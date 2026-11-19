// User-facing copy for the WMS › devices › Workflow History card.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the card title,
// empty text, stage/outcome display labels, and every timeline event title +
// detail fragment live here as one typed `as const` object instead of being
// hardcoded ("naked") in the component. Dynamic copy is expressed as a function
// member (see `assignment.reassigned`, `details.routedTo`).
//
// NOT included (correctly sourced elsewhere): workflow event-type codes and
// status values (API enum keys), the imported WORKFLOW_LABELS status map, the
// humanize() transform, and pure separator/placeholder glyphs (· — →).
export const WORKFLOW_HISTORY_CARD_STRINGS = {
  card: {
    title: "Workflow History",
    empty: "No workflow events yet.",
    // Sort toggle — flips the timeline between newest-first (default) and
    // oldest-first (read the device's lifecycle start-to-finish).
    sortNewestFirst: "Newest first",
    sortOldestFirst: "Oldest first",
    sortToggleAria: "Change timeline order",
    // Header above each workflow-cycle partition. A unit that went out and
    // came back through a return reads as separate lifecycles; each cycle
    // group carries this label so the reader can tell them apart.
    cyclePartition: (n: number) => `Cycle ${n}`,
    // Shown at the bottom of the timeline while the next page loads on scroll.
  },

  // Stage display labels (keyed by the API operation_type in the component).
  stages: {
    inspection: "Inspection",
    qc: "QC",
    repair: "Repair",
    vendorService: "Vendor Service",
    rackAssign: "Rack Assign",
  },

  // Completion-outcome display labels (keyed by the API outcome value).
  outcomes: {
    pass: "Passed",
    fail: "Failed",
    na: "N/A",
  },

  // Fallback noun when an event has no humanised action.
  fallback: {
    event: "Event",
  },

  // Assignment change titles ("Inspection engineer reassigned", etc.).
  assignment: {
    engineerWithStage: (stage: string) => `${stage} engineer`,
    engineer: "Engineer",
    reassigned: (who: string) => `${who} reassigned`,
    assigned: (who: string) => `${who} assigned`,
    unassigned: (who: string) => `${who} unassigned`,
    assignmentUpdated: (who: string) => `${who} assignment updated`,
    lotMoved: (from: string, to: string) =>
      `Withdrawn from ${from} · added to ${to}`,
    lotAdded: (to: string) => `Added to ${to}`,
    lotWithdrawn: (from: string) => `Withdrawn from ${from}`,
  },

  // Lifecycle verb fragments fed to the stage-prefixing helper.
  actions: {
    started: "started",
    resumed: "resumed",
    putOnHold: "put on hold",
    failRoutingSet: "fail routing set",
    completed: "completed",
    cancelled: "cancelled",
  },

  // Event titles.
  titles: {
    enteredStage: (stage: string) => `Entered ${stage}`,
    operationCreated: "Operation created",
    readyForQc: "Ready for QC",
    escalatedL3: "Escalated to L3 repair",
    waitingSpares: "Waiting for spares",
    sparesArrived: "Spares arrived",
    conditionOverridden: "Condition overridden",
    sentToVendorNamed: (vendor: string) => `Sent to vendor — ${vendor}`,
    sentToVendor: "Sent to vendor",
    returnedFromVendor: "Returned from paint vendor",
    paintCompleted: "Paint completed",
    componentAdded: "Component added",
    componentRemoved: "Component removed",
    // Fitted or pulled while issuing — the Material Issue is named alongside.
    componentAddedOnIssue: "Component added during material issue",
    componentRemovedOnIssue: "Component removed during material issue",
    // A part that left the device for a replacement request.
    componentSentForRepair: "Component sent to us for repair",
    componentReplacedOnSite: "Component replaced at the customer's site",
    replacementRequested: "Replacement requested",
    // A step of one of the device's parts while it was away for a replacement.
    forPart: (part: string, title: string) => `${part}: ${title}`,
    // Device-page corrections (device-page-corrections C3–C6).
    componentMissing: "Component marked missing",
    componentAddedBack: "Component added back",
    componentPutBack: "Pulled component put back",
    componentAddUndone: "Component removed — added by mistake",
    // The same two acts seen from the COMPONENT's side. On a part's own
    // timeline "Component added" would read as though something went
    // into the part, so each side gets its own wording.
    installedIntoDevice: "Installed into a device",
    installedIntoDeviceOnIssue: "Installed into a device during material issue",
    issuedOnMaterialIssue: "Issued on material issue",
    // A replacement issue names the part it stands in for: "Issued on material
    // issue" is true of every issue and tells an operator holding the device
    // nothing about why this one left.
    issuedAsReplacementFor: (part: string) =>
      `Issued as a replacement for ${part}`,
    issuedAsReplacement: "Issued as a replacement",
    dispatchCreated: "Dispatch request created",
    dispatched: "Dispatched",
    delivered: "Delivered",
    pulledOutIntoStock: "Pulled out into stock",
    spareRequested: "Spare requested",
    spareOrdered: "Spare ordered",
    spareFulfilled: "Spare fulfilled",
    consumedAsSpare: "Consumed as spare",
    spareReturnedToStock: "Spare returned to stock",
    returnedToStock: "Returned to stock",
    spareCancelled: "Spare cancelled",
    raisedForVendorReturn: "Raised for vendor return",
    returnRejected: "Return rejected",
    returnCancelled: "Return cancelled",
    returnedToVendor: "Returned to vendor",
    recalledFromVendor: "Vendor dispatch recalled",
    // Replacement-return provenance: the order/customer it came back from, or a
    // bare fallback when neither is on the event.
    returnedFrom: (from: string) => `Returned from ${from}`,
    returnedOnReplacement: "Returned on a replacement",
    returnedOnSale: "Returned on a sales return",
    returnedOnDemo: "Returned on a demo return",
    returnedOnStaff: "Returned on a staff return",
    transferSent: "Sent on Warehouse Transfer",
    transferReceived: "Received at Warehouse",
    transferReturnedToSource: "Returned to Source Warehouse",
    relocated: "Relocated",
    // device-scrap D10. The three stages of a write-off, each synthesized from
    // its stock_movements row because none has an operation.
    scrapped: "Scrapped — condemned",
    unscrapped: "Scrap reversed",
    disposed: "Disposed — written off",
    stockAdjustmentAdded: "Added by stock adjustment",
    stockAdjustmentRestored: "Restored by stock adjustment",
    stockAdjustmentRemoved: "Removed by stock adjustment",
    materialReturned: "Returned to stock",
    workAssignmentIssued: "Issued for work",
    workAssignmentWithdrawn: "Withdrawn from work assignment",
    // Manufacturer serial captured for the first time vs corrected afterwards.
    serialRecorded: "Serial number recorded",
    serialCorrected: "Serial number corrected",
    partReidentified: "Part re-identified",
  },

  // Event detail fragments.
  details: {
    // Only when the replacement part differs from the failed one — the
    // customer is not getting back the part they had, which is worth saying.
    substitutedWith: (part: string) => `substituted with ${part}`,
    // Manufacturer-serial change line: "Mfr. serial: OLD → NEW" (or a single
    // value on a first-time record). Names which serial the title refers to.
    mfrSerial: (change: string) => `Mfr. serial: ${change}`,
    // Why a serial was changed — captured on the correction and worth showing.
    reason: (r: string) => `Reason: ${r}`,
    // The vendor-job item — the sub-type (e.g. "Back Panel") — so a vendor
    // history line reads its Type (the stage) plus this sub-type (CP-362 #3).
    vendorItem: (item: string) => `Item: ${item}`,
    panelsOk: "Panels OK",
    panelsNotOk: "Panels not OK",
    awb: (track: string) => `AWB ${track}`,
    toLocation: (loc: string) => `to ${loc}`,
    consumed: (serials: string) => `Consumed ${serials}`,
    routedTo: (dest: string) => `routed to ${dest}`,
    backTo: (dest: string) => `Back to ${dest}`,
    // Where a unit was shelved on rack-assign — "Rack A → Bin 3" or "Pallet P1".
    assignedTo: (slot: string) => `Assigned to ${slot}`,
    // Source slot a part was taken from ("fitted from Rack A → Bin 3").
    fromLocation: (loc: string) => `from ${loc}`,
    // Destination slot for a returned unit ("Returned to stock at Rack A → Bin 3").
    atLocation: (loc: string) => `at ${loc}`,
    atPosition: (pos: string) => `position ${pos}`,
    // Where a part fitted on an issue went out, and the request it served.
    shippedOn: (dispatch: string) => `shipped on ${dispatch}`,
    forRequest: (request: string) => `for ${request}`,
    // One line of a replacement request, as the device history words it.
    replacementLine: (part: string, outcome: string, where: string | null) =>
      where ? `${part} — ${outcome} (${where})` : `${part} — ${outcome}`,
    wholeUnit: "Whole unit",
    replacementOutcome: {
      repair: "repair",
      same_part: "replace with the same part",
      different_part: "replace with a different part",
      to_be_decided: "engineer to decide",
    } as Record<string, string>,
    replaceWith: (part: string) => `replace with ${part}`,
    replacementWhere: {
      on_site: "at the customer's site",
      device: "device comes to us",
      part: "part comes to us",
    } as Record<string, string>,
    requestStatus: (status: string) => `Request ${status}`,
    // Where a pulled part went (the pull's choice): QC, repair or scrap.
    pulledTo: {
      available: "sent to QC",
      repair: "sent to repair",
      scrap: "scrapped",
    } as Record<string, string>,
  },
} as const;
