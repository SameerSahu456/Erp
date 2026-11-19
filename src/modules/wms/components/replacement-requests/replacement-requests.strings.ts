// User-facing copy for the WMS › replacement-requests sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error text, dialog copy, and toast messages live
// here as one typed `as const` object instead of being hardcoded ("naked") in
// JSX/hooks. Components import this single source so copy stays consistent and
// is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const REPLACEMENT_REQUESTS_STRINGS = {
  // Tag on a request raised against a rental order (RentalOrderTag).
  rentalTag: "Rental",
  rentalTagHint: "Raised against a rental order — decided by the rental manager.",
  // List page (ReplacementRequestsBody)
  list: {
    title: "Replacement Requests",
    subtitle:
      "Customer replacements raised against dispatched sales orders. Each line is one physical unit, approved and tracked on its own.",
    breadcrumbs: {
      warehouse: "WMS",
      replacementRequests: "Replacement Requests",
    },
    newRequest: "New Replacement Request",
    searchPlaceholder: "Search by request # or reason…",
    filters: {
      priority: "Priority",
      allPriorities: "All priorities",
      mode: "Replacement Type",
      allModes: "All replacement types",
      salesOrder: "Sales order",
      allSalesOrders: "All sales orders",
      salesOrderSearch: "Search sales orders",
      anyDate: "Any raised date",
    },
    // KPI strip above the table — the four buckets an operator acts on. Each
    // tile is also a shortcut to its status tab.
    stats: {
      pending: "Pending approval",
      inProgress: "In progress",
      completed: "Completed",
      rejected: "Rejected",
    },
    // Tabs are server-side filters on the API's own status values.
    tabs: {
      pending_approval: "Pending approval",
      partially_approved: "Partially approved",
      approved: "Approved",
      in_progress: "In progress",
      completed: "Completed",
      rejected: "Rejected",
      cancelled: "Cancelled",
      all: "All",
    },
    columns: {
      requestNumber: "Request",
      salesOrder: "Sales order",
      customer: "Customer",
      reason: "Reason",
      // One term for the concept everywhere: "Replacement Type" (matches the
      // filter + detail), never "Mode" (§14 one-term-per-concept).
      mode: "Replacement Type",
      priority: "Priority",
      lines: "Units",
      linesHelp: "Approved of total — one line is one physical unit.",
      status: "Status",
      created: "Raised",
    },
    empty: {
      title: "No replacement requests",
      description:
        "Replacements raised against dispatched sales orders appear here.",
      action: "New request",
    },
    error: {
      title: "Could not load replacement requests",
      description: "Try again in a moment.",
      retry: "Try again",
    },
  },

  // Detail page (ReplacementRequestDetailBody)
  detail: {
    breadcrumbs: {
      warehouse: "Warehouse",
      replacementRequests: "Replacement Requests",
    },
    notFound: "Replacement request not found",
    notFoundDescription:
      "It may have been cancelled, or the link is wrong. Head back to the list.",
    // A genuine fetch failure is distinct from a missing record (§12): it gets a
    // Retry, never the "does not exist" copy.
    error: {
      title: "Could not load this replacement request",
      description: "Try again in a moment.",
      retry: "Try again",
    },
    sections: {
      overview: "Overview",
    },
    summary: {
      mode: "Replacement Type",
      priority: "Priority",
      reason: "Reason",
      raised: "Raised",
      raisedBy: "Raised by",
      salesOrder: "Sales order",
      customer: "Customer",
      ticket: "Support ticket",
      issueDate: "Issue date",
      engineer: "Engineer",
      units: "Units",
      description: "Details",
    },
    lines: {
      title: "Units",
      // Count badge beside the Units heading.
      count: (n: number) => `${n} ${n === 1 ? "unit" : "units"}`,
      empty: "No units on this request yet.",
      issueReason: "Issue reason",
      none: "—",
      approvalNote: "Approval note",
      rejectionReason: "Rejection reason",
      waivedReason: "Why it was written off",
      // Clamp toggles on the per-unit reason text.
      showMore: "Show more",
      showLess: "Show less",
      // Table column headers for the scannable per-unit table.
      columns: {
        srNo: "Sr No",
        item: "Item",
        serial: "Serial",
        generation: "Generation",
        decision: "Decision",
        status: "Status",
        substitute: "Substitute",
        actions: "Actions",
      },
      // Expand toggle on each row reveals the full journey, unit pair and
      // provenance without leaving the table.
      expandRow: "Show unit detail",
      collapseRow: "Hide unit detail",
      rowActions: "Unit actions",
      selectAll: "Select all units on this page",
      selectUnit: "Select this unit",
      selectedCount: (n: number) => `${n} selected`,
      // Left-hand context on a group's bulk-approve row.
      groupBulk: (n: number) => `${n} matching units can be approved together`,
      approval: "Decision",
      returnState: "Old unit",
      dispatchState: "Replacement",
      pm: "Product manager",
      unassigned: "Unassigned",
      rate: "Substitute rate",
      delta: "Difference",
      generation: "Unit",
      unknownPart: "Unnamed part",
      // A component line names one part inside the customer's device.
      componentCaption: (where: string) => `Component · ${where}`,
      // In house: what comes to us, and who fits a part shipped back (D15).
      inHouseCaption: (where: string, comesIn: string) => `Component · ${where} · ${comesIn}`,
      fittedBy: (who: string) => `Fitted by: ${who}`,
      // The pin is advisory, so its absence is a normal state, not missing data.
      anyUnit: "Any unit of this model",
      // A component line: the part's own serial sits in the Serial column;
      // the device it is in is named under the part.
      inDevice: (serial: string) => `In device ${serial}`,
      unitSerial: (internal: string, manufacturer?: string | null) =>
        manufacturer ? `Unit ${internal} · ${manufacturer}` : `Unit ${internal}`,
      replacedWith: (part: string, variant?: string | null) =>
        variant ? `Replaced with ${part} · ${variant}` : `Replaced with ${part}`,
      // Inward provenance on the line — which unit actually came back.
      // Same part vs a substitute — the question the decision field answers.
      samePart: "Like-for-like replacement",
      engineerDecides: "The engineer decides after inspecting the device",
      awaitingDecision: "Awaiting decision",
      returnedUnit: "Received back",
      returnedOn: (grn: string) => `on ${grn}`,
      awaitingUnit: "Old unit not received yet",
      // Outward leg — where the replacement unit has got to.
      outwardUnit: "Replacement unit",
      issuedOn: (mi: string) => `Issued on ${mi}`,
      dispatchedOn: (dispatch: string) => `Dispatched on ${dispatch}`,
      notIssuedYet: "Not picked yet",
    },
    actions: {
      approve: "Approve",
      approveGroup: (n: number) => `Approve ${n}`,
      reject: "Reject",
      approveSelected: "Approve",
      rejectSelected: "Reject",
      waive: "Write off return",
      notNeeded: "Mark not needed",
      changeOutcome: "Repair or replace",
      cancel: "Cancel request",
      edit: "Edit",
      reassign: "Reassign approver",
      notYours: "Assigned to another product manager",
    },
    dialogs: {
      // A bulk approve confirms before running, like its sibling reject (§12).
      approveGroupTitle: "Approve these units?",
      approveGroupBody: (n: number) =>
        `${n} unit${n === 1 ? "" : "s"} will be approved for replacement.`,
      approveGroupConfirm: (n: number) => `Approve ${n}`,
      rejectTitle: "Reject this unit",
      rejectSelectedTitle: "Reject the selected units",
      rejectSelectedBody: (n: number) =>
        `The same reason is saved on ${n === 1 ? "this unit" : `all ${n} units`}.`,
      rejectReason: "Why is it rejected?",
      rejectPlaceholder: "e.g. out of warranty",
      waiveTitle: "Write off the outstanding return",
      waiveBody:
        "The customer keeps the old unit and nothing is owed back. The request can then close. This does not let a return-first replacement ship — that still needs the old unit in hand.",
      waiveReason: "Why is nothing coming back?",
      waivePlaceholder: "e.g. not worth collecting",
      cancelTitle: "Cancel this request",
      cancelBody:
        "Only possible while nothing has shipped or arrived. Approved units release their stock reservation.",
      cancelReason: "Reason",
      cancelPlaceholder: "e.g. raised in error",
      confirm: "Confirm",
      // Named confirm buttons per action, never a generic "Confirm" (§9).
      rejectConfirm: "Reject unit",
      rejectSelectedConfirm: "Reject units",
      waiveConfirm: "Write off return",
      cancelConfirm: "Cancel request",
      // Edit the header while the request awaits approval.
      editTitle: "Edit replacement request",
      editBody: "Changes are allowed while the request is awaiting approval.",
      editPriority: "Priority",
      editTicket: "Support ticket",
      editSystem: "Ticket system",
      editDescription: "Details",
      editNotes: "Internal notes",
      editConfirm: "Save changes",
      // Close a component line without a swap (spec D13).
      notNeededTitle: "Mark this part not needed",
      notNeededBody: (part: string) =>
        `${part} will not be replaced. Its reserved part is released. If the device is with us, it still goes back to the customer with the other parts.`,
      notNeededReason: "Reason",
      notNeededNotes: "Notes",
      notNeededNotesPlaceholder: "e.g. tested fine after cleaning the contacts",
      notNeededConfirm: "Mark not needed",
      // Repair or replace an in-house part after inspecting it (spec D15).
      outcomeTitle: "Repair or replace this part",
      outcomeBody: (part: string) =>
        `Choose what happens to ${part}. Choosing a new part sends the line back for approval.`,
      outcomeLabel: "Outcome",
      outcomeRepair: "Repair it and send the same part back",
      outcomeSamePart: "Replace with the same part",
      outcomeDifferentPart: "Replace with a different part",
      outcomeEngineerDecides: "Engineer decides at issue",
      outcomeNewPart: "Replacement part",
      outcomeNewPartPlaceholder: "Choose the replacement part…",
      outcomeRate: "Rate per unit",
      outcomeConfirm: "Save outcome",
      // Reassign a pending line to another approver.
      reassignTitle: "Reassign approver",
      reassignBody: (unit: string) => `Choose who decides ${unit}.`,
      reassignPicker: "New approver",
      reassignLoading: "Loading approvers…",
      reassignNone: "Nobody else can decide this line.",
      reassignLoadFailed: "Could not load the approvers.",
      reassignCurrent: "Current approver",
      reassignSourcePm: "Product manager",
      reassignSourceRental: "Rental manager",
      reassignReason: "Why reassign?",
      reassignPlaceholder: "e.g. PM on leave",
      reassignConfirm: "Reassign",
      dismiss: "Close",
      // §0.9 — disabled-confirm tooltip naming the empty required reason
      // (reject / write-off / cancel all require one).
      blockedReason: "Enter a reason to continue.",
    },
  },

  // Form page (ReplacementRequestFormBody)
  form: {
    title: "New replacement request",
    subtitle:
      "Raised against a dispatched sales order. Each unit is approved, shipped and returned on its own.",
    breadcrumbs: {
      warehouse: "WMS",
      replacementRequests: "Replacement Requests",
      new: "New",
    },
    cancel: "Cancel",
    submit: "Raise request",
    submitting: "Raising…",
    issue: {
      title: "What went wrong",
      sectionDescription:
        "Record why the replacement is needed and how urgent it is.",
      reasonLabel: "Reason",
      reasonPlaceholder: "e.g. Arrived dead on delivery",
      priorityLabel: "Priority",
      priorityPlaceholder: "Select Priority",
      ticketLabel: "Support ticket",
      ticketOptional: "(optional)",
      ticketPlaceholder: "e.g. ZD-12345",
      // Approvals spec D8/D9: may be backdated; a rental unit stops billing from it.
      issueDateLabel: "Issue date",
      issueDateHint: "When the fault was confirmed. A rented unit stops billing from this date.",
      engineerLabel: "Engineer",
      engineerOptional: "(optional)",
      engineerPlaceholder: "Who confirmed the fault",
      engineerSearch: "Search engineers…",
      descriptionLabel: "Details",
      descriptionOptional: "(optional)",
      descriptionPlaceholder: "Anything the product manager should know…",
    },
    mode: {
      title: "How it is handled",
      sectionDescription:
        "Decide whether the replacement ships before or after the old unit returns.",
      normal: "Normal Replacement",
      normalDesc:
        "The old unit must reach the warehouse before the replacement ships.",
      advance: "Advance Replacement",
      advanceDesc:
        "The replacement goes out now; the old unit is chased afterwards.",
      // An in-house part ships the customer's own device or part back.
      advanceUnavailable:
        "Not available when a part comes in to us — their own device or part ships back, so it must arrive first.",
    },
    order: {
      title: "Sales order",
      sectionDescription:
        "The dispatched order the customer is raising a replacement against.",
      // Field label (carries the required asterisk); the card title names the
      // section, this names the control the operator must fill.
      label: "Sales order",
      placeholder: "Search for Dispatched Sales Order",
      searchPlaceholder: "Search order no. or customer…",
      empty: "No orders with units free to replace.",
      helper: "Only orders with at least one unit still free to replace.",
      // Right-aligned count on each order option in the picker.
      unitsEligible: (n: number) => `${n} eligible`,
    },
    units: {
      title: "Units to replace",
      sectionDescription:
        "Choose which delivered units need replacing and how each is handled.",
      pickOrderFirst: "Choose a sales order first.",
      none: "This order has no units free to replace.",
      free: (n: number) => `${n} free`,
      alreadyUnderReplacement: "Already under replacement",
      // A unit migrated from the old rentals system: no dispatch record, so
      // no catalog part and no recorded contents.
      noDispatchRecord: "No dispatch record",
      noDispatchRecordHelp:
        "This unit came from the old rentals system, so its order line names no catalog part. To send the same part again, choose which part it is below.",
      legacyPartLabel: "This unit's catalog part",
      legacyPartPlaceholder: "Choose the part this unit is…",
      noSerial: "No serial",
      // A bucket whose free slots are all taken — by earlier picks here or by
      // an existing variant-level claim that names no specific serial.
      noFreeSlots: "No free units of this model left",
      // Shown once per part when some of its units are already spoken for, so
      // the pick cap is not a mystery once the Free column was removed.
      freeOfTotal: (free: number, total: number) =>
        `${free} of ${total} free — the rest are already under a replacement or return`,
      countLabel: "How many",
      serialsLabel: "Which units",
      // Raised from one device's page: that unit is already chosen.
      lockedNote: "Raised from the unit's page, so this unit is already chosen — fill in what to replace.",
      chooseOther: "Choose other units",
      serialsHelp:
        "Each row is one delivered unit. The serial is recorded as the unit the customer reported — the warehouse may accept a different unit of the same model back, that is not an error.",
      decisionLabel: "Send back",
      samePart: "The same part",
      samePartDesc: "Ship the identical part back out.",
      differentPart: "A different part",
      differentPartDesc: "Substitute a different variant.",
      engineerDecides: "Engineer decides",
      substituteLabel: "Substitute variant",
      substitutePlaceholder: "Choose the substitute part…",
      substituteSearchPlaceholder: "Search by part, SKU, description or OEM…",
      rateLabel: "Rate per unit",
      ratePlaceholder: "0.00",
      returnOwedLabel: "Old unit comes back",
      returnOwedHelp:
        "Turn off when nothing is owed back, for a cheap consumable or goodwill.",
      waiveReasonLabel: "Why nothing is owed back",
      waiveReasonPlaceholder: "e.g. not worth collecting",
      // Component replacement (spec D10a, D14) — asked once per device, then
      // one identical row per part.
      targetLabel: "What needs replacing?",
      wholeDevice: "Whole device",
      partsInside: "Parts inside it",
      swapLabel: "Where is it repaired?",
      swapHelpOnSite: "The new parts ship to the customer; the faulty ones come back.",
      swapHelpInHouse: "It comes in to us, is repaired or replaced, and goes back.",
      // In house: what comes in (spec D15). Inward follows what actually arrives.
      comesInLabel: "What comes to us?",
      comesInDevice: "The whole device",
      comesInPart: "Only the parts",
      comesInHelpDevice: "The device comes in, is repaired and the same device ships back.",
      comesInHelpPart:
        "The customer sends only the faulty parts. Each is repaired or replaced and ships back loose.",
      repairOption: "Repair this part",
      partLabel: "Part",
      partPlaceholder: "Pick a part or type its name…",
      partSearchPlaceholder: "Search the device's parts or type a name",
      partEmpty: "Nothing recorded inside — type the part's name and press Enter.",
      typedOption: (text: string) => `Use “${text}”`,
      typedValue: (text: string) => `${text} (typed)`,
      newPartLabel: "Replacement part",
      newPartPlaceholder: "Choose the replacement part…",
      samePartOption: "Same part",
      addPart: "Add part",
      removePart: "Remove this part",
      // Units table — search, select-all and every per-line control as a column.
      table: {
        searchPlaceholder: "Search part, variant, SKU or serial",
        clearSearch: "Clear search",
        rowCount: (shown: number, total: number) =>
          shown === total
            ? `${total} ${total === 1 ? "item" : "items"}`
            : `${shown} of ${total} items`,
        selectedCount: (n: number) =>
          `${n} ${n === 1 ? "unit" : "units"} selected`,
        noMatch: "No items match your search.",
        selectAllAria: "Select all items shown",
        selectRowAria: (name: string) => `Select ${name}`,
        // Bulk bar — one choice applied to every ticked line.
        bulk: {
          title: (n: number) => `Apply to ${n} selected lines`,
          decisionPlaceholder: "Set send back…",
          reasonPlaceholder: "Issue reason for all selected",
          apply: "Apply",
        },
        issueReasonPlaceholder: "e.g. Fan noise, not powering on",
        none: "—",
        columns: {
          serial: "Serial",
          partVariant: "Part / variant",
          qty: "Qty",
          decision: "Send back",
          issueReason: "Issue reason",
        },
      },
      // One row per physical unit is what the API stores, so say so.
      fanOutHelp: (n: number) =>
        n === 1 ? "Creates 1 line." : `Creates ${n} lines, one per unit or part.`,
    },
  },

  // Toast messages
  toast: {
    allRequiredFields: "Please fill all required fields.",
    validSoAndLineItem: "Please select a valid Sales Order and line item.",
    addAtLeastOnePart: "Add at least one replacement part.",
    positiveQtyAndRate: "Each replacement line needs a positive qty and rate.",
    rejectionReasonRequired: "Please provide a rejection reason.",
    replacementBarcodeRequired: "Please enter the replacement device barcode.",
    // Dynamic toasts
    created: (requestNumber: string, routeMsg: string) =>
      `${requestNumber} created. ${routeMsg}`,
    approved: (requestNumber: string, route: string) =>
      `${requestNumber} approved. ${route}`,
    rejected: (requestNumber: string) => `${requestNumber} rejected`,
    issued: (barcode: string, requestNumber: string) =>
      `Replacement ${barcode} issued for ${requestNumber}`,
    // Route messages after approve
    routePricingUpdate: "Pricing Update — SO line will be amended.",
    routeDispatch: "Dispatch — same part, no pricing change.",
    routeAwaitingDecision: "Awaiting replacement-part decision.",
    // Route messages after create
    routeCreatedDispatch: "Routed to Dispatch (same part).",
    routeCreatedPricingUpdate: "Routed to Pricing Update (different part).",
  },

  // What to do with one line, said the same way wherever a unit's request is
  // shown (GRN page, inspection / repair / QC, device page).
  lineWording: {
    replaceSame: "Replace with the same part",
    replaceUnitSame: "Replace the unit with the same model",
    replaceWith: (part: string) => `Replace with ${part}`,
    replaceDifferent: "Replace with a different part",
    repair: "Repair — the same part goes back",
    engineerDecides: "Engineer decides after inspecting",
    wholeUnit: "Whole unit replaced",
    issue: "Issue",
    unknownPart: "Part",
  },
  // The notice on a unit that is part of an open request (inspection, repair,
  // QC dialogs and the device page) — shown until the request closes.
  unitNotice: {
    title: "Replacement request",
    lead: "Check these parts — what the customer reported and what to do:",
    reason: "Reason",
  },
} as const
