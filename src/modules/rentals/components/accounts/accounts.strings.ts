/** Rental accounts copy (§16.12): the accounts list and the account's
 *  Billings tab that CRM's account page embeds. */
const ACCOUNT = {
  tabLabel: "Billings",
  title: "Rental billing defaults",
  description:
    "These cascade onto every rental sales order configured for this account. Existing orders keep the terms they were configured with.",
  save: "Save defaults",
  loadError: "Could not load this account's billing defaults.",
  edit: "Edit defaults",
  dialogTitle: "Rental billing defaults",
  dialogDescription:
    "These cascade onto every rental sales order configured for this account afterwards. Existing orders keep the terms they were configured with.",
  // Shown when the account has no saved row — everything on screen is
  // what the system would use, not what anyone chose.
  unsavedTitle: "Using system defaults",
  unsavedBody:
    "Nobody has set this account's billing defaults. Rental orders for it that are never configured individually will not be billed. Save to make these the account's terms.",
  labels: {
    // rental-billing's labels — the names end users already know
    // (comprint-erp-docs/modules/rentals/legacy-parity/spec.md §1.1).
    cycle: "Billing Type",
    customDays: "Interval in days",
    mode: "Billing Mode",
    billingDay: "Billing Day",
    issueDay: "Bill Issue Day",
    invoicing: "Invoicing Mode",
    creditDays: "Credit Terms (days)",
  },
  onBoundary: "On the billing day",
  daysSuffix: "days",
} as const;

/** The Billings tab's "Billing clerks" card, and the same names on an agreement. */
const CLERKS = {
  title: "Billing clerks",
  description: "The people who raise and follow up this account's rental invoices.",
  edit: "Edit clerks",
  empty: "No billing clerk named",
  emptyHint: "Name who handles this account's rental billing.",
  loadError: "Could not load this account's billing clerks.",
  dialogTitle: "Billing clerks",
  dialogDescription:
    "Pick everyone who handles this account's rental billing. They are shown on the account and on each of its agreements.",
  pickerLabel: "Clerks",
  pickerPlaceholder: "Search users",
  maxHint: (max: number) => `Up to ${max} people.`,
  tooMany: (max: number) => `Pick at most ${max} people.`,
  cancel: "Cancel",
  save: "Save clerks",
} as const;

export const ACCOUNTS_STRINGS = {
  account: ACCOUNT,
  clerks: CLERKS,
  accounts: {
    title: "Rental accounts",
    description:
      "The accounts list, filtered to accounts that have or had a rental order, or whose rental billing defaults are set.",
  },
  days: (n: number) => `${n} ${ACCOUNT.daysSuffix}`,
} as const;
