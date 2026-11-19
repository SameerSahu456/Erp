import { findPrefill } from "../../components/devices/assign-rack/assign-rack-helpers";
import { ASSIGN_RACK_DIALOG_STRINGS as S } from "../../components/devices/assign-rack-dialog.strings";

type PrefillRack = Parameters<typeof findPrefill>[0][number];

/** The rack/bin the dialog seeds with: the device's current slot, else blank. */
export function rackSeed(
  racks: readonly PrefillRack[],
  currentLocationId: string | null | undefined,
): { seedRack: string; seedBin: string } {
  const prefill = findPrefill(racks, currentLocationId);
  return { seedRack: prefill?.rackId ?? "", seedBin: prefill?.binId ?? "" };
}

/** The slot the device lands in (a direct-storage rack, or the chosen bin) and
 *  the first unmet data gate on Assign (§0.9). */
export function resolveRackTarget<R extends { id: string; can_store_stock?: boolean | null }, B>(
  selectedRack: R | undefined,
  selectedBin: B | undefined,
  binId: string,
) {
  const directRack = selectedRack?.can_store_stock ? selectedRack : undefined;
  const targetId = directRack?.id ?? (selectedRack ? binId : "");
  const targetNode = directRack ?? selectedBin;
  let blockReason: string | null = null;
  if (!selectedRack) blockReason = S.blocked.noRack;
  else if (!targetId) blockReason = S.blocked.noBin;
  return { targetId, targetNode, blockReason };
}
