/** Toasts the configuration hooks raise (§16.12, §6.9.5 — hooks never import components). */
export const CONFIGURATION_HOOKS_STRINGS = {
  settingsSaved: "Billing defaults saved",
  billingRun: (n: number) =>
    n === 0
      ? "Nothing was due — no invoices raised"
      : `${n} invoice(s) raised`,
} as const;
