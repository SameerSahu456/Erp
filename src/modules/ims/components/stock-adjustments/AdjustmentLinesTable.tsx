import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE } from "@/shared/constants";

import { formatINR } from "../../lib/format";
import {
  adjustmentItemLabel,
  STOCK_ADJUSTMENT_DIRECTION_LABEL,
  STOCK_ADJUSTMENT_KIND_LABEL,
} from "../../lib/stock-adjustment-labels";
import type { StockAdjustmentLine } from "../../stock-adjustments.api";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";
import { UnitSerialList } from "./UnitSerialList";

const T = S.linesTable;

function locationText(line: StockAdjustmentLine): string {
  if (line.needs_inspection) return T.toInspection;
  return line.location_label ?? (line.direction === "add" ? T.unplaced : EMPTY_VALUE);
}

/** Units once resolved; before that, the internal serial typed on the line. */
function LineSerials({ line }: { line: StockAdjustmentLine }) {
  if (line.units.length > 0) return <UnitSerialList units={line.units} />;
  if (line.internal_serial) {
    return <Typography variant="mono">{line.internal_serial}</Typography>;
  }
  return <Typography variant="caption" tone="muted">{T.noUnits}</Typography>;
}

/** Lines with their resolved / pinned units. The Value column appears only
 *  when the payload carries values (price-redacted callers get nulls). */
export function AdjustmentLinesTable({ lines }: { lines: StockAdjustmentLine[] }) {
  const showValue = lines.some((l) => l.line_value != null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {S.detail.lines}
          <Typography variant="helper" tone="muted" asChild>
            <span>{S.detail.linesCount(lines.length)}</span>
          </Typography>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">{T.no}</TableHead>
              <TableHead>{T.item}</TableHead>
              <TableHead>{T.direction}</TableHead>
              <TableHead>{T.kind}</TableHead>
              <TableHead className="text-right">{T.qty}</TableHead>
              <TableHead>{T.location}</TableHead>
              <TableHead>{T.serialNo}</TableHead>
              <TableHead>{T.manufacturerSerial}</TableHead>
              {showValue ? <TableHead className="text-right">{T.value}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              // Cells set their own align-middle, so a row-level align-top never applied.
              <TableRow key={line.id} className="[&>td]:align-top">
                <TableCell className="tabular-nums">{line.line_no}</TableCell>
                <TableCell className="max-w-[18rem] whitespace-normal">
                  <Typography variant="body-sm">
                    {adjustmentItemLabel(line.sku_code, line.part_name) ||
                      line.internal_serial ||
                      line.manufacturer_serial ||
                      EMPTY_VALUE}
                  </Typography>
                  {line.notes ? <Typography variant="caption" tone="muted">{line.notes}</Typography> : null}
                </TableCell>
                <TableCell>{STOCK_ADJUSTMENT_DIRECTION_LABEL[line.direction]}</TableCell>
                <TableCell>{STOCK_ADJUSTMENT_KIND_LABEL[line.kind]}</TableCell>
                <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                <TableCell>{locationText(line)}</TableCell>
                <TableCell>
                  <LineSerials line={line} />
                </TableCell>
                {/* The serial entered on the line — visible before approval too. */}
                <TableCell>
                  <TruncatedSerial value={line.manufacturer_serial} />
                </TableCell>
                {showValue ? (
                  <TableCell className="text-right tabular-nums">
                    {line.line_value != null ? formatINR(Number(line.line_value)) : EMPTY_VALUE}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
