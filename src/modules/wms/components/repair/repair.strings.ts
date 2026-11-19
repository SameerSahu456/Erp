// User-facing copy for the WMS › repair sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error text, dialog copy, and stats labels live
// here as one typed `as const` object. Components import via a relative path.
export const REPAIR_STRINGS = {
  page: {
    title: "Repair",
    subtitle:
      "Manage L2, L3, and Display repair jobs. Repair starts once spares are fulfilled and paint is done.",
    breadcrumbs: {
      wms: "WMS",
      repair: "Repair",
    },
  },
  stats: {
    totalJobs: "Total Jobs",
    inProgress: "In Progress",
    completedToday: "Completed Today",
    reworkCount: "Rework Count",
  },
  checklist: {
    passCount: (count: number) => `${count} pass`,
    failCount: (count: number) => `${count} fail`,
  },
  columns: {
    deviceBarcode: "Device Barcode",
    partNo: "Part No",
    serialNo: "Serial No",
    biosNo: "BIOS No",
    category: "Category",
    status: "Status",
    readiness: "Readiness",
    spares: "Spares",
    paint: "Paint",
    assignedTo: "Assigned To",
    rework: "Rework",
    actions: "Actions",
  },
  tabs: {
    allJobs: "All Jobs",
    l2Repair: "L2 Repair",
    l3Repair: "L3 Repair",
    displayRepair: "Display Repair",
  },
  cell: {
    assemblyAriaLabel: "Assembly",
    unassigned: "Unassigned",
    sparesIssuedLabel: "Issued",
    paintDoneLabel: "Done",
    addLabel: "Add",
    actions: {
      start: "Start",
      startQC: "Start QC",
      assemble: "Assemble",
    },
  },
  empty: {
    title: "No Repair Jobs",
    description:
      "Repair jobs appear here once devices are inspected and routed for repair.",
  },
  checklistDialog: {
    titlePrefix: "Repair Checklist:",
    assignedTo: "Assigned to",
    progressLabel: "Progress",
    notesLabel: "Notes",
    notesPlaceholder: "Any observations during repair...",
    issueDescriptionPlaceholder: "Describe the issue...",
    cancel: "Cancel",
    startRepair: "Start Repair",
    passLabel: "Pass",
    failLabel: "Fail",
    naLabel: "N/A",
    deviceType: {
      server: "Server",
      laptop: "Laptop",
    },
  },
  qcDialog: {
    titlePrefix: "Repair QC:",
    serverLabel: "Server",
    inspectionTemplate: "Inspection template",
    progressLabel: "Progress",
    issueDescriptionPlaceholder: "Describe the issue...",
    cancel: "Cancel",
    passQC: "Pass QC",
    passLabel: "Pass",
    failLabel: "Fail",
    naLabel: "N/A",
  },
  assembleDialog: {
    titlePrefix: "Assemble",
    workLabel: "Assembly work performed",
    placeholder:
      "Describe what was assembled (parts re-seated, screws torqued, panels closed, etc.)…",
    helperText: "On submit, the device moves to Inward QC.",
    cancel: "Cancel",
    sendToInwardQC: "Send to Inward QC",
  },
  toast: {
    repairStarted: (barcode: string) => `Repair started for ${barcode}`,
    devicePassed: (barcode: string) =>
      `${barcode} passed repair QC. Ready for assembly.`,
    deviceAssembled: (barcode: string) =>
      `${barcode} assembled and sent to Inward QC.`,
    deviceAssigned: (barcode: string, engineer: string) =>
      `${barcode} assigned to ${engineer}`,
    flagToggled: (barcode: string, label: string, doneLabel: string) =>
      `${barcode}: ${label} ${doneLabel}`,
    errorChecklistIncomplete: "Please complete all checklist items.",
    errorQCIncomplete: "Please complete all QC checklist items.",
    errorQCFailed: "Resolve failed items before passing QC.",
    errorAssembleNotes: "Describe the assembly work performed.",
  },

  // Live "Repair" queue screen (RepairBody.tsx). Self-contained, byte-exact
  // group added 2026-08-12. The groups above describe a PRIOR version of this
  // screen (L2/L3/Display tabs, assemble/QC dialogs, etc.) and are intentionally
  // left untouched so no rendered text changes.
  repairQueue: {
    title: "Repair",
    subtitle:
      "Devices in repair or waiting for spares. Complete a repair, or open a device for detail.",
    searchPlaceholder: "Search by barcode, serial, or part…",
    tabs: {
      inProgress: "In Progress",
      done: "Done",
      all: "All",
    },
    columns: {
      barcode: "Barcode",
      partNo: "Part Number",
      partName: "Part Name",
      partVariant: "Variant Name",
      category: "Category",
      assignedTo: "Assigned To",
      warehouse: "Warehouse",
      received: "Received",
      actions: "Actions",
    },
    complete: "Complete",
    scrap: "Scrap",
    empty: {
      errorTitle: "Couldn’t load the queue",
      clearTitle: "Repair queue is clear",
      errorDescription: "Refresh to try again.",
      clearDescription:
        "No devices are in repair or waiting for spares right now.",
    },
  },

  // Complete-repair dialog (RepairCompleteDialog.tsx). Byte-exact extraction
  // added 2026-08-12.
  completeDialog: {
    title: "Complete Repair",
    cancel: "Cancel",
    submit: "Complete Repair",
    // Why Complete is disabled — shown in a tooltip so the operator knows which
    // condition is unmet (§0.9/§9).
    blocked: {
      checklist: "Answer all required checklist items to continue.",
      checklistUnavailable: "The checklist for this part couldn’t be loaded. Close and reopen to try again.",
      result: "Select a Pass or Fail result to continue.",
      photo: "Add at least one repair photo to continue.",
      openSpares: "Fulfil or cancel the open spare request(s) before passing.",
      openVendor: "Receive or cancel the pending vendor service request(s) before passing.",
    },
    // Red pending-request notices shown at the top of the complete form. A count,
    // no per-row list — the operator acts on them from the device's Spares /
    // Vendor sections, not from inside this modal.
    spareBlock: (n: number) =>
      `${n} spare request${n === 1 ? "" : "s"} still open. Fulfil or cancel ${
        n === 1 ? "it" : "them"
      } before this repair can pass.`,
    vendorBlock: (n: number) =>
      `${n} vendor service request${n === 1 ? "" : "s"} pending. Receive or cancel ${
        n === 1 ? "it" : "them"
      } before this repair can pass.`,
    partFallback: "Part",
    qtyLabel: (qty: number) => `Qty ${qty}`,
    cancelRequestTitle: "Cancel This Spare Request?",
    cancelRequestDescription:
      "The repair worked without this part — nothing has been fitted, so the request closes without fulfilment.",
    cancelRequest: "Cancel request",
    // Inline two-step confirm — replaces a ConfirmDialog nested over this modal
    // (§5): the first click swaps "Cancel request" for these two.
    cancelRequestConfirm: "Confirm cancel",
    cancelRequestKeep: "Keep",
    loadingChecklist: "Loading checklist…",
    checklistLabel: "Checklist",
    requiredProgress: (answered: number, total: number) =>
      `${answered}/${total} required`,
    resultLabel: "Repair result",
    resultHelperWithChecklist:
      "This checklist has no Pass/Fail item — set the result explicitly. A fail loops back to repair.",
    resultHelperNoChecklist:
      "No checklist applies — set the result. A fail loops back to repair.",
    passLabel: "Pass",
    failLabel: "Fail",
    photoLabel: "Repair photo",
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Repair notes (parts replaced, work done)…",
    submitHelper:
      "On submit: pass advances the device to QC; a fail loops back to repair. On a fail you can flag any spares the device still needs above — it stays in rework until those are done.",
    discardTitle: "Discard Changes?",
    discardDescription:
      "Are you sure you want to discard the changes? Anything you entered on this form will be cleared.",
    discardLabel: "Discard",
    stayLabel: "Keep editing",
  },
} as const
