import { EMPTY_VALUE } from "@/shared/constants";

import type { RentalInvoiceLine } from "../../api/invoices";

/** `YYYY-MM-DD` → `DD-MM-YYYY`, the way the printed invoice reads. */
export function invoiceDay(iso: string | null | undefined): string {
  if (!iso) return EMPTY_VALUE;
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** Net value of a line. `rate` on a stored line is the LINE AMOUNT, not a
 *  unit price — the total never multiplies by `qty`. */
export function lineValue(line: RentalInvoiceLine): number {
  return Number(line.rate ?? 0);
}

/** The line's value grossed up by its GST. */
export function lineAmount(line: RentalInvoiceLine): number {
  return lineValue(line) * (1 + Number(line.gst ?? 0) / 100);
}

/** A grouped line's serials, one per entry. */
export function lineSerials(line: RentalInvoiceLine): string[] {
  return (line.serial ?? "").split(", ").filter(Boolean);
}
