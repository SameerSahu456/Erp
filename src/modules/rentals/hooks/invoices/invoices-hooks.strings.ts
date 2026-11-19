/** Toasts the invoice hooks raise (§16.12, §6.9.5 — hooks never import components). */
export const INVOICES_HOOKS_STRINGS = {
  raised: (number: string) => `Invoice ${number} raised`,
  invoiceDeleteRequested: "Deletion sent for approval. The invoice stays until it is approved.",
  creditNoteRecorded: "Credit note recorded — the invoice is unchanged",
} as const;
