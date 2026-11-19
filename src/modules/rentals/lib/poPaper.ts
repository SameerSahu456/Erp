import { PO_PAPER_VALIDATION_STRINGS as V } from "./poPaper.strings";

/** The customer's PO as a form holds it: whether it is in hand, and if so
 *  its number, date and document. An AWAITED PO has none of them — the order
 *  carries on but is not billed until they are entered. */
export interface PoPaper {
  available: boolean;
  poNumber: string;
  /** `YYYY-MM-DD`, or "" when not picked. */
  poDate: string;
  file: File | null;
}

export function emptyPoPaper(today: string): PoPaper {
  return { available: true, poNumber: "", poDate: today, file: null };
}

/** The first thing missing from a PO in hand, or null. An awaited PO needs
 *  nothing. `requireFile` is false only where a document is already on file. */
export function poPaperProblem(paper: PoPaper, { requireFile = true } = {}): string | null {
  if (!paper.available) return null;
  if (paper.poNumber.trim() === "") return V.numberRequired;
  if (paper.poDate === "") return V.dateRequired;
  if (requireFile && !paper.file) return V.fileRequired;
  return null;
}

/** The request fields for the paper: number and date only when in hand. */
export function poPaperPayload(paper: PoPaper): {
  po_available: boolean;
  po_number?: string;
  po_date?: string;
} {
  if (!paper.available) return { po_available: false };
  return { po_available: true, po_number: paper.poNumber.trim(), po_date: paper.poDate };
}

export function isPoPaperTouched(paper: PoPaper): boolean {
  return !paper.available || paper.poNumber !== "" || paper.file !== null;
}

/** The PO's period against the order's: it may run longer, never shorter. */
export function poPeriodProblem(
  validFrom: string,
  validTo: string,
  orderEnd: string | null,
): string | null {
  if (validTo === "") return V.validToRequired;
  if (orderEnd && validTo < orderEnd) return V.validToBeforeOrderEnd(orderEnd);
  if (validFrom !== "" && validFrom > validTo) return V.validFromAfterTo;
  return null;
}
