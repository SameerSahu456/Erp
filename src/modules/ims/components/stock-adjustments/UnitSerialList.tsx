import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import type { StockAdjustmentUnit } from "../../stock-adjustments.api";
import { UnitSerialRow } from "./UnitSerialRow";
import { UnitSerialsDialog } from "./UnitSerialsDialog";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Up to this many units are listed inline; more collapse to a summary. */
const INLINE_UNITS = 3;

/** Serials of resolved / pinned units, with their label state (D5 picks
 *  never-labelled units first, so the badge explains the order). A long line
 *  shows a count, the first few serials and "View all": a searchable dialog,
 *  or — `inline`, inside another dialog — an in-place expand (no stacked modal). */
export function UnitSerialList({ units, inline = false }: { units: StockAdjustmentUnit[]; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  if (units.length <= INLINE_UNITS) {
    return (
      <ul className="space-y-1">
        {units.map((u) => (
          <UnitSerialRow key={u.stock_item_id} unit={u} />
        ))}
      </ul>
    );
  }
  const unlabelled = units.filter((u) => !u.label_printed).length;
  const shown = inline && open ? units : units.slice(0, INLINE_UNITS);
  return (
    <div className="min-w-0 space-y-1.5">
      <Typography variant="body-strong">{S.units.summary(units.length, unlabelled)}</Typography>
      <ul className="space-y-1">
        {shown.map((u) => (
          <UnitSerialRow key={u.stock_item_id} unit={u} />
        ))}
      </ul>
      <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setOpen(!open)}>
        {inline && open ? S.units.showFewer : S.units.viewAll(units.length)}
      </Button>
      {inline ? null : <UnitSerialsDialog units={units} open={open} onOpenChange={setOpen} />}
    </div>
  );
}
