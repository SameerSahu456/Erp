import { useState } from "react";

import { useDownloadInvoiceJson } from "./useInvoiceFiles";
import { useRequestInvoiceDelete } from "./useRentalInvoices";

/** The invoice detail's header actions: PDF preview toggle, JSON download
 *  (what gets FILED is the Tally voucher) and the delete request, which
 *  waits for approval — the invoice stays on screen. */
export function useInvoiceDetailActions(invoiceId: string) {
  // The dialog fetches the FILE, so what is on screen is what downloads.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const download = useDownloadInvoiceJson();
  const requestDelete = useRequestInvoiceDelete();

  return {
    previewOpen,
    setPreviewOpen,
    togglePreview: () => setPreviewOpen((v) => !v),
    downloading: download.isPending,
    download: () => download.mutate(invoiceId),
    deleteOpen,
    setDeleteOpen,
    requestingDelete: requestDelete.isPending,
    /** Resolves on success; rejects (dialog stays open) on failure. */
    requestDelete: async (reason: string) => {
      await requestDelete.mutateAsync({ invoiceId, reason });
    },
  };
}

export type InvoiceDetailActions = ReturnType<typeof useInvoiceDetailActions>;
