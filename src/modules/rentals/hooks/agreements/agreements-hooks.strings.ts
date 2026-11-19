/** Toasts the agreements hooks raise (§16.12, §6.9.5 — hooks never import components). */
export const AGREEMENTS_HOOKS_STRINGS = {
  documentUploaded: "Signed document uploaded",
  // The signed-document checklist rows built by useAgreementSignatureChecklist.
  checklist: {
    comprintSigned: "Comprint signed",
    customerSigned: "Customer signed",
    documentUploaded: "Signed document uploaded",
  },
  configured: "Rental billing saved",
  // The configure form waits for the order's POs before it can tell whether
  // ticking PO Required needs a PO entered here.
  poLoading: "Still loading this order's purchase orders — try again in a moment",
  lineCadenceSaved: "Line billing cycle saved",
  lineCadenceCleared: "Line now follows the order's billing cycle",
  approved: "Rental agreement approved — its goods can now be dispatched",
  rejected: "Rental agreement sent back for reconfiguration",
  signatureRecorded: "Signature recorded",
  extended: "Rental period extended",
  terminationRequested: "Termination sent for approval. Nothing changes until it is approved.",
  held: "Order put on hold",
  unheld: "Hold lifted",
  firstInvoiceRaised: (invoiceNumber: string) => `First invoice ${invoiceNumber} raised`,
  // Every unit starts billing after the stub (delivery or grace), so
  // there is nothing to bill yet; the slot stays free.
  firstInvoiceNothing: "Nothing to bill yet — every unit starts after the first billing day",
} as const;
