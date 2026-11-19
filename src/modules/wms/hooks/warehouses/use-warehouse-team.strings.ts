// User-facing toast copy for the warehouse-team mutation hooks (§16.12).
//
// One typed source for the add / update / remove success messages surfaced by
// useCreateWarehouseAssignment, useUpdateWarehouseAssignment and
// useRemoveWarehouseAssignment, so the copy stays identical everywhere instead
// of being re-typed inline at each mutation site.
export const USE_WAREHOUSE_TEAM_STRINGS = {
  toasts: {
    memberAdded: "Team member added",
    assignmentUpdated: "Assignment updated",
    memberRemoved: "Team member removed",
  },
} as const;
