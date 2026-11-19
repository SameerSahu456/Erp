/** Toasts the early-exit hooks raise (§16.12, §6.9.5 — hooks never import components). */
export const EARLY_EXIT_HOOK_STRINGS = {
  waiverRequested: "Sent for approval",
  decided: "Decision recorded",
  lost: "Unit marked lost",
  found: "Unit back on rent",
} as const
