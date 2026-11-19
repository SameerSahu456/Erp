/** Kit ticks at dispatch and the kit check at return (return-by-count §9). */
export const KITS_STRINGS = {
  open: "Kit",
  dispatchTitle: "What went out with this unit",
  dispatchBody: "Tick each item packed with the unit. The return is checked against this list.",
  returnTitle: "Kit check",
  returnBody:
    "Was each item returned, and does it work? A missing or broken item goes to sales to charge.",
  noDispatchRecord:
    "No dispatch record for this unit — checked against the model's kit template instead.",
  empty: "This model has no kit list.",
  returned: "Returned",
  working: "Working",
  raised: "Sent to sales",
  save: "Save",
  cancel: "Cancel",
  saved: "Kit saved",
  loadFailed: "Could not load the kit.",
  loading: "Loading the kit…",
  yes: "Yes",
  no: "No",
  undecided: "Answer returned / working for every item.",
} as const
