// User-facing copy for the WMS › inspection sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and toast
// messages live here as one typed `as const` object instead of being hardcoded
// ("naked") in JSX/hooks. Dynamic copy is expressed as function members.
//
// Only the groups the shipped components actually consume live here: `list`
// (InspectionBody), `completeDialog` (InspectionCompleteDialog) and
// `returnToVendor` (ReturnToVendorPanel). Earlier `page` / `table` / `dialog` /
// `toast` groups belonged to a superseded InspectionDialog and were removed once
// they had drifted from — and stopped being read by — any shipped component.
export const INSPECTION_STRINGS = {
  // Copy for the Inspection queue list view (InspectionBody). Mirrors what
  // InspectionBody actually renders, byte-for-byte.
  list: {
    title: "Inspection",
    subtitle:
      "Devices awaiting or under inspection. Start an inspection or open a device for detail.",
    searchPlaceholder: "Search by barcode, serial, or part…",
    tabs: {
      pending: "Pending",
      completed: "Completed",
    },
    columns: {
      barcode: "Barcode",
      partNo: "Part Number",
      partName: "Part Name",
      partVariant: "Variant Name",
      serialNo: "Serial No",
      category: "Category",
      batch: "Batch",
      received: "Received Date",
      assignedTo: "Assigned To",
      actions: "Actions",
    },
    actions: {
      inspect: "Inspect",
      scrap: "Scrap",
    },
    empty: {
      errorTitle: "Couldn’t load the queue",
      title: "Inspection queue is clear",
      errorDescription: "Refresh to try again.",
      description: "No devices are pending or under inspection right now.",
    },
  },
  // Copy for the streamlined "Complete Inspection" dialog (InspectionCompleteDialog),
  // the per-device inspection form. Kept self-contained to match this file's
  // convention of independent groups.
  completeDialog: {
    title: "Complete Inspection",
    loading: "Loading inspection…",
    loadError: "Couldn’t load the active inspection. Close and retry.",
    loadingChecklist: "Loading checklist…",
    checklistLabel: "Checklist",
    requiredProgress: (answered: number, total: number) =>
      `${answered}/${total} required`,
    resultLabel: "Inspection result",
    resultHelperNoPassFail:
      "This checklist has no Pass/Fail item — set the result explicitly. A fail routes the device to repair.",
    resultHelperNoChecklist:
      "No checklist applies — set the result. A fail routes the device to repair.",
    passButton: "Pass",
    failButton: "Fail",
    photoLabel: "Inspection photo",
    notesLabel: "Notes",
    notesPlaceholder: "Overall inspection summary (optional)…",
    // The components check inside this dialog (inward-verification D3).
    components: {
      pending: (n: number) =>
        n === 1
          ? "1 component inside this device needs checking. Mark it Present or Missing in the device's Components section before completing the inspection."
          : `${n} components inside this device need checking. Mark each one Present or Missing in the device's Components section before completing the inspection.`,
      openDevice: "Open device",
    },
    outcomeHelper:
      "Outcome is decided automatically from the checklist — any Fail routes the device to repair; otherwise it advances to QC.",
    footer: {
      cancel: "Cancel",
      submit: "Complete Inspection",
    },
    // Why the Complete button is disabled — shown in a tooltip so the operator
    // knows exactly which condition is unmet (PAGE-UI §0.9 / §9).
    blocked: {
      checklist: "Answer all required checklist items to continue.",
      checklistUnavailable: "The checklist for this part couldn’t be loaded. Close and reopen to try again.",
      result: "Select a Pass or Fail result to continue.",
      photo: "Add at least one inspection photo to continue.",
      // Every component recorded inside the device (at inward or by a return)
      // must be confirmed or marked missing first — on the device's Components
      // card (inward-verification D3).
      components: (n: number) =>
        n === 1
          ? "Mark the 1 component Present or Missing on the device page first."
          : `Mark the ${n} components Present or Missing on the device page first.`,
    },
    toast: {
      success: "Inspection completed",
      errorNoActiveInspection: "No active inspection to complete.",
      errorGeneric: "Something went wrong. Please try again.",
    },
    discard: {
      title: "Discard Changes?",
      description:
        "Are you sure you want to discard the changes? Anything you entered on this form will be cleared.",
      discardLabel: "Discard",
      stayLabel: "Keep editing",
    },
  },
  // Copy for the "Return to vendor" panel (ReturnToVendorPanel), shown during
  // inspection when a PO-received device should be sent back to the supplier.
  returnToVendor: {
    label: "Return to vendor",
    description:
      "Use this when inspection determines the PO-received device should go back to the supplier. This does not complete the inspection; it opens the purchase return form with this unit preselected.",
    button: "Return to vendor",
    // Shown when the operator has entered inspection work that won't carry over
    // to the return form (checklist, photos, result), so leaving discards it.
    discardTitle: "Leave and raise a vendor return?",
    discardDescription:
      "You've started this inspection. Leaving to raise a vendor return will discard the checklist answers, photos, and result you entered here (your notes carry over to the return).",
  },
} as const
