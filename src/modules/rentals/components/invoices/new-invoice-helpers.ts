import type { RentalInvoiceLine } from "../../api/invoices";

/** Subtotal / GST / total of a priced preview. Lines carry a NET `rate`
 *  while the total is GST-inclusive, so the GST is the difference. */
export function invoiceTotals(lines: readonly RentalInvoiceLine[], total: string | number | undefined) {
  const subtotal = lines.reduce((sum, l) => sum + Number(l.rate ?? 0), 0);
  const gross = Number(total ?? 0);
  return { subtotal, gst: Math.max(0, gross - subtotal), total: gross };
}

export type InvoiceTotals = ReturnType<typeof invoiceTotals>;
