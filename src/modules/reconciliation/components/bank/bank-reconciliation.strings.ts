// User-facing copy for the Reconciliation › bank sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, column headers, empty/error text, and hint copy live here as one
// typed `as const` object. Components import this via a relative path.
export const BANK_RECONCILIATION_STRINGS = {
  page: {
    title: "Bank Reconciliation",
    subtitle:
      "Match bank statements against book entries and resolve differences.",
    breadcrumbs: {
      reconciliation: "Reconciliation",
      bank: "Bank",
    },
    actions: {
      reconcile: "Reconcile",
    },
  },
  stats: {
    bankBalance: "Bank Balance",
    bookBalance: "Book Balance",
    difference: "Difference",
    matchPercent: "Match %",
  },
  bankTransactions: {
    cardTitle: "Bank Transactions",
    columns: {
      date: "Date",
      description: "Description",
      type: "Type",
      amount: "Amount",
      status: "Status",
    },
    empty: {
      title: "No bank transactions",
      description: "Import a bank statement to begin reconciliation.",
    },
  },
  bookEntries: {
    cardTitle: "Book Entries",
    columns: {
      date: "Date",
      description: "Description",
      debit: "Debit",
      credit: "Credit",
      ref: "Ref",
    },
    empty: {
      title: "No book entries",
      description: "Bank ledger has no postings for this period.",
    },
  },
  actions: {
    matchSelected: "Match Selected",
    unmatch: "Unmatch",
    clearSelection: "Clear Selection",
  },
  hints: {
    selectBoth:
      "Select a bank transaction and a book entry to match.",
    selectBookEntry:
      "Now select a book entry to pair with it.",
    alreadyMatched:
      "This transaction is already matched — use Unmatch to release it.",
    readyToMatch: "Ready to match.",
  },
} as const
