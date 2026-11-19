import { StatusBadge } from "@/components/common/display/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";

import { IMPORT_ROW_STATUS_LABEL, IMPORT_ROW_STATUS_VARIANT } from "../../lib/stock-adjustment-labels";
import type { StockAdjustmentImportRow } from "../../stock-adjustments.api";
import { UnitSerialList } from "./UnitSerialList";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

const I = S.import;

/** `action=add · qty=5` — the row's non-empty cells, in file order. */
const valuesText = (values: Record<string, string>) =>
  I.cells(Object.entries(values).filter(([, v]) => v !== ""));

/** Per-row result of an import preview: status, messages, resolved removal serials. */
export function ImportPreviewTable({ rows }: { rows: StockAdjustmentImportRow[] }) {
  if (rows.length === 0) {
    return <Typography variant="body-sm" tone="muted">{I.noRows}</Typography>;
  }
  return (
    <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">{I.colRow}</TableHead>
            <TableHead className="w-20">{I.colStatus}</TableHead>
            <TableHead>{I.colValues}</TableHead>
            <TableHead>{I.colMessages}</TableHead>
            <TableHead>{I.colUnits}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.row_number}>
              <TableCell className="tabular-nums">{row.row_number}</TableCell>
              <TableCell>
                <StatusBadge variant={IMPORT_ROW_STATUS_VARIANT[row.status]}>
                  {IMPORT_ROW_STATUS_LABEL[row.status]}
                </StatusBadge>
              </TableCell>
              <TableCell className="max-w-[18rem] whitespace-normal break-words">
                <Typography variant="body-sm">{valuesText(row.values)}</Typography>
              </TableCell>
              <TableCell className="max-w-[18rem] whitespace-normal break-words">
                {row.messages.map((m) => (
                  <Typography key={m} variant="body-sm" tone={row.status === "error" ? "danger" : "muted"}>
                    {m}
                  </Typography>
                ))}
              </TableCell>
              <TableCell className="whitespace-normal">
                {row.units.length > 0 ? <UnitSerialList units={row.units} inline /> : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
