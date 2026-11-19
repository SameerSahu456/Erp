import type { RentalLine } from "./RentalLineTerm";
import { SALES_ORDERS_STRINGS as S } from "./sales-orders.strings";

// Column labels for a lines table: rate AND amount per period when every
// rental line shares one period. A rental line's amount is one period's rent
// (qty × rate), never the whole term — it used to be labelled "full term".
export function rentalColumnLabels(lines: RentalLine[]): {
  rate: string;
  amount: string;
} {
  const periods = new Set(
    lines.filter((l) => l.is_rental).map((l) => l.rental_period),
  );
  const only = periods.size === 1 ? [...periods][0] : null;
  return {
    rate: only ? S.approval.cols.ratePer(only) : S.approval.cols.rate,
    amount: only
      ? S.approval.cols.amountPer(only)
      : periods.size > 0
        ? S.approval.cols.amountPerPeriod
        : S.approval.cols.amount,
  };
}
