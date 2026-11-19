// User-facing copy for the WMS › inwards hooks (useInwards mutations).
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the sub-feature's
// mutation toast messages live here as one typed `as const` object instead of
// being hardcoded ("naked") in the hook. `useInwards` imports this single source
// so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const USE_INWARDS_STRINGS = {
  toasts: {
    // useCreateGrnBatch — "<grn_number> created"
    created: (grnNumber: string) => `${grnNumber} created`,
    // useFinalizeGrnBatch — "<grn_number> finalized — <n> unit(s) received"
    finalized: (grnNumber: string, units: number) =>
      `${grnNumber} finalized — ${units} unit(s) received`,
    // useCancelGrnBatch
    cancelled: "Batch cancelled",
  },
} as const
