// User-facing copy for the WMS › devices › device-detail header actions.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the stage-adaptive
// action button labels and the "Cancel paint" confirm-dialog copy live here as
// one typed `as const` object instead of being hardcoded ("naked") in the
// component. The paint-form button label is expressed via two static members
// selected by a ternary in the component.
//
// NOT included (correctly sourced elsewhere): the workflow-status values used in
// comparisons (API enum keys), the `'send' | 'return'` paint-form mode values,
// the RaiseSparesDialog `stage` value, the Button / ConfirmDialog variant tokens,
// className strings, and the cancel `reason` string sent to the API.
export const DEVICE_HEADER_ACTIONS_STRINGS = {
  // Stage-adaptive action button labels.
  actions: {
    startInspection: 'Start Inspection',
    completeInspection: 'Complete Inspection',
    spares: 'Spares',
    sendToPaint: 'Send to paint',
    completeRepair: 'Complete Repair',
    startInwardQc: 'Start Inward QC',
    markReturned: 'Mark returned',
    sendToVendor: 'Send to vendor',
    assignToRack: 'Assign to Rack',
    scrap: 'Scrap',
    unscrap: 'Un-scrap',
    dispose: 'Dispose',
  },

  // Why Scrap is disabled while the device is at a vendor.
  scrapAtVendor: 'This device cannot be scrapped because it is currently with a vendor. Receive it back first.',

  // "Cancel paint" confirmation dialog copy.
  cancelPaint: {
    title: 'Cancel paint?',
    description: 'The device exits the paint stage. This can’t be undone from here.',
    confirmLabel: 'Cancel paint',
  },
} as const
