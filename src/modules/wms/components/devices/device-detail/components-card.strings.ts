// User-facing copy for the WMS › devices › Components card.
//
// Coding-guideline §16.12: screen copy lives in one typed `as const` object,
// never hardcoded in the component. Dynamic copy is a function member.
export const COMPONENTS_CARD_STRINGS = {
  card: {
    title: 'Components',
    // Says WHY the list matters, in the floor's own terms: these parts are
    // countable stock, not annotations (component-tracking D1).
    subtitle: 'Parts fitted inside this device. Each one is tracked stock.',
    empty: 'No components recorded for this device yet.',
    // The backfill prompt. Day-one stock has no component data at all, so an
    // empty list usually means "nobody has recorded it", not "it is empty".
    emptyHint: 'Record what is inside it so the parts count as inventory.',
    error: 'Could not load this device’s components.',
    // The device is not with us, so nothing on this card can be changed.
    awayNote: (status: string) =>
      `${status} — components can be added, checked or removed once the device is back with us.`,
    showRemoved: 'Show removed',
    hideRemoved: 'Hide removed',
    removedHeading: 'Removed earlier',
    countLabel: (n: number) => (n === 1 ? '1 component' : `${n} components`),
    // Components recorded at a PO inward or brought back by a return arrive
    // unchecked; inspection cannot complete until each one is confirmed or
    // marked missing (inward-verification D3, dispatch-return D4).
    dueBanner: (n: number) =>
      n === 1
        ? '1 component needs checking: is it really inside this device?'
        : `${n} components need checking: are they really inside this device?`,
    confirmAll: 'Confirm all present',
    confirmAllTitle: 'All components present?',
    confirmAllDescription: (n: number) =>
      `Confirms the ${n === 1 ? 'component' : `${n} components`} waiting to be checked. Only use it after looking inside the device.`,
    confirmAllLabel: 'Yes, all present',
  },

  row: {
    // A component often has no manufacturer serial (a RAM stick rarely does),
    // so the internal serial is the identity shown.
    noSerial: 'No serial',
    positionLabel: (pos: string) => `Position ${pos}`,
    // `who` is empty when the viewer cannot look users up (auth:users:read).
    addedBy: (who: string, when: string) => (who ? `Added by ${who} · ${when}` : `Added ${when}`),
    removedBy: (who: string, when: string) =>
      who ? `Removed by ${who} · ${when}` : `Removed ${when}`,
    // How the part got in, or why it left, when that is worth naming.
    addedDuringIssue: "Added during material issue",
    removedDuringIssue: "Removed during material issue",
    sentForRepair: "Sent to us for repair",
    replacedOnSite: "Replaced at the customer's site",
    // A part fitted inside another part, listed under it.
    insidePart: (part: string) => `Inside ${part}`,
    pull: 'Pull out',
    remove: 'Remove',
    // Badge on a pulled-out part: where it is now.
    nowAt: (where: string) => `Now: ${where}`,
    confirm: 'Present',
    markMissing: 'Missing',
    // Undoes "Missing" or "Pull out" — the same part goes back inside.
    foundAfterAll: 'Add back',
    putBack: 'Add back',
    undoAdd: 'Added by mistake',
    identify: 'Identify part',
  },

  missing: {
    title: 'Component Missing?',
    // The wording follows why the part is being checked (inward-verification D6).
    description:
      'It came back recorded inside this device but is not there. It stays with the customer, so it is not counted as our stock.',
    descriptionInward:
      'The supplier listed it inside this device but it is not there. It is recorded as missing for procurement and is not counted as our stock.',
    descriptionNotInDevice:
      'It was recorded inside this device but is not there. It is recorded as missing and is not counted as our stock. "Add back" undoes this.',
    reasonLabel: 'What did you find?',
    reasonPlaceholder: 'e.g. RAM slot empty',
    reasonRequired: 'Say what you found.',
    submit: 'Mark missing',
    saving: 'Saving…',
    keep: 'Keep it',
  },

  foundAfterAll: {
    title: 'Add Back to Device?',
    description:
      'Undoes "missing": the same part goes back inside this device, waiting to be checked again — confirm it present, or mark it missing again. Nothing new is created, so it does not need a serial.',
    confirmLabel: 'Yes, it is inside',
  },

  putBack: {
    title: 'Add Back to Device?',
    description:
      'The same part goes back inside this device. If it is still waiting for QC or repair, that job is cancelled; if it has passed QC, it comes off the rack. Not possible while QC or repair is under way, or once it is scrapped or reserved.',
    confirmLabel: 'Yes, add it back',
  },

  // The Remove button's question when both ways off the device apply.
  remove: {
    title: 'Remove Component',
    description: 'How is this part coming off the device?',
    pullTitle: 'Take it out of the device',
    pullHelp: 'The part was inside. It comes out and goes to QC, repair or scrap.',
    undoTitle: 'It was never inside — added by mistake',
    undoHelp: 'Undo the add, as if it was never recorded. Only while nothing has happened to it since.',
    cancel: 'Cancel',
  },

  undoAdd: {
    title: 'Added by Mistake?',
    description:
      'Removes this part from the device as if it was never added. A part created by the add is withdrawn; one picked from stock goes back to stock (it will need racking); one we had shipped goes back to the customer.',
    reasonLabel: 'Why was it a mistake?',
    reasonPlaceholder: 'e.g. Added to the wrong device',
    reasonRequired: 'Say why it was a mistake.',
    submit: 'Remove it',
    saving: 'Removing…',
    keep: 'Keep it',
  },

  identify: {
    title: 'Identify Component',
    description: (what: string) =>
      `Link “${what}” to its IMS part. It becomes tracked stock inside this device.`,
    partLabel: 'IMS part',
    partPlaceholder: 'Search part…',
    partRequired: 'Pick the IMS part.',
    cancel: 'Cancel',
    submit: 'Identify',
    saving: 'Saving…',
  },

  // The one "Add component" dialog: a backfill of what is already inside, or
  // a find at inspection / repair / QC. Fitting a part from the shelf is a
  // spare request, so the store keeps control of stock.
  add: {
    trigger: 'Add component',
    title: 'Add a Component',
    description:
      'Record a part that is inside this device. Scan its serial if it has one — a part we already track is linked, not duplicated. Each unit becomes tracked stock in this device.',
    serialLabel: 'Serial (optional)',
    serialPlaceholder: 'Scan or type, e.g. S4EVNX0R123456',
    serialHelp: 'Leave blank if you cannot read it. You can add it when the part is pulled out.',
    partLabel: 'IMS part',
    partPlaceholder: 'Search part…',
    descriptionLabel: 'What is it?',
    descriptionPlaceholder: 'e.g. RAM 8GB DDR4',
    descriptionHelp: 'Needed when you do not know the IMS part. A store manager identifies it later.',
    partNumberLabel: 'Part number (optional)',
    partNumberPlaceholder: 'e.g. M471A1K43DB1',
    quantityLabel: 'Quantity',
    // Explains the one-row-per-unit rule (D2) so "4" does not read as a
    // single row with a count.
    quantityHelp:
      'Each unit becomes its own tracked stock item, so any one of them can be pulled out and traced later.',
    quantityNeedsPart: 'Several at once needs the IMS part and no serial — each serial names one unit.',
    positionLabel: 'Position (optional)',
    positionPlaceholder: 'e.g. DIMM-A',
    // D7: "listed 16GB, got 8GB" — links the find to the missing part.
    insteadOfLabel: 'Instead of (optional)',
    insteadOfPlaceholder: 'A part marked missing',
    insteadOfNone: 'Not a replacement',
    insteadOfHelp: 'Pick the missing part this one replaces, so the report shows what was swapped.',
    needSomething: 'Scan a serial, pick the IMS part, or describe the component.',
    quantityRange: 'Quantity must be between 1 and 50.',
    // A real precondition, not advice: a component is minted into the
    // parent's warehouse, so the API refuses without one.
    noWarehouse:
      'This device has no warehouse on record. Components are stored against the device\u2019s warehouse, so one must be set before recording any.',
    cancel: 'Cancel',
    submit: 'Add component',
    saving: 'Recording…',
  },

  pull: {
    title: 'Pull out component',
    description:
      'Removes the part from this device and returns it to stock, recording which device it came out of.',
    conditionLabel: 'Condition of the pulled part',
    good: 'Good — send to QC',
    // Spells out D6 rather than leaving the operator to discover it.
    goodHelp:
      'It was only ever tested inside this device, so it goes to QC before it can be sold.',
    locationHelp: 'Optional: the rack or bin where the part waits for QC or repair.',
    repair: 'Faulty — send to repair',
    repairHelp: 'Goes to the repair queue. After repair it goes to QC like any other part.',
    scrap: 'Dead — scrap it',
    scrapHelp: 'Written off. A manager shelves it in the scrap area, and can un-scrap it if needed.',
    // Shown only when the part has no manufacturer serial yet (D10): the
    // label is often readable only once the part is out.
    mfgSerialLabel: 'Manufacturer serial (optional)',
    mfgSerialPlaceholder: 'e.g. S4EVNX0R123456',
    mfgSerialHelp: 'Now that it is out, add the serial printed on the part if you can read it.',
    notesLabel: 'Notes (optional)',
    // Scrap is a write-off, so the notes become its required reason.
    scrapReasonLabel: 'Why is it being scrapped?',
    scrapReasonPlaceholder: 'e.g. Burnt chip, no power',
    scrapReasonRequired: 'Say why the part is being scrapped.',
    submit: 'Pull out',
    saving: 'Pulling…',
    conditionRequired: 'Say what condition the part is in.',
  },

  toast: {
    added: (n: number) => (n === 1 ? 'Component recorded' : `${n} components recorded`),
    pulled: 'Component pulled out',
    confirmed: 'Component confirmed',
    confirmedAll: (n: number) =>
      n === 1 ? '1 component confirmed' : `${n} components confirmed`,
    markedMissing: 'Component marked missing',
    foundAfterAll: 'Component back inside — check it again',
    putBack: 'Component back inside the device',
    addUndone: 'Component removed',
    recordedFound: (n: number) => (n === 1 ? 'Component recorded' : `${n} components recorded`),
    identified: 'Component identified',
  },
} as const;
