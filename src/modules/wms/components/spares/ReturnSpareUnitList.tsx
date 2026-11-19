import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";

import type { SpareReturnDestination } from "../../api";
import type { ReturnUnitIdentity } from "../../hooks/spares/useReturnSpare";
import { RackBinLocationPicker } from "../shared/RackBinLocationPicker";
import { SPARES_STRINGS as S } from "./spares.strings";

interface Props {
  unitIds: string[];
  unitById: Map<string, ReturnUnitIdentity>;
  selected: Set<string>;
  onToggle: (unitId: string) => void;
  unitWarehouseId: (unitId: string) => string | null;
  locationFor: (unitId: string) => string;
  onLocationChange: (unitId: string, locationId: string) => void;
  sendToFor: (unitId: string) => SpareReturnDestination;
  onSendToChange: (unitId: string, sendTo: SpareReturnDestination) => void;
  enabled: boolean;
}

const SEND_TO_OPTIONS: SpareReturnDestination[] = ["stock", "qc", "repair", "scrap"];

/** Returnable units; each selected unit says where it goes and, unless it is
 *  scrapped, which bin it lands in (required for stock, optional otherwise). */
export function ReturnSpareUnitList(p: Props) {
  return (
    <div className="space-y-2">
      <Label>{S.returnDialog.unitsHeading}</Label>
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border p-2">
        {p.unitIds.map((unitId) => {
          const isSelected = p.selected.has(unitId);
          const identity = p.unitById.get(unitId);
          const whId = p.unitWarehouseId(unitId);
          return (
            <div key={unitId} className="min-w-0 space-y-2 rounded-md px-2 py-1.5">
              <label className="flex min-w-0 cursor-pointer items-center gap-3">
                <Checkbox checked={isSelected} onCheckedChange={() => p.onToggle(unitId)} />
                <span className="min-w-0 flex-1">
                  <Typography variant="body" asChild>
                    <span className="block truncate font-mono">{identity?.serial ?? S.returnDialog.unitSerialFallback}</span>
                  </Typography>
                  <Typography variant="helper" tone="muted" asChild>
                    <span className="block truncate">{identity?.part ?? unitId}</span>
                  </Typography>
                </span>
              </label>
              {isSelected && (
                <SelectedUnitDestination
                  unitId={unitId}
                  warehouseId={whId}
                  enabled={p.enabled}
                  sendTo={p.sendToFor(unitId)}
                  onSendToChange={p.onSendToChange}
                  location={p.locationFor(unitId)}
                  onLocationChange={p.onLocationChange}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Where one selected unit goes, and its bin when it has one. */
function SelectedUnitDestination(p: {
  unitId: string;
  warehouseId: string | null;
  enabled: boolean;
  sendTo: SpareReturnDestination;
  onSendToChange: (unitId: string, sendTo: SpareReturnDestination) => void;
  location: string;
  onLocationChange: (unitId: string, locationId: string) => void;
}) {
  const R = S.returnDialog;
  return (
    <div className="min-w-0 space-y-2 pl-7">
      <div className="min-w-0 space-y-1">
        <Label required>{R.sendToLabel}</Label>
        <Select
          value={p.sendTo}
          onValueChange={(v) => v && p.onSendToChange(p.unitId, v as SpareReturnDestination)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{R.sendTo[p.sendTo]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SEND_TO_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {R.sendTo[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {p.sendTo === "scrap" ? null : p.warehouseId ? (
        <div className="min-w-0 space-y-1">
          <RackBinLocationPicker
            warehouseId={p.warehouseId}
            enabled={p.enabled}
            value={p.location}
            onChange={(v) => p.onLocationChange(p.unitId, v)}
          />
          {p.sendTo !== "stock" && (
            <Typography variant="helper" tone="muted" asChild>
              <p>{R.locationOptional}</p>
            </Typography>
          )}
        </div>
      ) : (
        <Typography variant="helper" tone="danger" asChild>
          <p>{R.noWarehouse}</p>
        </Typography>
      )}
    </div>
  );
}
