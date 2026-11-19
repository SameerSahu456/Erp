import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEVICE_IDENTITY_STRINGS } from "../../devices/device-identity/device-identity.strings";
import type { GrnLine } from "../batch-devices-helpers";
import type { UnitCorrection } from "./batch-view-helpers";

/** Per-row identity-correction menu; each item opens a shared dialog (see CorrectionDialogs). */
export function UnitCorrectionMenu({
  l,
  isPoSource,
  mayFillSerial,
  mayCorrectRow,
  onPick,
}: {
  l: GrnLine;
  /** Serial and PO-line fixes are for PO inwards; Re-identify is for every inward. */
  isPoSource: boolean;
  mayFillSerial: boolean;
  mayCorrectRow: boolean;
  onPick: (c: UnitCorrection) => void;
}) {
  const pick = (kind: UnitCorrection["kind"]) =>
    onPick({
      kind,
      deviceId: l.stock_item_id ?? "",
      currentSerial: l.manufacturer_serial ?? null,
      poItemId: l.source_line_entity_id ?? null,
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={DEVICE_IDENTITY_STRINGS.actions.rowMenuAriaLabel}
        className="flex size-8 items-center justify-center rounded-md hover:bg-accent/50"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isPoSource && (mayFillSerial || mayCorrectRow) ? (
          <DropdownMenuItem onClick={() => pick("serial")}>
            {l.manufacturer_serial
              ? DEVICE_IDENTITY_STRINGS.actions.editSerialLong
              : DEVICE_IDENTITY_STRINGS.actions.addSerialLong}
          </DropdownMenuItem>
        ) : null}
        {mayCorrectRow ? (
          <DropdownMenuItem onClick={() => pick("reidentify")}>
            {DEVICE_IDENTITY_STRINGS.actions.reidentify}
          </DropdownMenuItem>
        ) : null}
        {isPoSource && mayCorrectRow ? (
          <DropdownMenuItem onClick={() => pick("relink")}>
            {DEVICE_IDENTITY_STRINGS.actions.relink}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
