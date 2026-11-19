// User-facing toast copy for the device-inspection mutations (§16.12).
//
// One typed source for the success messages fired by `useStartInspection`,
// `useCompleteInspection`, and `useCancelInspection`, so the copy lives in a
// centralized constant instead of being typed inline at each mutation site.
export const USE_INSPECTION_STRINGS = {
  startSuccess: "Inspection started",
  completeSuccess: "Inspection completed",
  cancelSuccess: "Inspection cancelled",
} as const;
