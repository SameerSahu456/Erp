import type { ReactNode } from "react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import type { CellFormatter } from "@/components/common/tables/BusinessMetricsTable";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";

import { INVOICE_STRINGS as S } from "./invoices.strings";
import { AutoInvoiceDayDownload } from "./AutoInvoiceDayDownload";

type Row = Record<string, unknown>;
type Cell = { className?: string; display?: ReactNode } | null;
type Renderer = (value: unknown, row: Row) => Cell;

const money: Renderer = (value) => ({ display: formatINR(Number(value)) });

const AUTO_DAY_CELLS: Record<string, Renderer> = {
  download: (_value, row) => ({ display: <AutoInvoiceDayDownload day={String(row._day)} /> }),
  total: money,
  count: (value) => ({ display: S.invoices.autoDays.invoices(Number(value)) }),
};

const INVOICE_CELLS: Record<string, Renderer> = {
  number: (value, row) => ({
    display: (
      <div className="flex min-w-0 items-center gap-2">
        <Typography variant="mono" truncate className="min-w-0">
          {String(value)}
        </Typography>
        {row._voided === true && (
          <span className="shrink-0">
            <StatusBadge variant="neutral">{S.invoices.voided}</StatusBadge>
          </span>
        )}
      </div>
    ),
  }),
  // A voided invoice keeps its figure but is greyed, so it never reads as
  // part of the live total above.
  total: (value, row) => ({
    className: row._voided === true ? "text-muted-foreground" : undefined,
    display: formatINR(Number(value)),
  }),
  due: (_value, row) => (row._noDueDate === true ? { className: "text-muted-foreground" } : null),
};

function cellsFor(row: Row): Record<string, Renderer> {
  if (row._day !== undefined) return AUTO_DAY_CELLS;
  return INVOICE_CELLS;
}

/** One formatter for the register's two row shapes (days, invoices). */
export const invoiceRegisterCell: CellFormatter = (value, key, row) => {
  const render = cellsFor(row)[key];
  if (render) return render(value, row);
  // Day rows have no default formatting of their own.
  return row._day !== undefined ? { display: String(value ?? "") } : null;
};
