/** Field-level problems for the customer PO's paper (§16.12 — lib never
 *  imports components, so its copy lives beside it). */
export const PO_PAPER_VALIDATION_STRINGS = {
  numberRequired: "Enter the PO No.",
  dateRequired: "Enter the PO Date",
  fileRequired: "Attach the PO document",
  validToRequired: "Enter the date the PO is valid until",
  validToBeforeOrderEnd: (end: string) =>
    `The PO must run at least to the order's end date (${end}).`,
  validFromAfterTo: "The PO's start must be on or before its end",
} as const;
