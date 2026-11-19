// User-facing copy for the dispatch-requests mutation hooks (§16.12).
//
// One typed source for the success toasts fired by
// `usePatchDispatchRequest`, `useFinaliseDispatch`, and `useCancelDispatch`, so
// the copy stays out of the hook body instead of being hardcoded inline.
export const USE_DISPATCH_REQUESTS_STRINGS = {
  toasts: {
    updated: 'Dispatch updated',
    finalised: 'Dispatch finalised',
    cancelled: 'Dispatch cancelled',
  },
} as const
