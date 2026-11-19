import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";

import type { StockAdjustmentUnit } from "../../stock-adjustments.api";
import { UnitSerialRow } from "./UnitSerialRow";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

function matches(unit: StockAdjustmentUnit, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [unit.internal_serial, unit.manufacturer_serial ?? ""].some((v) =>
    v.toLowerCase().includes(needle),
  );
}

/** Every unit of one line, searchable, with a copy-all for the visible serials. */
export function UnitSerialsDialog({
  units,
  open,
  onOpenChange,
}: {
  units: StockAdjustmentUnit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const visible = units.filter((u) => matches(u, term));

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(visible.map((u) => u.internal_serial).join("\n"));
      toast.success(S.units.copied(visible.length));
    } catch {
      toast.error(S.units.copyFailed);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-xl">
        <DialogHeader>
          <Typography asChild variant="body-lg">
            <DialogTitle>{S.units.dialogTitle(units.length)}</DialogTitle>
          </Typography>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={S.units.search}
            aria-label={S.units.search}
            className="min-w-0 flex-1"
          />
          <Button variant="outline" size="sm" onClick={copyAll} disabled={visible.length === 0}>
            {S.units.copyAll}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border p-3">
          {visible.length > 0 ? (
            <ul className="space-y-1.5">
              {visible.map((u) => (
                <UnitSerialRow key={u.stock_item_id} unit={u} />
              ))}
            </ul>
          ) : (
            <Typography variant="helper">{S.units.noMatch}</Typography>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
