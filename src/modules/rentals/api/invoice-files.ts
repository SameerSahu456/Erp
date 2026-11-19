import { apiClient, type BlobResponse } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { filenameFromDisposition } from "@/shared/lib/filename-from-disposition";

// Invoice downloads: the range export, one invoice's PDF, one invoice's JSON.

/** `json` is the Tally "Import-Sales" document; `line_items` is the Line Item
 *  wise Invoices Report (XLSX). */
export type InvoiceExportFormat = "json" | "xlsx" | "pdf" | "line_items";

export type ExportInvoicesParams = {
  /** Issue date, `YYYY-MM-DD`. Both ends INCLUSIVE. */
  date_from: string;
  date_to: string;
  format: InvoiceExportFormat;
};

/** The downloaded file, plus the name the server chose for it. */
export interface InvoiceExportFile {
  blob: Blob;
  filename: string;
}

/** Prefer the server's Content-Disposition name; fall back so a proxy that
 *  strips the header never leaves a file called "download". */
function toExportFile(res: BlobResponse, fallback: string): InvoiceExportFile {
  return { blob: res.blob, filename: filenameFromDisposition(res.headers["content-disposition"]) ?? fallback };
}

// GET /api/v1/rentals/invoices/export
export async function exportRentalInvoices(
  params: ExportInvoicesParams,
): Promise<InvoiceExportFile> {
  const res = await apiClient.getBlob(endpoints.rentals.invoiceExport, { params });
  const ext = params.format === "line_items" ? "xlsx" : params.format;
  return toExportFile(res, `rental-invoices_${params.date_from}_${params.date_to}.${ext}`);
}

// GET /api/v1/rentals/invoices/{id}/pdf
export async function downloadInvoicePdf(
  invoiceId: string,
): Promise<InvoiceExportFile> {
  const res = await apiClient.getBlob(endpoints.rentals.invoicePdf(invoiceId));
  return toExportFile(res, `${invoiceId}.pdf`);
}

// GET /api/v1/rentals/invoices/{id}/export — the Tally voucher JSON that gets filed.
export async function exportInvoiceJson(
  invoiceId: string,
): Promise<InvoiceExportFile> {
  const res = await apiClient.getBlob(endpoints.rentals.invoiceExportOne(invoiceId));
  return toExportFile(res, `${invoiceId}.json`);
}
