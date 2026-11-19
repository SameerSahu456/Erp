import { useState, type ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";

import type { RentalInvoiceLine } from "../../api/invoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { lineAmount, lineSerials, lineValue } from "./invoice-detail-helpers";

const D = S.invoices.detail;

/** Serials a grouped line shows before it collapses — roughly one line of
 *  text; the largest invoice has one line of 550 units. */
const SERIALS_SHOWN = 6;

function NumCell({ children }: { children: ReactNode }) {
  return (
    <td className="px-3 py-3 text-right">
      <Typography variant="body">{children}</Typography>
    </td>
  );
}

function SerialsCell({ serials }: { serials: string[] }) {
  // Each row owns its own expanded state.
  const [open, setOpen] = useState(false);
  const collapsible = serials.length > SERIALS_SHOWN;
  const shown = open || !collapsible ? serials : serials.slice(0, SERIALS_SHOWN);
  return (
    <td className="min-w-0 px-3 py-3">
      <Typography variant="body" className="break-words">
        {shown.join(", ") || EMPTY_VALUE}
      </Typography>
      {collapsible && (
        <button
          type="button"
          className="mt-1 text-primary underline-offset-2 hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          <Typography variant="helper" tone="primary">
            {open ? D.showFewer : D.showAll(serials.length)}
          </Typography>
        </button>
      )}
    </td>
  );
}

/** One stored invoice line. */
export function InvoiceLineRow({ line }: { line: RentalInvoiceLine }) {
  return (
    <tr className="border-b border-border last:border-b-0 [&>td]:align-top">
      <td className="px-3 py-3">
        <Typography variant="body">{line.part ?? EMPTY_VALUE}</Typography>
      </td>
      <SerialsCell serials={lineSerials(line)} />
      <td className="px-3 py-3">
        <Typography variant="body" className="break-words">
          {line.description ?? EMPTY_VALUE}
        </Typography>
        {line.period && (
          <Typography variant="helper" tone="muted">
            {line.period}
          </Typography>
        )}
      </td>
      <td className="px-3 py-3">
        <Typography variant="body">{line.hsn ?? EMPTY_VALUE}</Typography>
      </td>
      <NumCell>{line.qty ?? 1}</NumCell>
      <NumCell>{line.monthlyRate ? formatINR(Number(line.monthlyRate)) : EMPTY_VALUE}</NumCell>
      <NumCell>{formatINR(lineValue(line))}</NumCell>
      <NumCell>{S.detail.gstPct(line.gst ?? 0)}</NumCell>
      <td className="px-3 py-3 text-right">
        <Typography variant="body-strong">{formatINR(lineAmount(line))}</Typography>
      </td>
    </tr>
  );
}
