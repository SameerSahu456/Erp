// Copy for customer purchase orders on a rental (legacy-parity spec §3).
// Field names follow rental-billing — "PO needed?", "Extend PO", "PO
// Invoicing" — because the people using this screen learnt them there.

const ratesChanged = (n: number) => `${n} rate change${n === 1 ? "" : "s"}`;
const PO_DATE = "PO Date";

export const PURCHASE_ORDER_STRINGS = {
  tab: "Purchase orders",
  // A heading in the order's Attachments section, one per PO with a paper.
  attachmentsGroup: (poNumber: string | null) =>
    poNumber ? `Customer PO · ${poNumber}` : "Customer PO",
  card: {
    title: "Customer purchase orders",
    description:
      "The PO this order runs on and every extension. The PO's end is the order's end date; invoices quote the PO in force.",
    notRequired:
      "This order is not PO Required. POs recorded here are kept for reference — they do not change its dates or its billing.",
    loadError: "Could not load this order's purchase orders.",
    empty: "No PO recorded yet.",
    record: "Record PO",
    extend: "Extend PO",
    extendPeriod: "Extend period",
    endsOn: (date: string) => `Current PO ends ${date}`,
    invoicing: (label: string) => `PO Invoicing: ${label}`,
  },
  columns: {
    number: "PO No.",
    kind: "Type",
    date: PO_DATE,
    period: "Covers",
    status: "Status",
    raisedBy: "Raised by",
  },
  periodOpen: (to: string) => `Until ${to}`,
  period: (from: string, to: string) => `${from} – ${to}`,
  pendingNote: "Waiting for approval.",
  rejectedNote: (notes: string) => `Rejected: ${notes}`,
  ratesChanged,
  /** The line under a PO number: its kind, date and any rate changes. */
  rowMeta: (kind: string, date: string, rateChanges: number) =>
    [kind, `${PO_DATE} ${date}`, ...(rateChanges > 0 ? [ratesChanged(rateChanges)] : [])].join(" · "),
  document: {
    label: "PO document",
    upload: "Attach PO",
    uploading: "Uploading…",
    uploaded: "PO document attached",
    remove: "Remove document",
    none: "No document attached",
  },
  /** The PO's paper, wherever a PO is entered (configure, record, extend). */
  paper: {
    number: "PO No.",
    date: PO_DATE,
    document: "PO document",
    documentHelp: "PDF or a photo of the page.",
    chooseDocument: "Choose file",
    replaceDocument: "Replace file",
    unavailable: "PO not available yet",
    unavailableHelp:
      "The order carries on as Awaiting PO. Nothing is billed until the PO No. and date are entered; then everything held back is invoiced at once.",
  },
  poPeriod: {
    validFrom: "PO valid from",
    validTo: "PO valid until",
    validToHelp: (end: string) =>
      `Becomes the order's end date. It cannot be before the order's current end (${end}).`,
    // Record PO (a reference PO): its period never moves the order's.
    validToHelpOpen: "Leave empty to use the order's end date. The order's dates do not change.",
  },
  awaitedNumber: "PO awaited",
  awaitedNote: "Not billed until the PO No. and date are entered.",
  enterDetails: "Enter PO details",
  details: {
    title: "Enter PO details",
    description:
      "The customer's PO has arrived. Saving it bills everything held back while it was awaited, dated today.",
    submit: "Save PO details",
  },
  record: {
    title: "Record customer PO",
    // Only offered on an order that is not PO Required (2026-11-16).
    description:
      "Keep the customer's PO on file. The order's dates and billing do not change, and it does not become PO Required.",
    notes: "Notes",
    submit: "Record PO",
    submitAwaiting: "Record without PO details",
  },
  extend: {
    title: "Extend PO",
    description:
      "Move the order onto the customer's next PO. The new PO's end becomes the order's end date, and the period since the old PO ended is invoiced. If the old PO has already lapsed, or the rates change, it waits for approval first.",
    number: "New PO No.",
    validTo: "PO valid until",
    validToHelp: (date: string) =>
      `Must be after the current PO end (${date}). This day is included.`,
    invoicing: "PO Invoicing",
    invoicingHelp:
      "Multiple: one invoice per billing period, each dated today and stating its period. Single: one invoice for the whole new PO period.",
    invoicingFixed: (label: string) =>
      `PO Invoicing: ${label} — the order's setting. Only accounts can change it.`,
    previewSingle: (from: string, to: string, amount: string) =>
      `Single: 1 invoice, ${from} – ${to}, ≈ ${amount} before GST.`,
    previewMultiple: (from: string, amount: string) =>
      `Multiple: one invoice per billing period from ${from} up to today, ≈ ${amount} before GST; then the normal cycle.`,
    previewMultipleNothing:
      "Multiple: nothing extra now — billing carries on in its normal cycle.",
    previewWithNote: (preview: string, ratesChanged: boolean) =>
      ratesChanged
        ? `${preview} Estimate at today's rates; a rate change applies once approved.`
        : preview,
    ratesHeading: "New rates (optional)",
    ratesHelp:
      "Re-price a line from the day after the current PO ends. A rate change waits for approval by the rental manager, accounts or a sales manager — never you — and nothing is invoiced until then.",
    unchanged: "Unchanged",
    unitsAt: (n: number, rates: string) => `${n} on rent at ${rates}`,
    flattenWarning:
      "These units are on different rates today; the new rate replaces all of them.",
    notes: "Notes",
    submit: "Extend PO",
    submitForApproval: "Send for approval",
  },
  decision: {
    approve: "Approve",
    reject: "Reject",
    approveTitle: "Approve this PO extension?",
    approveDescription:
      "The new end date and rates are applied and the catch-up is invoiced now.",
    rejectTitle: "Reject this PO extension?",
    rejectDescription:
      "Nothing is applied. The order stays on its current PO and keeps being chased.",
    notes: "Notes",
    rejectReason: "Reason",
    rejectReasonRequired:
      "Give a reason so the requester knows what to change.",
  },
  approvals: {
    title: "PO approvals",
    description:
      "Extend PO requests that change rates, or extend a PO that had already lapsed. Approving applies them and invoices the catch-up.",
    empty: "Nothing waiting for approval.",
    emptyHint: "Extensions of a PO still in force, without a rate change, are applied straight away.",
    loadError: "Could not load the PO approval queue.",
    columns: {
      order: "Order",
      po: "New PO",
      validTo: "Valid until",
      invoicing: "Invoicing",
      rates: "Rate changes",
      raisedBy: "Raised by",
      raisedOn: "Raised on",
      actions: "",
    },
    viewOrder: "Open order",
  },
  renewal: {
    title: "PO renewal email",
    description:
      "Sent at 30 days, 7 days, on the end date and weekly once overdue, to the customer, the sales person, the rental manager and the mailboxes below. In-app reminders go out either way.",
    enabled: "Send renewal emails",
    smtpMissing:
      "No mail server is configured on this deployment (SMTP_* settings), so nothing is emailed yet.",
    subject: "Subject",
    body: "Message",
    mergeFields: "Merge fields you can use",
    mergeFieldsLine: (fields: readonly string[]) =>
      `Merge fields you can use: ${fields.map((f) => `{${f}}`).join(" ")}`,
    billingEmails: "Rental billing mailboxes",
    rentalSalesEmails: "Rental sales mailboxes",
    emailsHelp: "Comma-separated. Always copied.",
    save: "Save email settings",
    loadError: "Could not load the PO renewal email settings.",
  },
  overdue: {
    badge: (days: number) => `PO Overdue · ${days} d`,
    notInvoiced: (since: string, amount: string) =>
      `Not invoiced since ${since} · ≈ ${amount}`,
    bannerTitle: (since: string) =>
      `PO overdue since ${since} — billing has stopped`,
    bannerBody: (units: number, amount: string) =>
      `${units} unit${units === 1 ? "" : "s"} still out; about ${amount} (before GST) not yet invoiced. Nothing more is billed until the new PO is entered.`,
    extend: "Extend PO",
  },
  list: {
    column: "PO",
    onFile: "PO on file",
    allTab: "All",
    // Orders billed against a customer PO. Orders without a PO whose
    // contract is ending are on the "Contracts ending" tab.
    renewalsTab: "PO renewals due",
    renewalsEmpty: "No PO is due for renewal.",
    renewalsEmptyHint:
      "Orders billed against a customer PO show here from 30 days before the PO ends, and stay while it is overdue. Orders without a PO are on the Contracts ending tab.",
  },
  cancel: "Cancel",
} as const;
