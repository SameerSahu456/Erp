// User-facing toast copy for the warehouse-location write mutations (§16.12).
//
// One typed source for the create / update success toasts fired by
// `useCreateLocation` and `useUpdateLocation`, kept out of the hook body so the
// copy lives in one place instead of being typed inline per call.
export const USE_WAREHOUSE_LOCATIONS_STRINGS = {
  toasts: {
    created: 'Location added',
    updated: 'Location updated',
    deleted: 'Location deleted',
  },
  // Delete-failure copy. Mapped from the backend 409 business code so
  // the toast tells the operator what to change, not just that it failed. The
  // fallback covers any other error where the API message is unavailable.
  deleteErrors: {
    LOCATION_HAS_REFERENCES:
      "Can't delete a location that still holds stock or bins. Empty its stock (or remove its bins) first, or deactivate the location instead.",
    fallback: 'Failed to delete location',
  },
} as const
