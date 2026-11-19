// User-facing copy for the WMS › Material Issue sub-feature (outward pipeline
// slice A). Coding-guideline §16.12 (bucket 1): titles, labels, empty/error/
// loading text, dialog + toast copy live here as one typed `as const` object
// instead of being hardcoded in JSX. Dynamic copy is expressed as functions.

export const MATERIAL_ISSUE_STRINGS = {
  // Live character counter shown under a capped Textarea (§9). Shared so every
  // note/reason field reads the same "x/500".
  charCount: (n: number, max: number) => `${n}/${max}`,
  list: {
    title: "Material Issue",
    subtitle:
      "Issue material to an engineer against a sales order, demo, or replacement — scan serials, then confirm to move stock.",
    breadcrumbs: { wms: "WMS", materialIssue: "Material Issue" },
    newButton: "New Material Issue",
    search: {
      placeholder: "Search by Material Issue number…",
    },
    stats: {
      draft: "Draft",
      issued: "Issued",
      cancelled: "Cancelled",
    },
    columns: {
      miNumber: "Issue No",
      issueType: "Type",
      source: "Source Doc",
      ticket: "Ticket",
      warehouse: "Warehouse",
      issuedTo: "Issued To",
      lines: "Lines",
      createdAt: "Created",
      status: "Status",
    },
    filters: {
      issueType: "Type",
      warehouse: "Warehouse",
      allTypes: "All types",
      allWarehouses: "All warehouses",
    },
    empty: {
      title: "No Material Issues Yet",
      description:
        "Material issued to engineers against a demand document appears here.",
    },
    error: {
      title: "Couldn’t Load Material Issues",
      description: "Something went wrong fetching the list. Try again.",
    },
  },

  detail: {
    breadcrumbs: { wms: "WMS", materialIssue: "Material Issue" },
    loading: "Loading…",
    notFound: "Material issue not found.",
    showAll: "Show all",
    collapseAll: "Collapse all",
    sections: {
      overview: "Overview",
      lines: "Line Items",
      units: "Units",
      pullOuts: "Pulled-Out Parts",
    },
    pullOuts: {
      part: "Part",
      serial: "Serial",
      pulledFrom: "Pulled From",
      location: "Location",
      date: "Date",
    },
    fields: {
      issueType: "Type",
      source: "Source Document",
      warehouse: "Warehouse",
      issuedTo: "Assign To",
      issuedBy: "Issued By",
      issuedAt: "Issued At",
      externalTicket: "External Ticket",
      notes: "Notes",
      createdAt: "Created At",
    },
    line: {
      primary: "Primary",
      component: "Component",
      substitute: "Substitute",
      // Shown in full on the detail line, not just as a badge — the operator's
      // own reason stays in the badge tooltip.
      substituteHint: "Substitute — differs from the ordered variant.",
      substitutionReason: "Substitution reason",
      serialSource: { scanned: "Scanned", auto_picked: "Auto-picked" },
      // Collapsed accordion meta reads "<sku>  Qty 1  <serial>" — no field
      // labels (a line IS one unit, so qty is always 1).
      qtyLabel: "Qty 1",
    },
    actions: {
      edit: "Edit Draft",
      issue: "Issue",
      cancel: "Cancel",
      return: "Return Units",
      outwardQc: "Outward QC",
      rerunQc: "Re-run QC",
      viewDevice: "View device",
      sendToDispatch: "Send to Dispatch",
    },
    empty: {
      lines: "No line items on this issue.",
    },
  },

  issueDialog: {
    title: "Issue This Material?",
    body: "Confirming moves stock out of the warehouse and hands it to the engineer. Every scanned unit is checked for availability — this cannot be undone.",
    confirm: "Issue",
    cancel: "Keep as Draft",
  },

  cancelDialog: {
    title: "Cancel This Draft?",
    body: "The draft and all its scanned units are voided. No stock was held, so nothing is unwound.",
    confirm: "Cancel Draft",
    cancel: "Keep Draft",
  },

  returnDialog: {
    title: "Return Units to Stock",
    subtitle:
      "Return issued units back into inventory — a whole primary, or just one of its components. Each returning unit gets its own destination — pick a location for each.",
    unitsLabel: "Units",
    reason: "Reason",
    reasonPlaceholder: "Why is this being returned?",
    reasonCount: (n: number, max: number) => `${n}/${max}`,
    locationLabel: "Location",
    locationPlaceholder: "Pick a location",
    submit: "Return Units",
    cancel: "Cancel",
    emptyEntries: "No issued units are available to return.",
    cascadeNote:
      "Returning this unit also returns its issued components — the machine is stripped, so pick a location for each.",
    componentsLabel: "Components (auto-included)",
    // Why-tooltips (§0.9) naming the unmet gate on the disabled Return button.
    noUnitsSelected: "Tick at least one unit to return.",
    reasonRequired: "Add a return reason.",
    locationsRequired: "Pick a return location for every unit.",
  },

  componentsTabs: {
    added: "Added Components",
    removed: "Removed Components",
    returned: "Returned Components",
    outwardQc: "Outward QC",
    searchPlaceholder: "Search components…",
    empty: "Nothing here yet.",
    noMatches: "No components match your search.",
    clearSearch: "Clear search",
    loading: "Loading…",
    colComponent: "Component",
    colVariant: "Variant Name",
    colSerial: "Serial number",
    colRack: "Rack / Pallet",
    colBin: "Bin",
    colNote: "Note",
    colDate: "Date",
    page: (a: number, b: number) => `Page ${a} of ${b}`,
    prev: "Previous page",
    next: "Next page",
  },

  removedComponents: {
    title: "Removed Components",
    empty: "No components removed.",
    itemsCount: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    colComponent: "Component",
    colSerial: "Serial number",
    colRack: "Rack / Pallet",
    colBin: "Bin",
    colNote: "Note",
    colDate: "Date",
  },

  returnedUnits: {
    title: "Returned Units",
    itemsCount: (n: number) => `${n} unit${n === 1 ? "" : "s"}`,
    colComponent: "Component",
    colSerial: "Serial number",
    colRack: "Rack / Pallet",
    colBin: "Bin",
    colNote: "Note",
    colDate: "Date",
  },

  returnWorkspace: {
    start: "Return units",
    cancel: "Cancel",
    submit: "Return",
    submitCount: (n: number) => `Return ${n} unit${n === 1 ? "" : "s"}`,
    dialogTitle: (n: number) =>
      `Return ${n} Unit${n === 1 ? "" : "s"} to Stock`,
    confirmBody: (n: number) =>
      `${n} unit${n === 1 ? "" : "s"} will go back into stock at the locations you picked. This can't be undone.`,
    noteLabel: "Note (optional)",
    notePlaceholder: "Why is this unit coming back?",
    noteCount: (n: number, max: number) => `${n}/${max}`,
    // The re-test question, asked per unit at the point of return. The help
    // text states the CONSEQUENCE either way, because "send to QC" alone does
    // not tell the operator that the unit stops being sellable meanwhile.
    sendToQcLabel: "Send to QC before it goes back on sale",
    sendToQcOnHelp:
      "It will land on the QC queue and stay unsellable until it passes.",
    sendToQcOffHelp:
      "It goes straight back into available stock, ready to issue again.",
    locationPlaceholder: "Pick a location",
    componentsHeading: "Components",
    machineCascade: "come back with the machine",
    notReturnable: "This machine isn't in a returnable state.",
    barCount: (n: number) => `${n} unit${n === 1 ? "" : "s"} to return`,
    missingLocations: (n: number) =>
      `${n} still ${n === 1 ? "needs" : "need"} a location`,
    // Why-tooltip (§0.9) when the Return button is disabled with nothing ticked.
    noUnitsSelected: "Tick at least one unit to return.",
  },

  form: {
    createTitle: "New Material Issue",
    editTitle: "Edit Material Issue",
    createSubtitle:
      "Pick a demand document, scan the units being handed out, then save the draft.",
    editSubtitle:
      "Update the engineer, ticket, notes, or staged units on this draft, then save.",
    breadcrumbs: { wms: "WMS", materialIssue: "Material Issue", new: "New" },
    header: {
      section: "Details",
      issueType: "Issue Type",
      sourceDoc: "Source Document",
      sourceDocPlaceholder: "Search a document…",
      // Per issue type, so the search box names the document it looks in.
      // Keyed by the wired issue type; falls back to the generic string above.
      sourceDocPlaceholderByType: {
        sale_issue: "Search sales order no. or customer…",
        demo_issue: "Search demo request no. or customer…",
        replacement_issue: "Search replacement no. or customer…",
      } as Record<string, string>,
      warehouse: "Issuing Warehouse",
      warehousePlaceholder: "Select warehouse",
      issuedTo: "Issued To (Engineer)",
      issuedToPlaceholder: "Select engineer",
      issuedToNeedsWarehouse: "Select a warehouse first",
      externalTicket: "External Ticket No.",
      externalTicketPlaceholder: "e.g. TCK-10432 (optional)",
      notes: "Notes",
      notesPlaceholder: "Optional notes…",
      // Live character counter on max-length fields (§9).
      counter: (n: number, max: number) => `${n}/${max}`,
      // Why-tooltip on an issue type that has no backend flow yet (§0.14).
      comingSoon: "This issue type isn’t available yet.",
    },
    lines: {
      section: "Line Items",
      pickSourceFirst: "Pick a source document to load its demand lines.",
      selectWarehouseFirst:
        "Select an issuing warehouse to load available units for each line.",
      linesLoading: "Loading the document’s lines…",
      linesError: "Couldn’t load this document’s lines. Try again.",
      noDemandLines: "This document has no lines to issue.",
      allIssued: "Every line on this document is already fully issued.",
      candidatesTitle: "Demand Lines",
      addLineItem: "Add line item",
      addAnotherLine: "Add another line (extra unit / re-add)",
      addLinePlaceholder: "Select a demand line…",
      addLine: "Add line",
      allAdded: "All demand lines with pending quantity have been added.",
      colPart: "Part",
      colSerial: "Serial",
      colQty: "Qty",
      // No part chosen yet: scan the unit and the part fills itself in.
      scanAnyPlaceholder: "Scan or type a serial…",
      scanAnySearchPlaceholder: "Scan a serial — its part fills in",
      scanAnyEmpty: "Scan or type the unit's exact serial.",
      serialScanPlaceholder: "Scan or enter serial",
      serialOptionalPlaceholder: "Serial (optional — locks qty to 1)",
      serialRequired: "Serial required for a serialized part.",
      duplicateSerial: (s: string) =>
        `Serial "${s}" is entered more than once — each serial can only be issued once.`,
      duplicateSerialField: (s: string) => `Duplicate serial "${s}"`,
      variant: "Variant to issue",
      variantPlaceholder: "Pick or scan a part…",
      variantSearchPlaceholder: "Search or scan part code, or type a description…",
      variantEmpty: "No matching part.",
      // Shown under a unit whose components still wait to be checked (D8).
      componentsUnchecked: "Components not checked yet",
      unitPlaceholder: "Pick or scan a unit…",
      unitSearchPlaceholder: "Search or scan a serial…",
      unitEmpty: "No available unit for this variant here.",
      searching: "Searching…",
      useTypedSerial: (v: string) => `Use serial “${v}”`,
      variantRequired: "Pick a variant to issue for each selected line.",
      substituteHint: "Substitute — differs from the ordered variant.",
      quantity: "Qty",
      ordered: "Ordered",
      issued: "Issued",
      pending: "Pending",
      availableHere: "available here",
      unnamedLine: "Unnamed line",
      showMore: "Show more",
      showLess: "Show less",
      fullyIssued: "Fully issued — nothing pending.",
      serials: "Serial",
      serialPlaceholder: "Scan or type a serial…",
      unitSerialPlaceholder: "Scan the unit’s serial…",
      addSerial: "Add",
      unit: "Unit",
      addUnit: "Add unit",
      noUnits: "Add a unit to issue against this line.",
      unitSerialRequired: "Scan a serial for every unit.",
      exceedsPending: "Can’t issue more than the pending quantity.",
      qtyRequired: "Enter a quantity of at least 1 for each line.",
      substitutionReason: "Substitution reason",
      substitutionRequired:
        "Required — the scanned variant differs from the demand line.",
      // Real-example placeholder for the reason Textarea (§3.1: never the
      // validation sentence). The "required" copy above stays the inline error.
      substitutionReasonPlaceholder: "e.g. Original variant out of stock",
      // Replacement lines: which unit to issue (the demand line's suggested unit).
      suggestedUnitReason: "Customer's own unit, returned and repaired",
      mustIssueUnit: (serial: string) =>
        `Issue the customer's own unit ${serial}. This line accepts only that unit.`,
      suggestedUnit: (serial: string) =>
        `The customer's returned unit ${serial} is repaired and ready. Issue it first; another unit is fine if needed.`,
      suggestedUnitElsewhere: (serial: string) =>
        `The customer's unit ${serial} is in another warehouse. Issue from that warehouse to send it back.`,
      useSuggestedUnit: "Use this unit",
      untrackedHint:
        "Quantity — units are auto-picked at issue. Add serials below only if you want to pin specific units.",
      serialsOptional: "Serials (optional)",
      serialsExceedQty: "Serials can’t exceed the quantity.",
      trackedHint: "Serialized — one row per unit, each with its own serial.",
      components: "Components (fitted into this unit)",
      componentsBulk: "Components (fitted into this line)",
      addComponent: "Add component",
      noComponents: "No components added.",
      componentVariantRequired: "Pick a variant for each component.",
      componentSerialRequired: "Scan a serial for each serialized component.",
      remove: "Remove",
      emptySelected: "No lines added yet.",
    },
    bom: {
      section: "Build Components",
      add: "Add component",
      addHint: "Add parts fitted into this build (optional).",
      remove: "Remove",
      empty: "No components added.",
    },
    footer: {
      saveDraft: "Save Draft",
      saveChanges: "Save Changes",
      saveAndIssue: "Save & Issue",
      saving: "Saving…",
      cancel: "Cancel",
    },
    editLoading: "Loading draft…",
    editLocked: "This material issue is no longer a draft — it can’t be edited.",
    editLoadFailed: "Couldn't load this material issue. Check your connection and try again.",
    existingTitle: "On This Draft",
    existingUnits: (n: number) => `${n} unit${n === 1 ? "" : "s"}`,
    existingComponents: (n: number) =>
      `${n} component${n === 1 ? "" : "s"}`,
    validation: {
      sourceRequired: "Pick a source document.",
      warehouseRequired: "Pick the issuing warehouse.",
      issuedToRequired: "Pick the engineer receiving the material.",
      linesRequired: "Add at least one line item.",
      unitNotAvailable: "Currently not available in this warehouse.",
      checkForm: "Check the form for errors.",
    },
  },

  // Friendly messages for backend WMSErrorCode.MI_* codes (shown on mutation
  // failure). `default` covers anything unmapped.
  errors: {
    default: "Something went wrong. Please try again.",
    MI_PULLOUT_COMPONENT_NOT_IN_UNIT:
      "That part is no longer recorded inside this unit — refresh and pick again.",
    COMPONENT_ALREADY_REMOVED: "That part has already been taken out.",
    MI_UNIT_NOT_AVAILABLE:
      "That serial isn’t in available stock — pick a listed unit, or register the stock first.",
    // The unit is fitted inside another device: name the next step.
    DEVICE_IS_INSTALLED_PULL_OUT_FIRST:
      "That part is installed inside another device. Pull it out from that device’s Components card first.",
    MI_SHORTFALL_ON_TRACKED_LINE:
      "Not enough available units in stock to cover this serialized line.",
    MI_DUPLICATE_SERIAL_IN_DOCUMENT:
      "That serial is already on this material issue.",
    MI_SUBSTITUTION_REASON_REQUIRED:
      "Add a substitution reason — the chosen variant differs from the ordered one.",
    MI_QTY_BELOW_SCANNED_UNITS:
      "Quantity can’t be below the number of scanned serials.",
    MI_SOURCE_LINE_MISMATCH:
      "That line doesn’t belong to the selected source document.",
    MI_NOT_DRAFT: "This material issue is no longer a draft.",
    MI_NOT_ISSUED: "This material issue isn’t in the issued state.",
    MI_RETURN_QTY_EXCEEDS_ISSUED:
      "Return quantity is more than what was issued.",
    MI_RETURN_LOCATION_WRONG_WAREHOUSE:
      "Pick a return location inside the issuing warehouse.",
    MI_RETURN_LOCATION_CANNOT_STORE_STOCK:
      "That location can’t store stock — pick a bin, rack, or pallet that holds inventory.",
    MI_RETURN_LOCATION_FULL:
      "That bin doesn’t have room for every unit you’re sending to it — spread some across another bin, rack, or pallet.",
    MI_COMPONENT_RETURN_LOCATION_REQUIRED:
      "Pick a location for every component being returned with this unit.",
    MI_ISSUE_TYPE_NOT_SUPPORTED: "This issue type isn’t available yet.",
    MI_SOURCE_NOT_FOUND: "The source document couldn’t be found.",
    MI_NUMBER_GEN_FAILED: "Couldn’t allocate an issue number — try again.",
    MI_OUTWARD_QC_RESULT_REQUIRED:
      "Pick Pass or Fail — this line has no checklist to decide the result for you.",
    MI_OUTWARD_QC_PRIMARY_ONLY:
      "Outward QC runs on the assembled unit — QC the primary line, not this component.",
    MI_PARENT_REF_INVALID:
      "That's not a live primary line on this material issue — pick a different unit to add to.",
  } as Record<string, string>,

  toast: {
    created: "Draft created.",
    updated: "Draft updated.",
    issued: "Material issued.",
    cancelled: "Draft cancelled.",
    returned: "Units returned to stock.",
    // Short action label — the dispatch number already appears in the message,
    // so the button stays compact and doesn't crowd the toast text.
    viewDispatch: "View dispatch",
    lineAdded: "Line added.",
    lineRemoved: "Line removed.",
    // One summary toast after an edit-save rebuilds the lines, instead of one
    // "Line removed." per deleted line (§0.13).
    linesUpdated: "Lines updated.",
  },

  qc: {
    title: "Unit Quality Check",
    subjectLabel: "Unit under QC",
    startTitle: "Start QC",
    completeTitle: "Complete QC",
    starting: "Starting quality check…",
    checklistLoading: "Loading checklist…",
    resultLabel: "Result",
    resultPass: "Pass",
    resultFail: "Fail",
    resultHelp: "Silence is never a pass — pick Pass or Fail.",
    photoLabel: "QC photo",
    notesLabel: "Notes",
    notesPlaceholder: "Additional notes (optional)",
    checklistLabel: "Outward QC Checklist",
    toastSuccess: "Quality check recorded.",
    submit: "Complete QC",
    cancel: "Cancel",
    // Why-tooltips (§0.9) naming the unmet gate on the disabled Complete button.
    checklistIncomplete: "Answer every required checklist item.",
    resultRequired: "Pick a result — Pass or Fail.",
  },

  topUp: {
    buttonLabel: "Add Component",
    dialogTitle: "Add Components to Issue",
    dialogSubtitle:
      "Add more units or components to this issued material issue.",
    submit: "Add Units",
    cancel: "Cancel",
    emptyUnits: "Add at least one unit.",
    toastSuccess: "Components added to issue.",
    primaryLabel: "Adding to",
    variantLabel: "Part Variant",
    serialLabel: "Serial",
    serialOptionalLabel: "Serial (optional)",
    reasonLabel: "Reason (optional)",
    reasonPlaceholder: "Why is this component being added?",
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Additional notes…",
    variantRequired: "Pick a part variant to add.",
  },

  pullOut: {
    buttonLabel: "Pull Out Part",
    dialogTitle: "Pull a Part Into Inventory",
    dialogSubtitle:
      "Register a part stripped out of this machine (or one of its components) back into stock. It becomes a new unit at the location you pick, traceable to where it came from.",
    sourceLabel: "Pulled out of",
    sourcePlaceholder: "Select the machine or component",
    variantLabel: "Part",
    variantHelp: "Pick the part — its condition (new / refurbished / new pull) comes with the variant.",
    serialLabel: "Serial",
    serialOptionalLabel: "Manufacturer serial (optional)",
    serialPlaceholder: "Scan or type the part's serial",
    serialHelp:
      "Optional — a harvested part often has no legible serial. The system assigns its own tracking label either way.",
    // All of RackBinLocationPicker's own copy (rackLabel / rackPlaceholder /
    // rackPalletTag / binLabel / binPlaceholder / locationEmpty) moved to
    // components/shared/location-picker.strings.ts when the picker became
    // shared with the spare return.
    locationPlaceholder: "Where does it land?",
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Anything worth recording…",
    submit: "Pull Into Stock",
    cancel: "Cancel",
    toastSuccess: "Part registered back into inventory.",
    machineRole: "Machine",
    componentRole: "Component",
    // Why-tooltips (§0.9) naming the unmet gate on the disabled Pull Into Stock button.
    sourceRequired: "Pick the machine or component to pull from.",
    variantRequired: "Pick the part to pull out.",
    locationRequired: "Pick where the part lands.",
    // A part already recorded inside the unit comes out as itself.
    recordedLabel: "Recorded inside",
    recordedPlaceholder: "Pick the part that came out",
    recordedOther: "Not in the list — pick a part",
    recordedDescribedHint: "Recorded by description only — pick its part below.",
    // Where the pulled part goes next.
    destinationLabel: "Send to",
    destinations: {
      available: "QC",
      repair: "Repair",
      scrap: "Scrap",
    } as Record<string, string>,
  },

  // Inline "Issued Components" editor on the detail page — a two-column
  // Add / Remove panel per issued machine. Changes are STAGED locally and only
  // committed (one batched top-up + the pull-outs) when the operator saves.
  // In-house component swap: the recorded part being replaced is still inside
  // the customer's device — prompt pulling it out (spec D10, O4).
  replacedPart: {
    title: (part: string) => `${part} is being replaced`,
    description:
      "It is still recorded inside this device. Pull it out so the device does not ship with the old and new part both inside.",
    action: "Pull it out",
  },
  issuedComponents: {
    title: "Issued Components",
    hint: "stage parts to add or pull out, then save",
    fittedLabel: "Fitted into this machine",
    noComponents: "No components fitted yet.",
    componentsLabel: "Components",
    noneFitted: "No components fitted yet.",
    returnNote: "Return note",
    removeNoteLabel: "Note (optional)",
    removeNotePlaceholder: "Why is this part coming off?",
    addedComponentsLabel: "Added Components",
    removedComponentsLabel: "Removed Components",
    noAddedComponents: "No components added.",
    noRemovedComponents: "No components removed.",
    itemsCount: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    addTitle: "Add Components",
    addHint: "Scan a part to issue it to this build",
    removeTitle: "Pull Out Components",
    removeHint: "Pull a part off this build",
    addAction: "Add Component",
    removeAction: "Pull Out Component",
    clearSelectionAria: "Clear selection",
    stage: "Add to list",
    stagedAddEmpty: "Nothing staged to add yet.",
    stagedRemoveEmpty: "Nothing staged to pull out yet.",
    removeStagedAria: "Remove from list",
    colPartNumber: "Part Number",
    colPart: "Part",
    colSerial: "Serial",
    colRack: "Rack",
    colBin: "Bin",
    colLocation: "Return location",
    toAdd: (n: number) => `${n} to add`,
    toRemove: (n: number) => `${n} to remove`,
    noChanges: "No staged changes.",
    duplicateSerialError:
      "That serial is already added to this machine — pick a different unit.",
    // Why-tooltips (§0.9) naming the unmet gate on a disabled staging button.
    stageAddNoPart: "Pick a part to add.",
    stageRemoveNoPart: "Pick a part to pull out.",
    stageRemoveNoLocation: "Pick a return location.",
    stageRemoveScrapNoReason: "Add a note — scrapping a part needs a reason.",
    dismissError: "Dismiss",
    save: "Save changes",
    saving: "Saving…",
    discard: "Discard",
  },

  worklist: {
    title: "Material Issue",
    subtitle:
      "Every issued unit as its own line — inspect, prepare for dispatch, add or return parts.",
    breadcrumbs: { wms: "WMS", worklist: "Material Issue" },
    newButton: "New Material Issue",
    loading: "Loading units…",
    groupMeta: (issueType: string, engineer: string, warehouse: string) =>
      `${issueType} · ${engineer} · ${warehouse}`,
    tabs: {
      all: "All",
      draft: "Draft",
      issued: "Issued",
      qcFailed: "QC Failed",
      readyForDispatch: "Ready for Dispatch",
      dispatched: "Dispatched",
      returned: "Returned",
    },
    filters: {
      search: "Search by Material Issue number…",
      warehouse: "Warehouse",
      issueType: "Issue Type",
      engineer: "Engineer",
      allWarehouses: "All warehouses",
      allTypes: "All types",
      allEngineers: "All engineers",
      engineerNeedsWarehouse: "Select a warehouse first",
    },
    columns: {
      issueNo: "Material Issue",
      type: "Type",
      part: "Item",
      serial: "Serial",
      warehouse: "Warehouse",
      stage: "Status",
      returnLocation: "Return Location",
      issuedTo: "Engineer",
      components: "Components",
      actions: "Actions",
    },
    components: {
      count: (n: number) => (n === 1 ? "1 component" : `${n} components`),
    },
    empty: {
      title: "No Units Found",
      description: "No matching units in the selected stage.",
    },
    error: {
      title: "Couldn't Load Worklist",
      description: "Something went wrong fetching the units list. Try again.",
    },
    actions: {
      menu: "Row actions",
      startQc: "Start Outward QC",
      return: "Return",
      rerunQc: "Re-run Outward QC",
      addComponent: "Add Component",
      pullOut: "Pull Out Part",
      issue: "Issue",
      edit: "Edit Draft",
      cancel: "Cancel Draft",
    },
  },
} as const;
