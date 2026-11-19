// User-facing toast copy for the warehouse write mutations (§16.12).
//
// One typed source for the create / update / activate / deactivate success
// toasts fired by `useCreateWarehouse`, `useUpdateWarehouse`,
// `useActivateWarehouse`, and `useDeactivateWarehouse`, kept out of the hook
// body so the copy lives in one place instead of being typed inline per call.
export const USE_WAREHOUSES_STRINGS = {
  toasts: {
    created: 'Warehouse created',
    updated: 'Warehouse updated',
    activated: 'Warehouse activated',
    deactivated: 'Warehouse deactivated',
    deleted: 'Warehouse deleted',
  },
  // Delete-failure copy. Mapped from the backend 409 business code so
  // the toast tells the operator what to change, not just that it failed. The
  // fallback covers any other error where the API message is unavailable.
  deleteErrors: {
    WAREHOUSE_HAS_REFERENCES:
      "Can't delete a warehouse that still has stock or racks/bins. Move or remove its stock and locations first, or deactivate the warehouse instead.",
    fallback: 'Failed to delete warehouse',
  },
} as const
