// User-facing copy for the wired EngineerAssignSelect combobox.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the combobox
// search placeholder and its empty-results text live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX, so the copy
// stays consistent and is edited in one place.
export const ENGINEER_ASSIGN_SELECT_STRINGS = {
  placeholder: "Assign…",
  notReady: "Not at this stage yet",
  searchPlaceholder: "Search engineer…",
  emptyText: "No engineers",
  viewOnly: "View only",
  noEngineersAtWarehouse: "No engineers at this warehouse",
  withdraw: {
    option: "Withdraw — no engineer",
    /** Extra search words that find the withdraw option. */
    keywords: ["unassign", "withdraw"],
    title: "Withdraw this device?",
    description: (name: string) =>
      `${name} will no longer be assigned to this device, and it will be withdrawn from their work assignment. If it was the last device on that assignment, the assignment closes.`,
    confirm: "Withdraw",
  },
} as const;
