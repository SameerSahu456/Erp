// Toast copy for the stock-adjustment hooks (§16.12; hooks never import components).
export const STOCK_ADJUSTMENT_HOOK_STRINGS = {
  created: "Draft adjustment created",
  updated: "Draft saved",
  submitted: "Submitted for approval",
  cancelled: "Adjustment cancelled",
  returnedToDraft: "Returned to draft",
  approved: "Adjustment approved — stock updated",
  rejected: "Adjustment rejected",
  requestFailed: "Request failed",
  templateFile: "stock-adjustment-template.xlsx",
  importAttachFailed:
    "Draft created, but the import file could not be attached. Add it from the Attachments section.",
  labelsFile: (number: string) => `${number}-labels.pdf`,
  labelsPrinted: (printed: number, skipped: number) =>
    skipped > 0
      ? `${printed} label(s) ready · ${skipped} already labelled, skipped`
      : `${printed} label(s) ready`,
  labelsSkippedSerials: (serials: string[]) => `Skipped: ${serials.join(", ")}`,
  labelsNothing: "Every added unit is already labelled — nothing to print.",
} as const;
