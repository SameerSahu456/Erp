import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";

import type { RentalInvoiceRow } from "../../api/invoices";
import { formatRentalDay } from "../../lib/format";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { BILLING_COMMON_STRINGS as B } from "../shared/billing-common.strings";

const SO = S.soInvoices;
const HEADERS = [SO.columns.invoice, SO.columns.period, SO.columns.issued, SO.columns.due, SO.columns.total] as const;
const TOTAL_COLUMN = HEADERS.length - 1;

/** One invoice on the order's card. A void keeps its number forever, so it
 *  is struck through and badged rather than hidden. */
function SoInvoiceRow({ inv }: { inv: RentalInvoiceRow }) {
  const voided = inv.deleted_at !== null;
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Typography variant="body" tone={voided ? "muted" : "primary"} asChild>
            <Link
              to={`/rentals/invoices/${inv.id}`}
              className={voided ? "line-through" : "underline-offset-2 hover:underline"}
            >
              {inv.invoice_number}
            </Link>
          </Typography>
          {voided && <StatusBadge variant="error">{SO.voided}</StatusBadge>}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <Typography variant="body">{inv.period ?? EMPTY_VALUE}</Typography>
      </td>
      <td className="px-3 py-2.5">
        <Typography variant="body">{formatRentalDay(inv.issue_date)}</Typography>
      </td>
      <td className="px-3 py-2.5">
        <Typography variant="body" tone={inv.due_date ? undefined : "muted"}>
          {inv.due_date ? formatRentalDay(inv.due_date) : B.noDueDate}
        </Typography>
      </td>
      <td className="px-3 py-2.5 text-right">
        {/* Full precision: an invoice total is reconciled to the rupee. */}
        <Typography
          variant={voided ? "body" : "body-strong"}
          className={voided ? "line-through" : undefined}
          tone={voided ? "muted" : undefined}
        >
          {formatINR(Number(inv.total))}
        </Typography>
      </td>
    </tr>
  );
}

/** The order's invoices. The only element allowed to pan sideways (§8.7). */
export function SoInvoicesTable({ items }: { items: readonly RentalInvoiceRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] text-left">
        <thead>
          <tr className="border-b border-border">
            {HEADERS.map((label, i) => (
              <th key={label} className="px-3 py-2">
                <Typography
                  variant="helper"
                  tone="muted"
                  className={i === TOTAL_COLUMN ? "block text-right" : undefined}
                >
                  {label}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((inv) => (
            <SoInvoiceRow key={inv.id} inv={inv} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
