// User-facing toast copy for the device write mutations (§16.12).
//
// One typed source for the success toasts fired by `useAssignDevice` and
// `useRackAssignDevice`, kept out of the hook body so the copy lives in one
// place instead of being typed inline per call.
export const USE_DEVICES_STRINGS = {
  toasts: {
    assignmentUpdated: 'Assignment updated',
    assignedToRack: 'Device assigned to rack',
  },
} as const
