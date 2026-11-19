// Shared fulfillment-count helpers for the SO detail Line Items tab.
//
// The issued-custody "umbrella": awaiting-QC (issued) + ready + qc_failed are
// all physically issued but have not left the building. The backend keeps them
// as non-overlapping buckets; the UI folds them into the one number a CRM
// reader acts on. `returned` is deliberately NOT part of it — a returned unit
// was issued and came back, so counting it would break the arithmetic against
// `ordered`.
//
// Two exported names for the same value (merge of two branches' labels, kept as
// one source of truth): SoItemsTable's per-line sub-row labels it "Issued"
// (`issuedUmbrella`); the SO-wide rollup strip labels it "In progress"
// (`inProgressCount`).
export function issuedUmbrella(c: {
  issued: number
  ready: number
  qc_failed: number
}): number {
  return c.issued + c.ready + c.qc_failed
}

export const inProgressCount = issuedUmbrella
