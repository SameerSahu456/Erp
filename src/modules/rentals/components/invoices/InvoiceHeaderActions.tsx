import { Download, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";

import { ReasonDialog } from "@/components/common/dialogs/ReasonDialog";
import { Button } from "@/components/ui/button";
import { usePermission } from "@shared/rbac";

import { rentalsCan } from "../../permissions";
import type { InvoiceDetailActions } from "../../hooks/invoices/useInvoiceDetailActions";
import { INVOICE_STRINGS as S } from "./invoices.strings";

const D = S.invoices.detail;

/** Preview / Download JSON / Request delete. A blocked void is a dead button —
 *  the server's reason is spelled out under the invoice number. A delete
 *  waits for approval; `pendingDelete` disables a second request. */
export function InvoiceHeaderActions({
  actions,
  invoiceNumber,
  blocked,
  pendingDelete,
}: {
  actions: InvoiceDetailActions;
  invoiceNumber: string;
  blocked: boolean;
  pendingDelete: boolean;
}) {
  const PreviewIcon = actions.previewOpen ? EyeOff : Eye;
  const { canAny } = usePermission();
  // Download goes through the export endpoint and delete voids a financial
  // record — each its own grant, so neither is offered to a reader.
  const canExport = canAny(rentalsCan.exportInvoices);
  const canDelete = canAny(rentalsCan.deleteInvoice);
  return (
    <>
      {/* The eye gains a slash while open: the button says what the next click does. */}
      <Button variant="outline" size="sm" onClick={actions.togglePreview}>
        {S.preview.action}
        <PreviewIcon className="size-4" data-icon="inline-end" />
      </Button>
      {canExport ? (
        <Button variant="outline" size="sm" onClick={actions.download} disabled={actions.downloading}>
          {actions.downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {S.preview.download}
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          variant="destructive"
          size="sm"
          disabled={blocked || pendingDelete || actions.requestingDelete}
          onClick={() => actions.setDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          {D.delete}
        </Button>
      ) : null}
      {actions.deleteOpen ? (
        <ReasonDialog
          copy={{
            title: D.deleteTitle,
            body: D.deleteDescription(invoiceNumber),
            reasonLabel: D.deleteReasonLabel,
            reasonPlaceholder: D.deleteReasonPlaceholder,
            confirm: D.deleteConfirm,
            dismiss: D.deleteCancel,
          }}
          pending={actions.requestingDelete}
          onConfirm={actions.requestDelete}
          onClose={() => actions.setDeleteOpen(false)}
        />
      ) : null}
    </>
  );
}
