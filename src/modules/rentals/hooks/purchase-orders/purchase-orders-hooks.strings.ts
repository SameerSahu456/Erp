/** Toasts the purchase-order hooks raise (§16.12, §6.9.5 — hooks never import components). */
export const PURCHASE_ORDER_HOOK_STRINGS = {
  toasts: {
    recorded: "PO recorded",
    awaiting: "Order marked Awaiting PO — nothing is billed until the PO is entered",
    extended: (numbers: string[]) =>
      numbers.length
        ? `PO extended — raised ${numbers.join(", ")}`
        : "PO extended — nothing due to invoice yet",
    extendedAwaiting: "PO period extended — nothing is billed until the PO is entered",
    detailsRecorded: (numbers: string[]) =>
      numbers.length
        ? `PO recorded — raised ${numbers.join(", ")}`
        : "PO recorded — nothing due to invoice yet",
    sentForApproval: "Sent for approval — nothing changes until it is approved",
    approved: (numbers: string[]) =>
      numbers.length ? `Approved — raised ${numbers.join(", ")}` : "Approved",
    rejected: "Extension rejected",
  },
  renewal: {
    saved: "PO renewal email saved",
  },
} as const;
