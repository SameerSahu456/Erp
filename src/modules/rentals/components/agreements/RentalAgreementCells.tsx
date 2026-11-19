import { Loader2 } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TableCell } from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE } from "@/shared/constants";
import { usePermission } from "@shared/rbac";

import {
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_VARIANT,
} from "../../constants/billing";
import { useRentalSalesOrderBilling } from "../../hooks/agreements/useAgreement";
import { formatRentalDay } from "../../lib/format";
import { rentalsCan } from "../../permissions";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const A = S.inlineAgreement;

/** How many cells this renders — a caller's header row and empty-state
 *  colSpan must match it. */
export const RENTAL_AGREEMENT_CELL_COUNT = 4;

// A click on any of these cells must not open the order behind the row.
const stop = (e: React.MouseEvent) => e.stopPropagation();

function DateCell({ value }: { value: string | null | undefined }) {
  return (
    <TableCell onClick={stop}>
      {/* Same size and colour as the list's other date columns; only the
          placeholder dash is muted. */}
      <Typography variant="body" tone={value ? "default" : "muted"} numeric className="whitespace-nowrap">
        {value ? formatRentalDay(value) : EMPTY_VALUE}
      </Typography>
    </TableCell>
  );
}

/** The four agreement cells, blank — for a row that has no agreement (a
 *  plain sale beside rentals) or a viewer who may not read one. */
export function BlankAgreementCells() {
  return (
    <>
      <DateCell value={null} />
      <DateCell value={null} />
      <DateCell value={null} />
      <DateCell value={null} />
    </>
  );
}

/** One rental order's agreement as FOUR table cells — status, invoice
 *  period, billed through, next invoice — from ONE billing read per row.
 *
 *  Exported from the rentals barrel so CRM can place it WITHOUT learning the
 *  rentals data model (CLAUDE.md section 7): CRM decides where it goes;
 *  rentals decides what "the agreement state" is. Every branch renders all
 *  four cells, so a loading or unconfigured row never shifts the columns.
 *
 *  Queries per row. Deliberate and bounded: a deal or account page lists a
 *  page of orders, and only `rental_sales` rows render this, so a plain
 *  sale costs nothing.
 */
export function RentalAgreementCells({ salesOrderId }: { salesOrderId: string }) {
  // GET .../billing is rentals:read; a CRM user without it would only get a
  // 403 read as "not configured", so the cells are simply left blank.
  const canView = usePermission().canAny(rentalsCan.view);
  const query = useRentalSalesOrderBilling(salesOrderId, { enabled: canView });
  const detail = query.data;
  const config = detail?.config ?? null;

  if (!canView) return <BlankAgreementCells />;

  if (query.isLoading) {
    return (
      <>
        <TableCell onClick={stop}>
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        </TableCell>
        <TableCell />
        <TableCell />
        <TableCell />
      </>
    );
  }

  // A rental order with no agreement row is worth shouting about, not
  // hiding: nothing bills until it is configured.
  if (query.isError || !config) {
    return (
      <>
        <TableCell onClick={stop}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <StatusBadge variant="warning">{A.unconfigured}</StatusBadge>
            <Typography variant="helper" tone="muted" className="min-w-0">
              {query.isError ? A.loadFailed : A.unconfiguredHint}
            </Typography>
          </div>
        </TableCell>
        <DateCell value={null} />
        <DateCell value={null} />
        <DateCell value={null} />
      </>
    );
  }

  const display = detail?.display_status ?? config.status;

  return (
    <>
      <TableCell onClick={stop}>
        <StatusBadge variant={RENTAL_STATUS_VARIANT[display] ?? "neutral"}>
          {RENTAL_STATUS_LABELS[display] ?? display}
        </StatusBadge>
      </TableCell>
      <TableCell onClick={stop}>
        <Typography variant="body" numeric className="whitespace-nowrap">
          {A.period(formatRentalDay(config.start_date), formatRentalDay(config.end_date))}
        </Typography>
      </TableCell>
      {/* Billed-through and next-invoice answer "is this actually earning?". */}
      <DateCell value={config.last_billed_date} />
      <DateCell value={detail?.next_invoice_date} />
    </>
  );
}
