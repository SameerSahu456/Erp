import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

import { notifyMutationError } from "@/shared/api/notify-mutation-error";
import { saveBlob } from "@shared/lib/saveBlob";

import {
  downloadInvoicePdf,
  exportInvoiceJson,
  exportRentalInvoices,
  type InvoiceExportFile,
} from "../../api/invoice-files";

// Downloads are mutations (§6.8): one error surface, the backend's message.

const save = (file: InvoiceExportFile) => saveBlob(file.blob, file.filename);

/** One invoice's Tally voucher JSON — what gets FILED for an invoice. */
export function useDownloadInvoiceJson() {
  return useMutation({
    mutationFn: (invoiceId: string) => exportInvoiceJson(invoiceId),
    onSuccess: save,
    onError: notifyMutationError,
  });
}

/** The register export for an issue-date window, in the chosen format. */
export function useExportInvoices() {
  return useMutation({
    mutationFn: exportRentalInvoices,
    onSuccess: save,
    onError: notifyMutationError,
  });
}

/** One billing-run day as its Tally JSON: a range whose ends are equal. */
export function useDownloadAutoDay() {
  return useMutation({
    mutationFn: (day: string) =>
      exportRentalInvoices({ date_from: day, date_to: day, format: "json" }),
    onSuccess: save,
    onError: notifyMutationError,
  });
}

// `PdfPreview` reloads whenever `load` changes identity, so these stay stable
// per input (useCallback is load-bearing, not a perf hint).

/** Loader for one invoice's PDF, for `<PdfPreview load>`. */
export function useInvoicePdfLoader(invoiceId: string) {
  return useCallback(
    async () => (await downloadInvoicePdf(invoiceId)).blob,
    [invoiceId],
  );
}

/** Loader for a window's combined PDF, for `<PdfPreview load>`. */
export function useInvoiceRangePdfLoader(from: string | undefined, to: string | undefined) {
  return useCallback(
    async () =>
      (
        await exportRentalInvoices({
          date_from: from ?? "",
          date_to: to ?? "",
          format: "pdf",
        })
      ).blob,
    [from, to],
  );
}
