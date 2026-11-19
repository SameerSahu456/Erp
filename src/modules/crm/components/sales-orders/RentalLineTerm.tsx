import { Typography } from "@/components/ui/typography";
import { formatIST_date } from "@shared/lib/date";

import type { SalesOrderItemWire } from "../../api";
import { SALES_ORDERS_STRINGS as S } from "./sales-orders.strings";

export type RentalLine = Pick<
  SalesOrderItemWire,
  | "is_rental"
  | "rental_period"
  | "rental_start_date"
  | "rental_end_date"
  | "rental_duration_units"
  | "rental_duration_label"
>;

// "26 Oct 2026 – 30 Nov 2026 · 1 month 5 days" under a rental line's name
// (QA RM19). The ACTUAL duration from the server (RM54), never a rounded
// month count.
export function RentalLineTerm({ line }: { line: RentalLine }) {
  if (!line.is_rental || !line.rental_period) return null;
  const start = line.rental_start_date
    ? formatIST_date(line.rental_start_date)
    : "—";
  const end = line.rental_end_date ? formatIST_date(line.rental_end_date) : "—";
  const duration =
    line.rental_duration_label ??
    S.approval.rental.units(line.rental_duration_units ?? 0, line.rental_period);
  return (
    <Typography variant="caption" tone="muted" className="block truncate">
      {S.approval.rental.term(start, end, duration)}
    </Typography>
  );
}

// Small qualifier under a rental line's rate or amount: both are per period
// ("/ month") — the amount is one period's rent, not the whole term.
export function RentalMoneyQualifier({
  line,
}: {
  line: RentalLine;
  /** Which cell it sits under. Both read the same now; kept so the call
   *  sites stay self-describing. */
  kind: "rate" | "amount";
}) {
  if (!line.is_rental || !line.rental_period) return null;
  return (
    <Typography variant="caption" tone="muted" className="block">
      {S.approval.rental.perPeriod(line.rental_period)}
    </Typography>
  );
}
