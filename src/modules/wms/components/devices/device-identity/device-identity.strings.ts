// User-facing copy for the three device-identity dialogs (§16.12).
export const DEVICE_IDENTITY_STRINGS = {
  common: {
    cancel: "Cancel",
    saving: "Saving…",
    fixErrors: "Please fix the highlighted fields.",
  },

  serial: {
    fillTitle: "Add serial number",
    correctTitle: "Correct serial number",
    fillDescription:
      "This unit was inwarded without an OEM serial. Record it now — the Comprint barcode is unchanged.",
    correctDescription:
      "Replacing a recorded serial changes which physical unit this record identifies. Say why.",
    currentLabel: "Currently recorded",
    serialLabel: "Manufacturer serial",
    serialPlaceholder: "Scan or type the OEM serial",
    reasonLabel: "Reason",
    reasonPlaceholder: "e.g. Typed 7 as 1 at inward",
    submit: "Save",
  },

  reidentify: {
    title: "Re-identify part",
    description:
      "Change the part this device is recorded as. Stock counts move from the old variant to the new one, and the receipt keeps what the PO ordered.",
    descriptionNoPo:
      "Change the part this device is recorded as. Stock counts move from the old variant to the new one.",
    variantLabel: "Actual part",
    variantPlaceholder: "Choose the part that actually arrived",
    variantSearchPlaceholder: "Search parts…",
    reasonLabel: "Reason",
    reasonPlaceholder: "e.g. PO line says the 5410; the box is a 5420",
    relinkHint:
      "Picked the wrong PO line instead? Use Change PO line — that one also moves the received quantity.",
    conditionHint:
      "A device received against a purchase order must keep that order's condition. To move it between new and refurbished, amend the PO first.",
    submit: "Re-identify",
  },

  relink: {
    title: "Change PO line",
    description:
      "Move this device to the purchase-order line it was actually received against. The received quantity moves with it and the PO status is recalculated.",
    lineLabel: "Correct PO line",
    linePlaceholder: "Choose a line on this order",
    sameOrderHint:
      "Only lines on this device's own purchase order can be chosen.",
    variantLabel: "Part that arrived",
    variantPlaceholder: "Choose the part",
    variantSearchPlaceholder: "Search parts…",
    variantHint:
      "This line was raised as a description only, so tell us which part arrived.",
    reasonLabel: "Reason",
    reasonPlaceholder:
      "e.g. Received against line 1; the box belongs to line 2",
    submit: "Change line",
    noLines: "This device's purchase order has no other lines to move it to.",
    descriptionOnlyLabel: "Description only",
    // Why the Change line button is disabled — no other line to move to (§0.9).
    blocked: "This order has no other line to move this device to.",
  },

  banner: {
    title: "Re-inspection required",
    body: "This device was re-identified as a different part, and a different checklist now applies. Run that checklist before racking it.",
  },

  actions: {
    // Inline affordances beside a field, where the label already says what it
    // acts on.
    addSerial: "Add",
    editSerial: "Edit",
    // Row-menu entries, which need to name the thing themselves.
    addSerialLong: "Add serial number",
    editSerialLong: "Correct serial number",
    reidentify: "Re-identify part",
    relink: "Change PO line",
    rowMenuAriaLabel: "Device identity actions",
  },
} as const;
