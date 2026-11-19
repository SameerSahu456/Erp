import type { ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";

import type { RentalInvoiceLine } from "../../api/invoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";

const COL = S.newInvoice.lines.columns;
const HEADERS = [COL.description, COL.hsn, COL.qty, COL.rate, COL.amount, COL.gst] as const;

function Cell({ children, numeric = false }: { children: ReactNode; numeric?: boolean }) {
  return (
    <td className="py-1.5 pr-4">
      <Typography variant="body" numeric={numeric}>
        {children}
      </Typography>
    </td>
  );
}

/** The priced lines, read-only. The only element allowed to pan sideways
 *  (§8.7): a wide 2-D table, not a blown-out layout. */
export function PreviewLinesTable({ lines }: { lines: readonly RentalInvoiceLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr>
            {HEADERS.map((c) => (
              <th key={c} className="pb-2 pr-4">
                <Typography variant="caption" tone="muted">
                  {c}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={`${line.serial ?? line.description ?? "line"}-${i}`}>
              <Cell>{line.description ?? line.part ?? EMPTY_VALUE}</Cell>
              <Cell>{line.hsn ?? EMPTY_VALUE}</Cell>
              <Cell numeric>{line.qty ?? 1}</Cell>
              <Cell numeric>{formatINR(Number(line.monthlyRate ?? line.rate ?? 0))}</Cell>
              <Cell numeric>{formatINR(Number(line.rate ?? 0))}</Cell>
              <Cell numeric>{S.newInvoice.gstPct(Number(line.gst ?? 0))}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
