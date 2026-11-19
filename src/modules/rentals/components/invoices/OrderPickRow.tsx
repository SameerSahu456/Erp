import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";

import type { RentalSalesOrderRow } from "../../api/sales-orders";
import { formatRentalDay } from "../../lib/format";
import { INVOICE_STRINGS as S } from "./invoices.strings";

/** One configured order the invoice can bill, with its pick box. */
export function OrderPickRow({
  row,
  checked,
  skipped,
  onToggle,
}: {
  row: RentalSalesOrderRow;
  checked: boolean;
  /** Picked, but the engine found nothing to bill up to that day. */
  skipped: boolean;
  onToggle: (id: string) => void;
}) {
  const inputId = `so-${row.sales_order_id}`;
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-md border border-border px-3 py-2">
      <Checkbox id={inputId} checked={checked} onCheckedChange={() => onToggle(row.sales_order_id)} />
      <Label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer font-normal">
        <Typography variant="body-strong" asChild>
          <span>{row.order_number}</span>
        </Typography>
        <Typography variant="helper" tone="muted">
          {S.newInvoice.orderMeta(
            formatINR(Number(row.monthly_rate)),
            row.device_count,
            formatRentalDay(row.last_billed_date),
          )}
        </Typography>
      </Label>
      {skipped ? (
        <Typography variant="helper" tone="muted" className="shrink-0">
          {S.newInvoice.orders.skipped}
        </Typography>
      ) : null}
    </li>
  );
}
