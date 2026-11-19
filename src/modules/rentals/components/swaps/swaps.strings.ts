/** Serial swaps copy (return-by-count §7). Adjustment copy lives in
 *  `billing-adjustments/billing-adjustments.strings.ts`. */
export const SWAPS_STRINGS = {
  list: {
    title: "Serial swaps",
    subtitle:
      "The customer returned one unit but meant another — on the same order or a different one. A swap re-binds the units; the rental product manager approves it.",
    newSwap: "Propose swap",
    tabs: { pending: "Awaiting approval", approved: "Approved", rejected: "Rejected", all: "All" },
    columns: { reason: "Reason", pairs: "Units", status: "Status", raised: "Proposed", adjustment: "Credit due" },
    pairs: (n: number) => `${n} ${n === 1 ? "pair" : "pairs"}`,
    adjustmentYes: "Yes",
    empty: { title: "No swaps here", description: "Swaps proposed from a rental return appear here." },
    loadError: "Could not load swaps.",
  },
  form: {
    title: "Propose a serial swap",
    subtitle:
      "Pair each unit the return was raised for with the unit that actually came back. Both must be the same model on this customer.",
    customer: "Customer",
    customerPlaceholder: "Search a customer",
    returned: "Unit the return was raised for",
    returnedPlaceholder: "Search returned units",
    staying: "Unit that actually came back",
    stayingPlaceholder: "Search units on rent",
    addPair: "Add pair",
    removePair: "Remove pair",
    reason: "Reason",
    reasonPlaceholder: "e.g. the return was raised for the other laptop",
    submit: "Send for approval",
    finalizeFirst:
      "A swap can be proposed once the return batch is finalized — the unit the return was raised for must be settled as returned.",
    pairIncomplete: "Pick both units for every pair.",
  },
  detail: {
    title: "Serial swap",
    loadError: "Could not load this swap.",
    pairsHeading: "Pairs",
    decisionNotes: "Decision notes",
    returnedWas: (serial: string) => `Return raised for: ${serial}`,
    stayingWas: (serial: string) => `Actually came back: ${serial}`,
    /** The pair's footnote: rate difference and settle day, whichever exist. */
    pairMeta: (rateDiff: string | null, settledOn: string | null) =>
      [rateDiff && `Rate difference ${rateDiff}/month`, settledOn && `Settles on ${settledOn}`]
        .filter(Boolean)
        .join(" · "),
    /** Proposed day, and the decided day once there is one. */
    timeline: (proposed: string, decided: string | null) =>
      decided ? `Proposed ${proposed} · Decided ${decided}` : `Proposed ${proposed}`,
    adjustment: "View credit due",
    decideTitle: (approve: boolean) => (approve ? "Approve this swap?" : "Reject this swap?"),
    decideBody: (approve: boolean) =>
      approve
        ? "Re-binds the units. If the meant order was billed past the return, a credit note becomes due to accounts."
        : "Nothing changes; the units stay as received.",
  },
} as const
