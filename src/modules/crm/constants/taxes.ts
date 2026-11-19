// Single source of truth for the default tax rate applied to quote/sales-order
// line items. Lives at the shared layer so every form picks up the same value
// without copy/pasting `18`. Change here and every new line on every form
// reflects the new default — already-saved rows keep whatever rate they were
// stored with (rate is a per-row column on the backend).
//
// Currently fixed at 18 (GST default) per business policy 2026-05-06. If we
// later need per-state or per-HSN rates, this becomes a lookup function — but
// the import surface (`TAXES.DEFAULT_TAX_RATE`) stays the same.
export const TAXES = {
  DEFAULT_TAX_RATE: 18,
} as const;
