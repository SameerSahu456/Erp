/** Rental agreement stage strip copy — where an order stands, and who acts next. */
export const AGREEMENT_STAGES_STRINGS = {
  heading: "Where this rental stands",
  stages: {
    configure: "Configure",
    approve: "Approve",
    dispatch: "Dispatch",
    onRent: "On rent",
    return: "Return",
  },
  // Under each stage: what it means right now.
  detail: {
    configurePending: "Billing terms to set",
    configureDone: "Billing terms set",
    approvePending: "Awaiting approval",
    approveDone: "Approved",
    dispatchReady: "Ready to dispatch",
    dispatchPartially: "Partially dispatched",
    dispatchDone: "Dispatched",
    onRent: (out: number, total: number) => `${out} of ${total} on rent`,
    onRentSomeBack: (out: number, total: number) => `${out} of ${total} on rent · ${total - out} back`,
    onHold: "On hold",
    dueSoon: "Alert — due back soon",
    overdue: "Overdue",
    returnPartially: "Partially returned",
    returnDone: "All returned",
    finalInvoice: "All back — final invoice due",
    closed: "Closed",
    terminated: "Terminated early",
  },
  // One line under the strip: the next thing that has to happen, and who does it.
  next: {
    configure: "Next: the accounts team sets the billing terms.",
    approve: "Next: the accounts team approves the agreement — then the warehouse can ship.",
    dispatch: "Next: the warehouse issues and dispatches the units.",
    onRent: "On rent and billing. Returns are raised from Rental Returns.",
    onHold: "On hold — billing is paused until the hold is lifted.",
    return: "Units are coming back — the rest stay on rent and keep billing.",
    finalInvoice: "Every unit is back. The next billing run raises the final invoice, then the agreement closes.",
    someBack: "Some units are back; the rest stay on rent and keep billing.",
    done: "Nothing left to do on this rental.",
  },
} as const
