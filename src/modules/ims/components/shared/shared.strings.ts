// User-facing copy for shared IMS components (AuditTrail, DeleteWithPreconditionsDialog).
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const IMS_SHARED_STRINGS = {
  warehousePicker: {
    placeholder: "Select warehouse",
    search: "Search warehouses",
  },
  auditTrail: {
    heading: "Audit Trail",
    filterDisabledTitle: "No events of this type on the current page",
    showChanges: "Show changes",
    hideChanges: "Hide changes",
    added: "+ added",
    removed: "− removed",
    loadingAriaLabel: "Loading audit trail",
    loadError: (message: string) => `Couldn't load audit trail: ${message}`,
    loadErrorGeneric: "Failed to load audit trail.",
    empty: "No audit entries found.",
  },
  recordFallback: {
    retry: "Try again",
    notFoundTitle: "Not found",
    notFoundBody: "This record doesn't exist or was removed.",
  },
  deleteDialog: {
    cancel: "Cancel",
    satisfiedAriaLabel: "Satisfied",
    notSatisfiedAriaLabel: "Not satisfied",
    checkRequirements: "Check requirements:",
  },
} as const
