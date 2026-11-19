import { Download, Loader2 } from "lucide-react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";
import { usePermission } from "@shared/rbac";

import { useDownloadInvoiceJson, useInvoicePdfLoader } from "../../hooks/invoices/useInvoiceFiles";
import { rentalsCan } from "../../permissions";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { PdfPreview } from "./PdfPreview";

const P = S.preview;

export interface InvoicePdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string | null;
}

/**
 * The invoice's real PDF in a near-full-screen viewer, with its Tally voucher
 * one click away. Download hands over the JSON, not the PDF on screen: an
 * invoice is FILED as its voucher, and the label says so.
 */
export function InvoicePdfDialog({ open, onOpenChange, invoiceId, invoiceNumber }: InvoicePdfDialogProps) {
  const title = invoiceNumber ? P.titleFor(invoiceNumber) : P.title;
  // Stable per invoice: the viewer refetches only when it changes.
  const load = useInvoicePdfLoader(invoiceId);
  const download = useDownloadInvoiceJson();
  // GET /invoices/{id}/export's own code — the header Download uses it too.
  const canExport = usePermission().canAny(rentalsCan.exportInvoices);

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      // Tall and wide: an A4 page squeezed into a default dialog is unreadable.
      // `sm:max-w-*` must be overridden — the base dialog's `sm:max-w-sm` wins otherwise.
      className="h-[90vh] max-h-[90vh] sm:max-w-[95vw]"
      // The viewer owns its own scrolling; the body only frames it.
      bodyClassName="overflow-hidden bg-muted p-0"
      footer={
        canExport ? (
          <Button disabled={download.isPending} onClick={() => download.mutate(invoiceId)}>
            {download.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {P.download}
          </Button>
        ) : undefined
      }
    >
      <PdfPreview load={load} title={title} className="size-full" />
    </OperationDialog>
  );
}

export default InvoicePdfDialog;
