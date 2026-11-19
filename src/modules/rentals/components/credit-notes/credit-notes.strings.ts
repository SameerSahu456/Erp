/** One credit note's page (§16.12). */
export const CREDIT_NOTE_STRINGS = {
  title: (number: string | null) => (number ? `Credit note ${number}` : "Credit note (not issued in Tally)"),
  loadError: "Could not load this credit note.",
  openInvoice: "Open invoice",
  openAdjustment: "Open adjustment",
  facts: {
    date: "CN date",
    invoice: "Invoice",
    account: "Account",
    source: "Source",
    recordedBy: "Recorded by",
    reason: "Reason",
  },
  source: { adjustment: "Swap adjustment", manual: "Recorded on the invoice" },
  amounts: { taxable: "Taxable", gst: "GST", total: "Total" },
  linesTitle: "Credited lines",
  line: (part: string, serial: string) => `${part} · ${serial}`,
  lineGst: (rate: string, amount: string) => `GST ${rate}% · ${amount}`,
  lineInvoiced: (amount: string) => `Invoiced ${amount}`,
} as const
