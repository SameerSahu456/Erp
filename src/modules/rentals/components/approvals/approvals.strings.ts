// Rentals → Approvals: the one page that holds every rental approval queue.
export const APPROVALS_STRINGS = {
  title: "Approvals",
  switchLabel: "Approval type",
  types: {
    "early-exit": "Early exit",
    po: "PO",
    "invoice-delete": "Invoice delete",
    agreements: "New agreements",
    "rate-change": "Rate change",
  },
  // Extends that carry new rates (`rentals:extend_approve`, 2026-11-16).
  rateChange: {
    subtitle:
      "Extends that change what a customer is charged. Approving extends the order at the new rates; rejecting changes nothing, the end date included.",
    columns: {
      order: "Order",
      customer: "Customer",
      endDate: "End date",
      ratesFrom: "New rates from",
      units: "Units",
      requestedBy: "Requested by",
      raised: "Raised",
      actions: "Actions",
    },
    endMove: (from: string, to: string) => `${from} → ${to}`,
    empty: {
      title: "No rate changes waiting",
      description: "An extend that changes a rate appears here until it is approved or rejected.",
    },
    loadError: "Could not load the rate changes waiting for approval.",
    approveTitle: "Approve rate change",
    rejectTitle: "Reject rate change",
    approveWarning:
      "Approving extends the order to the new end date and charges these rates from the date shown. Invoices already raised are not changed.",
    rejectWarning: "Rejecting changes nothing on the order — not the rates, not the end date.",
    ratesHeading: "New rates",
    oneUnit: "One unit only — extended from Device Tracking.",
    rateLine: (today: string, next: string, units: number) =>
      `${today} → ${next} · ${units} ${units === 1 ? "unit" : "units"}`,
    todayUnknown: "Current rate unavailable",
    unknownLine: "A line no longer on the order",
    rejectNeedsNotes: "Say why it is rejected — the requester acts on it.",
  },
  // Termination / invoice-deletion queues (2026-11-14).
  actions: {
    invoiceDeleteSubtitle:
      "Invoice deletions waiting for a decision. Approving voids the invoice and hands its period back.",
    tabs: { pending: "Pending", approved: "Approved", rejected: "Rejected", all: "All" },
    columns: {
      order: "Order",
      customer: "Customer",
      detail: "What",
      reason: "Reason",
      requestedBy: "Requested by",
      status: "Status",
      raised: "Raised",
    },
    terminationDetail: (date: string) => `End on ${date}`,
    invoiceDetail: (number: string) => `Void ${number}`,
    empty: {
      title: "Nothing here",
      description: "Requests raised from an order or an invoice appear here until they are decided.",
    },
    loadError: "Could not load these requests.",
    status: {
      pending: "Pending",
      scheduled: "Scheduled",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Withdrawn",
    },
    decideTitle: { terminate: "Termination request", invoice_delete: "Invoice deletion request" },
    approveWarning: {
      terminate: "Approving ends this rental on the requested date and raises its final invoice. This cannot be undone.",
      invoice_delete: "Approving voids this invoice and hands its period back. The number stays consumed.",
    },
    // A termination dated ahead is scheduled, not carried out (2026-11-15).
    approveScheduledWarning: (date: string) =>
      `Approving schedules this termination for ${date}. Until then the order runs and bills no further than that day; on it, the rental ends and its final invoice is raised.`,
    rejectNeedsNotes: "Say why it is rejected — the requester acts on it.",
    // A termination is decided with its early-exit charge (2026-11-15).
    chargeLabel: "Early-exit charge",
    chargeLine: (amount: string, waiveAsked: boolean) =>
      waiveAsked ? `${amount} — the requester asks for it to be waived` : `${amount} — billed on the final invoice`,
    approveCharge: "Approve — charge stands",
    approveAndWaive: "Approve and waive charge",
  },
  // New-SO configurations awaiting approval (`rentals:agreement_approve`).
  agreements: {
    subtitle:
      "Configured rental orders waiting for their terms to be approved. Open one to approve or send it back.",
    tabs: { waiting: "Waiting" },
    columns: { order: "Order", customer: "Customer", start: "Start", end: "End", status: "Status" },
    empty: {
      title: "Nothing waiting",
      description: "A rental order appears here once it is configured, until its terms are approved.",
    },
    loadError: "Could not load the configurations waiting for approval.",
  },
  // The banner on the order / invoice a request is against.
  banner: {
    termination: (date: string) => `Termination to ${date} is waiting for approval`,
    scheduled: (date: string) => `Terminates on ${date}`,
    scheduledHelp:
      "Approved. The order runs and bills up to that day, and is terminated on it — its final invoice is raised then.",
    cancelScheduled: "Cancel termination",
    invoiceDelete: "Deleting this invoice is waiting for approval",
    raised: (who: string, when: string, reason: string) => `Requested by ${who} on ${when}: ${reason}`,
    openQueue: "Open in Approvals",
    withdraw: "Withdraw",
  },
} as const
