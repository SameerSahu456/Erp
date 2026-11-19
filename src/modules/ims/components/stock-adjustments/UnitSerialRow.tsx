import { CopyableText } from "@/components/common/display/CopyableText";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { Typography } from "@/components/ui/typography";

import type { StockAdjustmentUnit } from "../../stock-adjustments.api";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** One unit: internal serial (click to copy), OEM serial, label state. */
export function UnitSerialRow({ unit }: { unit: StockAdjustmentUnit }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-2">
      <Typography asChild variant="mono">
        <CopyableText value={unit.internal_serial} />
      </Typography>
      <span className="min-w-0 flex-1">
        <TruncatedSerial value={unit.manufacturer_serial} className="max-w-full" />
      </span>
      <StatusBadge variant={unit.label_printed ? "neutral" : "info"} showDot={false}>
        {unit.label_printed ? S.line.labelled : S.line.neverLabelled}
      </StatusBadge>
    </li>
  );
}
