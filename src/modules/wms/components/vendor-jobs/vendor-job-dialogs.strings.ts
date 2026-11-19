/** Copy for the vendor-service job dialogs (§16.12 — no naked strings).
 *  Section names are interpolated from the master row; nothing here hardcodes
 *  paint / display / battery. */
export const VENDOR_JOB_DIALOG_STRINGS = {
  // Shared <ServiceVendorPicker> option line: name, then the contact number.
  vendorPicker: {
    option: (name: string, phone?: string) => (phone ? `${name} · ${phone}` : name),
  },
  raise: {
    title: (section: string) => `Raise a ${section} request`,
    // Consolidated form (any job type): the section is chosen inside the form.
    titleGeneric: "Raise a service request",
    jobTypeLabel: "Job type",
    jobTypePlaceholder: "Choose a job type…",
    pickTypeFirst: "Choose a job type to continue.",
    description:
      "Record what is going out. Supplying a vendor sends it in the same step, leave it blank and the store manager dispatches it.",
    itemLabel: "What is going out",
    pickLabel: "Pick the items",
    pickPlaceholder: "Select items…",
    othersOption: "Others",
    pickHelp:
      "Pick as many as you need — each becomes its OWN request, so every item is tracked, sent and received separately.",
    addCustom: "Add",
    customLabel: "Something else",
    noneSelected: "Pick at least one item, or type one in.",
    // Submit-time error naming the invalid field, e.g. "Something else: Please enter 100 characters or fewer."
    itemInvalid: (field: string, message: string) => `${field}: ${message}`,
    partialFailure: (done: number, total: number, reason: string) =>
      `${done} of ${total} raised. The rest are still selected — fix the problem and submit again. (${reason})`,
    itemPlaceholder: "e.g. LCD Panel 14\" FHD",
    itemHelp:
      "The vendor and the section supervisor both read this line, so vagueness costs time.",
    partNoLabel: "Part number",
    partNoPlaceholder: "e.g. LP140WF3-SPD1",
    serialLabel: "Serial number going out",
    serialPlaceholder: "e.g. SN-8847302",
    vendorLabel: "Send to vendor now",
    vendorPlaceholder: "Select a vendor…",
    vendorNone: "Not yet — leave in Awaiting Vendor",
    vendorHelp: "Only a store or warehouse manager can dispatch.",
    notesLabel: "Instructions for the vendor",
    notesPlaceholder: "e.g. Handle with care — cracked bezel",
    submit: "Raise request",
    submitAndSend: "Raise and send",
    // One summary toast after the loop, never one per item (§0.13).
    raisedToast: (n: number) =>
      n === 1 ? "Request raised" : `${n} requests raised`,
  },
  send: {
    title: "Send to vendor",
    description:
      "The picker offers only this section's vendors, so a display job cannot reach a battery lab.",
    vendorLabel: "Vendor",
    vendorPlaceholder: "Select a vendor…",
    notesLabel: "Instructions",
    notesPlaceholder: "e.g. Deliver by Friday; call on arrival",
    submit: "Send to vendor",
  },
  receive: {
    title: "Receive from vendor",
    description: "Two questions: is it fit to use, and did the same item come back?",
    outcomeLabel: "Is it fit to use?",
    // Opens with the placeholder, never a pre-selected "pass", so an accept is
    // never submitted unreviewed (§9).
    outcomePlaceholder: "Select an outcome…",
    outcomePass: "Pass — accepted",
    outcomeFail: "Not OK",
    dispositionLabel: "What did the vendor do?",
    dispositionPlaceholder: "Select what happened…",
    dispositionRepaired: "Repaired — same item",
    dispositionReplaced: "Replaced — a different item came back",
    replacementSerialLabel: "Serial number of the replacement",
    replacementSerialPlaceholder: "e.g. SN-9921045",
    replacementSerialHelp:
      "Required. Without it the unit's history describes a part that is no longer in the machine.",
    responseLabel: "What the vendor said they did",
    responsePlaceholder: "e.g. Replaced LCD panel; bench-tested OK",
    submit: "Receive",
  },
  resend: {
    title: "Send again",
    description:
      "This creates a NEW trip. The previous one stays on the record with its verdict and vendor.",
    vendorLabel: "Vendor",
    vendorSame: "Same vendor as before",
    noteLabel: "What was still wrong",
    notePlaceholder: "e.g. Screen still flickers on boot",
    noteHelp: "Required — a re-send with no explanation tells the next reader nothing.",
    submit: "Send again",
  },
  cancel: {
    title: "Cancel this request",
    description:
      "Before dispatch this is a rejection. Once the item is at a vendor, only a store or warehouse manager can cancel.",
    reasonLabel: "Reason",
    reasonPlaceholder: "e.g. Wrong item raised — customer cancelled the job",
    reasonHelp: "Required — a rejection with no reason tells the engineer nothing.",
    submit: "Cancel request",
  },
  common: {
    close: "Close",
    saving: "Saving…",
    required: "Required",
    fixErrors: "Please fix the highlighted fields.",
  },
} as const
