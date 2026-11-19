/** Billing copy shared by two or more rentals sub-features (§16.12): the
 *  cadence fields (account defaults + order configure) and a few labels. */
export const BILLING_COMMON_STRINGS = {
  fields: {
    // Labels and help sentences are rental-billing's, word for word — the
    // names end users already know (legacy-parity spec §1.1).
    billingType: "Billing Type",
    customDays: "Interval in days",
    customDaysHelp: "How many days each billing interval runs for.",
    billingDay: "Billing Day",
    billingDayHelp:
      "The day of the month each tenure starts. Defaults from the account, or the 1st.",
    billIssueDay: "Bill Issue Day",
    billIssueDayHelp:
      "Day of the month the invoice is raised. Advance (pre): the first such day on or after the tenure starts. Arrears (post): the first on or after it completes. Blank = the tenure boundary itself.",
    billingMode: "Billing Mode",
    billingModeHelp:
      "Post bills after each period; Pre bills in advance. Defaults from the account.",
    invoicingMode: "Invoicing",
    invoicingModeHelpAccount:
      "Whether this account's orders share one invoice per billing date.",
    invoicingModePlaceholder: "Select how to invoice",
    invoicingModeHelpSo:
      "Starts from this account's default. Changing it here applies to this order only.",
    poRequired: "PO Required",
    poRequiredHelp:
      "Tick when this order runs on the customer's purchase order. You then enter the PO No., date, document and period — or mark it not available yet, and the order runs as Awaiting PO, unbilled until they are entered. Only these orders offer Extend PO.",
    poRequiredLocked:
      "This order is on a customer PO, so PO Required stays ticked. Manage the PO from the agreement's Purchase orders card.",
    poInvoicing: "PO Invoicing",
    poInvoicingHelp:
      "For a PO-needed order: Multiple raises one invoice per billing period of each new PO; Single raises one invoice for the whole PO period.",
    creditPeriod: "Credit Terms (days)",
    creditPeriodHelp:
      "Invoice due date = issue date + this. Defaults from the account.",
  },
  grace: {
    label: "Billing starts after",
    help:
      "Days in transit that are not charged. A unit shipped today starts " +
      "earning after this many days — or from its delivered date, once one " +
      "is recorded. Set 0 to bill from the dispatch day itself.",
  },
  returnGrace: {
    label: "Billing stops before return",
    help:
      "Days in transit on the way back that are not charged. When a unit is " +
      "settled at warehouse arrival, rent stops this many days earlier. Set 0 " +
      "to bill up to the arrival day itself.",
  },
  noDueDate: "No due date",
  salesOrdersLoadError: "Could not load rental sales orders.",
} as const;
