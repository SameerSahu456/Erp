/** Rental-return scan screen copy (return-by-count spec §5). */
export const RENTAL_SCAN_STRINGS = {
  title: (grn: string) => `Scan returned boxes · ${grn}`,
  subtitle:
    "Scan each box. The customer named models and counts, so the scan decides which unit — and which order — it is.",
  notRental: "This batch is not a rental return.",
  notOpen: "This batch is no longer open for scanning.",
  backToInward: "Back to inward",
  context: {
    customer: "Customer",
    request: "Return request",
    declaredOrder: "Order mentioned",
    none: "—",
  },
  input: {
    label: "Scan or type a serial",
    placeholder: "Comprint barcode or maker's serial, then Enter",
    add: "Add",
    duplicate: "Already scanned in this batch.",
    failed: "Could not check that serial. Try again.",
    /** The saved draft's scans could not be re-checked on open. */
    restoreFailed: "Could not re-check the boxes already saved on this batch. Reload to try again.",
  },
  accepted: {
    heading: "Receiving",
    empty: "No boxes scanned yet.",
    count: (n: number) => `${n} ${n === 1 ? "box" : "boxes"}`,
  },
  held: {
    heading: "Goes to exceptions",
    helper:
      "These are held, not booked into stock. Finalizing opens an inward exception for each, for a person to resolve.",
  },
  row: {
    order: (order: string) => `On ${order}`,
    rate: (rate: string) => `${rate}/month`,
    remove: (serial: string) => `Remove ${serial}`,
    unknownModel: "Model unknown",
  },
  warnings: {
    offDeclared: (order: string, diff: string) =>
      `Not on the order the customer mentioned (${order}) — rate differs by ${diff}/month.`,
    offDeclaredSameRate: (order: string) =>
      `Not on the order the customer mentioned (${order}).`,
    proposeSwap: "Propose swap",
    fullyReturned: (order: string) => `This returns the last unit out on ${order}.`,
    earlyExit: (amount: string) => `Returned before the contracted end — early-exit charge about ${amount}.`,
  },
  footer: {
    save: "Save scans",
    saveAndContinue: "Save & review",
    staged: (accepted: number, held: number) =>
      `${accepted} receiving · ${held} held`,
  },
  unannounced: {
    action: "Boxes arrived with no request",
    title: "Receive an unannounced return",
    description:
      "Opens a return request for the customer automatically, then takes you to scanning.",
    customer: "Customer",
    customerPlaceholder: "Search a customer",
    warehouse: "Receive into warehouse",
    confirm: "Start scanning",
    cancel: "Cancel",
  },
  wizardNote:
    "Rental returns are scanned on the next screen: create the batch, then scan each box. Every scan is checked against what the customer has on rent.",
} as const
