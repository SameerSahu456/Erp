import { useParams } from "react-router-dom";

import { DetailPageShell } from "@/components/page-shells";
import { asUuid } from "@shared/lib/validation";

import type { RentalInvoiceDetail } from "../../api/invoices";
import { usePendingActionRequest } from "../../hooks/approvals/useActionRequests";
import { useInvoiceDetailActions } from "../../hooks/invoices/useInvoiceDetailActions";
import { PendingActionBanner } from "../approvals/PendingActionBanner";
import { useRentalInvoice } from "../../hooks/invoices/useRentalInvoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { InvoiceCreditNotesCard } from "./InvoiceCreditNotesCard";
import { InvoiceHeaderActions } from "./InvoiceHeaderActions";
import { InvoiceLinesTable } from "./InvoiceLinesTable";
import { InvoicePdfDialog } from "./InvoicePdfDialog";
import { InvoiceSummaryCard } from "./InvoiceSummaryCard";
import { RecordDetailFallback } from "../shared/RecordDetailFallback";

const LIST = "/rentals/invoices";
const D = S.invoices.detail;

function InvoiceDetail({ invoice }: { invoice: RentalInvoiceDetail }) {
  const actions = useInvoiceDetailActions(invoice.id);
  const lines = invoice.line_items ?? [];
  // The server says whether this invoice may be voided, and why not — the
  // same function the DELETE guard runs (§8.2).
  const voided = invoice.deleted_at !== null;
  const blockedReason = invoice.delete_blocked_reason;
  // A deletion waiting for approval (2026-11-14): the invoice stands until then.
  const pendingDelete = usePendingActionRequest({
    subject: "invoice_delete",
    rental_invoice_id: voided ? undefined : invoice.id,
  });

  return (
    <DetailPageShell
      title={invoice.invoice_number}
      backHref={LIST}
      // Once voided the badge says so; the reason underneath would be noise.
      status={voided ? { label: S.invoices.voided, variant: "error" } : undefined}
      subtitle={!voided && blockedReason ? D.deleteBlocked(blockedReason) : undefined}
      actions={
        <InvoiceHeaderActions
          actions={actions}
          invoiceNumber={invoice.invoice_number}
          blocked={!!blockedReason}
          pendingDelete={!!pendingDelete}
        />
      }
    >
      {/* Mounted only while open, so closing drops the PDF and its object URL. */}
      {actions.previewOpen ? (
        <InvoicePdfDialog
          open
          onOpenChange={actions.setPreviewOpen}
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
        />
      ) : null}
      <div className="space-y-6">
        <PendingActionBanner request={pendingDelete} />
        <InvoiceSummaryCard invoice={invoice} />
        <InvoiceLinesTable lines={lines} />
        <InvoiceCreditNotesCard invoiceId={invoice.id} lines={lines} voided={voided} />
      </div>
    </DetailPageShell>
  );
}

/** One raised invoice. The route id is validated first (§11.1): a malformed
 *  id renders not-found without fetching. */
export function RentalInvoiceDetailBody() {
  const { invoiceId: rawId } = useParams<{ invoiceId: string }>();
  const invoiceId = asUuid(rawId);
  const query = useRentalInvoice(invoiceId);
  if (!query.data) {
    return <RecordDetailFallback query={query} title={D.title} backHref={LIST} loadError={D.loadError} />;
  }
  return <InvoiceDetail invoice={query.data} />;
}
