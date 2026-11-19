import { X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { Typography } from "@/components/ui/typography";

import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import {
  type StagedComponent,
  LINE_GRID,
  scannedVariantLabel,
} from "./material-issue-form-helpers";
import { VariantScanSelect } from "./VariantScanSelect";
import { UnitSerialScanSelect } from "./UnitSerialScanSelect";
import { ScanAnyUnitSelect } from "./ScanAnyUnitSelect";
import { QtyCell } from "./QtyCell";

// ── Components editor (collapsed accordion) ──────────────────────────────────

export function ComponentRow({
  comp,
  warehouseId,
  isDuplicateSerial,
  selectedSerials,
  onPatch,
  onRemove,
}: {
  comp: StagedComponent;
  warehouseId: string;
  isDuplicateSerial: (serial: string) => boolean;
  /** Serials picked across the form, so this component's serial dropdown hides
   *  units already selected elsewhere. */
  selectedSerials?: Set<string>;
  onPatch: (patch: Partial<StagedComponent>) => void;
  onRemove: () => void;
}) {
  const locked = comp.isTracking || comp.serial.trim().length > 0;
  const serialDuplicate = isDuplicateSerial(comp.serial);
  return (
    <div className={cn(LINE_GRID)}>
      <div className="min-w-0">
        <VariantScanSelect
          value={comp.variantOption}
          warehouseId={warehouseId}
          onPick={(opt, isTracking) =>
            onPatch({ variantOption: opt, isTracking, serial: "", quantity: 1 })
          }
          onClear={() =>
            onPatch({ variantOption: null, isTracking: false, serial: "" })
          }
        />
      </div>
      <div
        className={cn(
          "min-w-0 rounded-md",
          serialDuplicate && "ring-2 ring-destructive",
        )}
      >
        {comp.variantOption ? (
          <UnitSerialScanSelect
            warehouseId={warehouseId}
            variantId={comp.variantOption.id}
            serial={comp.serial}
            selectedSerials={selectedSerials}
            onPicked={(unit) =>
              onPatch(
                unit.part_variant_id === comp.variantOption?.id
                  ? { serial: unit.internal_serial }
                  : {
                      variantOption: {
                        id: unit.part_variant_id,
                        label: scannedVariantLabel(unit),
                      },
                      isTracking: !!unit.is_tracking,
                      serial: unit.internal_serial,
                      quantity: 1,
                    },
              )
            }
            onClear={() => onPatch({ serial: "" })}
          />
        ) : (
          // No part yet: scanning the unit fills the part and serial in together.
          <ScanAnyUnitSelect
            warehouseId={warehouseId}
            onScanned={(unit) => onPatch({ ...unit, quantity: 1 })}
          />
        )}
      </div>
      <div className="flex h-9 items-center justify-end">
        {comp.variantOption ? (
          <QtyCell
            locked={locked}
            quantity={comp.quantity}
            onChange={(quantity) => onPatch({ quantity })}
          />
        ) : (
          <Typography variant="body" tone="muted" numeric asChild>
            <span>—</span>
          </Typography>
        )}
      </div>
      <div className="flex h-9 items-center justify-end">
        <button
          type="button"
          onClick={onRemove}
          aria-label={S.form.lines.remove}
          className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
