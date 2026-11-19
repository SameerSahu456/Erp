import { ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

import type { RentalInvoiceLine } from "../../api/invoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { InvoiceLineRow } from "./InvoiceLineRow";

const COL = S.invoices.detail.columns;
const HEADERS = [
  COL.part,
  COL.serial,
  COL.description,
  COL.hsn,
  COL.qty,
  COL.ratePerMonth,
  COL.value,
  COL.gst,
  COL.amount,
] as const;
/** Headers from Qty on are figures, right-aligned. */
const FIRST_NUMERIC = 4;

/** The invoice's stored lines. The only element allowed to pan sideways
 *  (§8.7): a wide 2-D table the reader pans. */
export function InvoiceLinesTable({ lines }: { lines: readonly RentalInvoiceLine[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <ListChecks className="size-4 text-muted-foreground" />
        <CardTitle>{S.invoices.detail.lineItems}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left">
            <thead>
              <tr className="border-b border-border">
                {HEADERS.map((label, i) => (
                  <th key={label} className="px-3 py-2">
                    <Typography
                      variant="helper"
                      tone="muted"
                      className={i >= FIRST_NUMERIC ? "block text-right" : undefined}
                    >
                      {label}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                // Stored lines have no id; their order is fixed for the invoice.
                <InvoiceLineRow key={i} line={line} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
