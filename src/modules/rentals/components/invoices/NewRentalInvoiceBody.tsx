import { FormPageShell } from "@/components/page-shells";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";

import { useNewRentalInvoice } from "../../hooks/invoices/useNewRentalInvoice";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { invoiceTotals } from "./new-invoice-helpers";
import { NewInvoiceDetailsSection } from "./NewInvoiceDetailsSection";
import { NewInvoiceLinesSection } from "./NewInvoiceLinesSection";
import { NewInvoiceOrdersSection } from "./NewInvoiceOrdersSection";

const N = S.newInvoice;

/** Raise one invoice now, for chosen orders, up to a chosen day.
 *
 *  A billing run scoped to those orders, not a hand-typed invoice: the
 *  engine prices the lines and the units' anchors advance, so nothing here
 *  lets you type a line a figure could disagree with. */
export function NewRentalInvoiceBody() {
  const f = useNewRentalInvoice();
  const lines = f.priced?.line_items ?? [];
  const totals = invoiceTotals(lines, f.priced?.total);

  return (
    <FormPageShell
      title={N.title}
      backHref="/rentals/invoices"
      saveLabel={N.save}
      onSave={f.save}
      onCancel={f.cancel}
      saving={f.raise.isPending}
      // Nothing priced above zero is no invoice; the API would refuse it.
      canSave={totals.total > 0 && f.pricingSettled}
      isDirty={f.isDirty}
      footerLeft={
        <Typography variant="body" tone="muted">
          {S.newInvoice.footerTotal(formatINR(totals.total))}
        </Typography>
      }
    >
      <div className="space-y-6">
        <NewInvoiceDetailsSection form={f} period={f.priced?.period ?? undefined} />
        <NewInvoiceOrdersSection
          hasAccount={!!f.account}
          loading={f.orders.isLoading}
          error={f.orders.error}
          onRetry={() => void f.orders.refetch()}
          rows={f.selectable}
          selected={f.selected}
          skippedIds={f.priced?.skipped_order_ids ?? []}
          onToggle={f.toggle}
        />
        <NewInvoiceLinesSection
          pricing={f.preview.isFetching}
          error={f.preview.error}
          onRetry={() => void f.preview.refetch()}
          lines={lines}
          totals={totals}
        />
      </div>
    </FormPageShell>
  );
}
