// User-facing toast copy for the purchase-return mutations hook (§16.12).
//
// One typed source for the success confirmations and the generic error
// fallback surfaced by `usePurchaseReturnMutations`, so the copy stays out of
// the hook body instead of being typed inline at each `toast.*` call.
export const USE_PURCHASE_RETURN_MUTATIONS_STRINGS = {
  success: {
    create: 'Purchase return raised',
    cancel: 'Purchase return cancelled',
    // One consignment, not necessarily the whole return — so the toast counts
    // the units that actually left rather than implying the return is closed.
    dispatch: (units: number) =>
      `${units} unit${units === 1 ? '' : 's'} dispatched to vendor`,
    setDisposition: 'Disposition set',
    reject: 'Return item rejected',
    cancelItem: 'Unit removed from the return',
    settle: 'Credit settled',
    waive: 'Credit waived',
  },
  errorFallback: 'Something went wrong',
  docsUploadPartial:
    'Dispatched, but some documents didn’t upload. Add them from the dispatch page.',
} as const
