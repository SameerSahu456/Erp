import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import type { LineSelection } from "../../hooks/agreements/extend-so-helpers";
import type { TargetsState } from "../../hooks/agreements/useExtendSoForm";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { ActionField } from "./ActionField";
import { ExtendUnitPicker } from "./ExtendUnitPicker";
import { asRate, lineHelp, rateList } from "./extend-so-display";

const E = S.actions.extend;

interface ExtendLineRateRowProps {
  lineId: string;
  lineName: string;
  contractedRate: string | number;
  /** This line's slice only — undefined when it has no unit on rent. */
  selection: LineSelection | undefined;
  targetsState: TargetsState;
  rate: string;
  flattenOk: boolean;
  onRate: (lineId: string, value: string) => void;
  onAllUnits: (lineId: string, checked: boolean) => void;
  onUnit: (lineId: string, unitId: string, checked: boolean) => void;
  onFlatten: (lineId: string, checked: boolean) => void;
}

/** One rental line's new-rate box, its unit picker and the flatten check. */
export function ExtendLineRateRow(props: ExtendLineRateRowProps) {
  const { lineId, selection, rate, flattenOk } = props;
  const typed = rate.trim();
  // Divergence only matters once a rate is typed, and is measured on the
  // SELECTED units — unticking the odd unit resolves it.
  const diverged = typed !== "" && !!selection && selection.rates.length > 1;
  return (
    <div className="min-w-0 space-y-1.5">
      <ActionField
        label={props.lineName}
        htmlFor={`extend-rate-${lineId}`}
        help={lineHelp(props.targetsState, selection?.target, props.contractedRate)}
      >
        <Input
          id={`extend-rate-${lineId}`}
          inputMode="decimal"
          placeholder={E.unchanged}
          value={rate}
          onChange={(e) => props.onRate(lineId, e.target.value)}
        />
      </ActionField>
      {/* One-unit lines skip the picker: ticking it is typing the rate. */}
      {typed !== "" && selection && selection.target.units.length > 1 ? (
        <ExtendUnitPicker
          lineId={lineId}
          selection={selection}
          onAll={(checked) => props.onAllUnits(lineId, checked)}
          onUnit={(unitId, checked) => props.onUnit(lineId, unitId, checked)}
        />
      ) : null}
      {diverged ? (
        <div className="space-y-2 rounded-md bg-warning-soft p-2.5">
          <Typography variant="helper" tone="warning">
            {E.flattenWarning(selection.chosen.length, rateList(selection.target))}
          </Typography>
          <div className="flex items-start gap-2">
            <Checkbox
              id={`extend-flatten-${lineId}`}
              checked={flattenOk}
              onCheckedChange={(checked) => props.onFlatten(lineId, checked === true)}
            />
            <Label
              htmlFor={`extend-flatten-${lineId}`}
              className="min-w-0 flex-1 cursor-pointer font-normal [overflow-wrap:anywhere]"
            >
              {E.flattenConfirm(asRate(typed))}
            </Label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
