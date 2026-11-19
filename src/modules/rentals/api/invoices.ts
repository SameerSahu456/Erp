import type { components } from "@/shared/api/schema.gen";

import { apiClient, compactParams } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { PAGINATION } from "@/shared/constants";

// The rental invoice register, one invoice, and raising one by hand.

/** One priced line. `rate` is the line's AMOUNT for its period; `monthlyRate`
 *  carries the monthly figure. The generated type leaves lines untyped. */
export interface RentalInvoiceLine {
  part?: string | null;
  serial?: string | null;
  description?: string | null;
  hsn?: string | null;
  period?: string | null;
  qty?: number;
  rate?: string;
  monthlyRate?: string | null;
  gst?: string;
  [key: string]: unknown;
}

/** One order an invoice bills — the number to read, the id to link. */
export type InvoiceOrderRef = components["schemas"]["InvoiceOrderRef"];

/** One raised invoice, in full. Lines are GROUPED by charge, so `serial` may
 *  hold hundreds of values; `delete_blocked_reason` mirrors the DELETE guard. */
export type RentalInvoiceDetail = Omit<
  components["schemas"]["RentalInvoiceResponse"],
  "line_items"
> & { line_items: RentalInvoiceLine[] };

// GET /api/v1/rentals/invoices/{id}
export async function fetchRentalInvoice(
  invoiceId: string,
): Promise<RentalInvoiceDetail> {
  return apiClient.get<RentalInvoiceDetail>(
    endpoints.rentals.invoice(invoiceId),
  );
}

// ─── Raising an invoice by hand ──────────────────────────────────────
// A billing run scoped to chosen orders: same engine, anchors advance.

export type AdhocInvoiceRequest = components["schemas"]["AdhocInvoiceRequest"];

/** What saving would charge (GST-inclusive); `skipped_order_ids` contribute nothing. */
export type AdhocInvoicePreview = Omit<
  components["schemas"]["AdhocInvoicePreview"],
  "line_items"
> & { line_items: RentalInvoiceLine[] };

/** Prices with the real engine inside a rolled-back savepoint. */
export async function previewAdhocInvoice(
  payload: AdhocInvoiceRequest,
): Promise<AdhocInvoicePreview> {
  return apiClient.post<AdhocInvoicePreview>(
    endpoints.rentals.invoicePreview,
    payload,
  );
}

export async function raiseAdhocInvoice(
  payload: AdhocInvoiceRequest,
): Promise<RentalInvoiceRow> {
  return apiClient.post<RentalInvoiceRow>(endpoints.rentals.invoices, payload);
}

// ─── The invoice register ────────────────────────────────────────────

export type RentalInvoiceRow = components["schemas"]["RentalInvoiceListItem"];

export interface RentalInvoicesPage {
  items: RentalInvoiceRow[];
  total: number;
  page: number;
  page_size: number;
}

export type RentalInvoiceRegisterSummary = components["schemas"]["RentalInvoiceRegisterSummary"];

export interface FetchInvoicesParams {
  page?: number;
  page_size?: number;
  account_id?: string;
  sales_order_id?: string;
  q?: string;
  /** `-` prefix for descending; unknown keys fall back to newest-first. */
  sort?: string;
  /** Live AND voided together; use `voided_only` for a voided-only view. */
  include_deleted?: boolean;
  voided_only?: boolean;
  /** Inclusive ISSUE-DATE window, `YYYY-MM-DD`. */
  date_from?: string;
  date_to?: string;
}

// GET /api/v1/rentals/invoices
export async function fetchRentalInvoices(
  params: FetchInvoicesParams = {},
): Promise<RentalInvoicesPage> {
  return apiClient.get<RentalInvoicesPage>(endpoints.rentals.invoices, {
    params: compactParams({
      ...params,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      q: params.q?.trim(),
      include_deleted: params.include_deleted ?? false,
      voided_only: params.voided_only ?? false,
    }),
  });
}

/** One day the billing engine ran, as a downloadable batch (manual and voided
 *  invoices excluded, so the count matches the day's file). */
export type AutoInvoiceDay = components["schemas"]["AutoInvoiceDay"];

export interface AutoInvoiceDaysPage {
  items: AutoInvoiceDay[];
  total: number;
}

export interface PageParams {
  page?: number;
  page_size?: number;
}

// GET /api/v1/rentals/invoices/auto-days
export async function fetchAutoInvoiceDays(
  params: PageParams = {},
): Promise<AutoInvoiceDaysPage> {
  return apiClient.get<AutoInvoiceDaysPage>(endpoints.rentals.invoiceAutoDays, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  });
}

/** One invoice resolved for PRINTING — the exact model the PDF renders. */
export type InvoiceDocument = components["schemas"]["InvoiceDocumentOut"];

// GET /api/v1/rentals/invoices/{id}/document
export async function fetchInvoiceDocument(
  invoiceId: string,
): Promise<InvoiceDocument> {
  return apiClient.get<InvoiceDocument>(
    endpoints.rentals.invoiceDocument(invoiceId),
  );
}

// GET /api/v1/rentals/invoices/documents
export async function fetchInvoiceDocuments(params: {
  date_from: string;
  date_to: string;
}): Promise<InvoiceDocument[]> {
  return apiClient.get<InvoiceDocument[]>(endpoints.rentals.invoiceDocuments, {
    params,
  });
}

// GET /api/v1/rentals/invoices/summary
export async function fetchInvoiceRegisterSummary(): Promise<RentalInvoiceRegisterSummary> {
  return apiClient.get<RentalInvoiceRegisterSummary>(
    endpoints.rentals.invoiceSummary,
  );
}
