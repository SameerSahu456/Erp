// User-facing copy for the WMS › operations RaiseSparesDialog component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): dialog titles,
// button labels, placeholders, empty-state copy, confirm/discard dialog copy,
// and aria-labels live here as one typed `as const` object instead of being
// hardcoded ("naked") in JSX. The component imports this single source so copy
// stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `requestButton`).
export const RAISE_SPARES_DIALOG_STRINGS = {
  // Dialog chrome (title + footer buttons)
  title: 'Request Spare Parts',
  cancel: 'Cancel',
  requesting: 'Requesting…',
  requestButton: (count: number) =>
    `Request ${count || ''} spare${count === 1 ? '' : 's'}`.replace('  ', ' ').trim(),

  // Why the Request button is disabled — first unmet data gate (§0.9).
  blocked: {
    noLines: 'Add at least one spare part to request.',
    invalidQty: 'Set a quantity of at least 1 for every spare part.',
  },

  // "Already requested" list of the device's still-open requests
  alreadyRequested: 'Already requested',
  partFallback: 'Part',
  qtyRequested: (qty: number) => `Qty ${qty}`,

  // Confirm dialog for cancelling one existing request
  cancelConfirm: {
    title: 'Cancel This Spare Request?',
    description: 'Nothing has been fitted for this request — it closes without fulfilment.',
    confirmLabel: 'Cancel request',
  },
  cancelRequestAriaLabel: 'Cancel spare request',

  // Add-a-spare part picker
  addSparePart: 'Add a spare part',
  pickerPlaceholder: 'Search a part / variant…',
  pickerSearchPlaceholder: 'Search by part number, name or description…',
  unnamedVariant: '(unnamed)',

  // Describe-a-part entry — for when the engineer doesn't know the part code.
  describePart: "Or describe the part if you don't know its code",
  describePlaceholder: 'e.g. speaker, keyboard, hinge',
  describeHelper: 'The store manager will choose the exact part when fulfilling.',
  describeMaxLength: 255,
  addDescribed: 'Add',
  describedBadge: 'Part to be chosen',

  // Added-spares line list
  emptyState: 'No spare parts added yet. Search for a part or describe one above.',
  quantityAriaLabel: 'Quantity',
  removeSparePartAriaLabel: 'Remove spare part',

  // Footer helper (stage is 'inspection' | 'repair')
  raisedAgainst: (stage: string) =>
    `Raised against this ${stage}. The request appears on the Spares page for fulfilment.`,

  // Unsaved-changes discard guard
  discardDialog: {
    description:
      'Are you sure you want to discard the changes? The spare parts you added will be cleared.',
    discardLabel: 'Discard',
  },
} as const
