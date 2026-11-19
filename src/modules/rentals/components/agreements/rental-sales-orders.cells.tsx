import type { ReactNode } from "react";

import type { CellFormatter } from "@/components/common/tables/BusinessMetricsTable";

import {
  ConfigureCell,
  MonthlyRateCell,
  NeedsConfigurationOrderCell,
  PoCell,
  RentalStatusCell,
  SoStatusCell,
} from "./RentalSalesOrderCells";

type Row = Record<string, unknown>;

interface CellContext {
  mayConfigure: boolean;
  onConfigure: (id: string) => void;
}

type CellRenderer = (value: unknown, row: Row, ctx: CellContext) => { className?: string; display: ReactNode } | null;

const RENDERERS: Record<string, CellRenderer> = {
  // Coloured rather than badged: the row already carries two badges.
  orderNumber: (value, row) =>
    row._needsConfiguration === true
      ? { className: "bg-destructive/10", display: <NeedsConfigurationOrderCell orderNumber={String(value ?? "")} /> }
      : null,
  soStatus: (value) => ({ display: <SoStatusCell status={String(value ?? "")} /> }),
  rentalStatus: (value) => ({ display: <RentalStatusCell status={String(value ?? "")} /> }),
  monthlyRate: (value, row) => ({
    display: <MonthlyRateCell live={Number(value)} expected={Number(row._expectedRate ?? 0)} />,
  }),
  po: (_value, row) => ({ display: <PoCell row={row} /> }),
  configure: (_value, row, ctx) => ({
    display: (
      <ConfigureCell
        salesOrderId={String(row.id)}
        orderNumber={String(row.orderNumber ?? "")}
        isConfigured={row._isConfigured === true}
        reconfigureRequired={row._reconfigureRequired === true}
        canConfigure={row._canConfigure !== false}
        mayConfigure={ctx.mayConfigure}
        onConfigure={ctx.onConfigure}
      />
    ),
  }),
};

/** The register's cell renderer map, keyed by column. */
export function salesOrderCellFormatter(ctx: CellContext): CellFormatter {
  return (value, key, row) => RENDERERS[key]?.(value, row, ctx) ?? null;
}
