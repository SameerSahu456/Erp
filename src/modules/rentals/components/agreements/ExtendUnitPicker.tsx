import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";

import type { LineSelection } from "../../hooks/agreements/extend-so-helpers";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const E = S.actions.extend;
const LABEL = "min-w-0 flex-1 cursor-pointer font-normal [overflow-wrap:anywhere]";

interface ExtendUnitPickerProps {
  lineId: string;
  selection: LineSelection;
  onAll: (checked: boolean) => void;
  onUnit: (unitId: string, checked: boolean) => void;
}

/** The units one line's new rate lands on. Not its own scroller — the
 *  dialog body already scrolls. */
export function ExtendUnitPicker({ lineId, selection, onAll, onUnit }: ExtendUnitPickerProps) {
  const { target, chosen, chosenSet } = selection;
  const total = target.units.length;
  return (
    <div className="space-y-2 rounded-md border border-border p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Typography variant="helper" tone="muted">
          {E.unitsPick}
        </Typography>
        <Typography variant="helper" tone="muted">
          {E.unitsSelected(chosen.length, total)}
        </Typography>
      </div>
      <Typography variant="helper" tone="muted">
        {E.unitsPickHelp}
      </Typography>
      <div className="flex items-start gap-2">
        <Checkbox
          id={`extend-units-all-${lineId}`}
          checked={chosen.length === total}
          onCheckedChange={(checked) => onAll(checked === true)}
        />
        <Label htmlFor={`extend-units-all-${lineId}`} className={LABEL}>
          {E.unitsAll}
        </Label>
      </div>
      <div className="space-y-1.5 pl-5">
        {target.units.map((unit) => (
          <div key={unit.id} className="flex items-start gap-2">
            <Checkbox
              id={`extend-unit-${unit.id}`}
              checked={chosenSet.has(unit.id)}
              onCheckedChange={(checked) => onUnit(unit.id, checked === true)}
            />
            <Label htmlFor={`extend-unit-${unit.id}`} className={LABEL}>
              {E.unitRow(unit.serial_number ?? E.unitNoSerial, formatINR(Number(unit.monthly_rate)))}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
