import type { components } from "@/shared/api/schema.gen";

import { apiClient, compactParams } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { PAGINATION } from "@/shared/constants";

// Credit notes: per invoice, and the module-wide register.

export type CreditNote = components["schemas"]["CreditNoteResponse"];
export type CreditNotePayload = components["schemas"]["CreditNoteCreate"];

export async function fetchCreditNotes(invoiceId: string): Promise<CreditNote[]> {
  return apiClient.get<CreditNote[]>(
    endpoints.rentals.invoiceCreditNotes(invoiceId),
  );
}

/** POST — give money back on an invoice that STANDS. Not a void: the invoice
 *  stays as issued and no device anchor moves, so nothing re-bills. */
export async function createCreditNote(
  invoiceId: string,
  payload: CreditNotePayload,
): Promise<CreditNote> {
  return apiClient.post<CreditNote>(
    endpoints.rentals.invoiceCreditNotes(invoiceId),
    payload,
  );
}

// ─── The credit-note register ────────────────────────────────────────

export type CreditNoteRegisterRow =
  components["schemas"]["CreditNoteRegisterRow"];

export interface CreditNoteRegisterPage {
  items: CreditNoteRegisterRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreditNoteRegisterParams {
  page?: number;
  page_size?: number;
  q?: string;
}

/** One credit note's page: the note, its invoice number, customer, recorder
 *  and the swap adjustment behind it (null when recorded by hand). */
export type CreditNoteDetail = components["schemas"]["CreditNoteDetail"];

// GET /api/v1/rentals/credit-notes/{id}
export async function fetchCreditNote(creditNoteId: string): Promise<CreditNoteDetail> {
  return apiClient.get<CreditNoteDetail>(endpoints.rentals.creditNote(creditNoteId));
}

// GET /api/v1/rentals/credit-notes — newest first.
export async function fetchCreditNoteRegister(
  params: CreditNoteRegisterParams = {},
): Promise<CreditNoteRegisterPage> {
  return apiClient.get<CreditNoteRegisterPage>(endpoints.rentals.creditNotes, {
    params: compactParams({
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      q: params.q?.trim(),
    }),
  });
}
