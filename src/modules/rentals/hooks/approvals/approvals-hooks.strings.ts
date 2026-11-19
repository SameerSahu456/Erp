/** Toasts for termination / invoice-deletion decisions (§16.12). */
export const APPROVALS_HOOKS_STRINGS = {
  approved: "Approved and carried out",
  approvedWaived: "Termination approved and its early-exit charge waived",
  rejected: "Request rejected — nothing changed",
  withdrawn: "Request withdrawn",
  scheduled: (date: string) => `Termination approved — scheduled for ${date}`,
  scheduleCancelled: "Scheduled termination cancelled — the order runs to its end date",
  extendApproved: "Rate change approved — the order is extended at the new rates",
  extendRejected: "Rate change rejected — nothing changed",
} as const
