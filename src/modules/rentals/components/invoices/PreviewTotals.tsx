import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";

import { INVOICE_STRINGS as S } from "./invoices.strings";
import type { InvoiceTotals } from "./new-invoice-helpers";

const L = S.newInvoice.lines;

function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between">
      <Typography variant="body" tone="muted">
        {label}
      </Typography>
      <Typography variant="body" numeric>
        {formatINR(amount)}
      </Typography>
    </div>
  );
}

/** Subtotal, GST and the GST-inclusive total of the priced preview. */
export function PreviewTotals({ totals }: { totals: InvoiceTotals }) {
  return (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-1 rounded-md border border-border p-4">
        <TotalRow label={L.subtotal} amount={totals.subtotal} />
        <TotalRow label={L.gst} amount={totals.gst} />
        <div className="flex justify-between border-t border-border pt-1">
          <Typography variant="body-strong">{L.total}</Typography>
          <Typography variant="body-strong" numeric>
            {formatINR(totals.total)}
          </Typography>
        </div>
      </div>
    </div>
  );
}
