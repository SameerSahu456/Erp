/** Controller behind `AssignRackDialog`: rack → bin cascade, prefill, disabled reason and submit. */
import { useMemo, useState } from "react";

import {
  makeUseBinOptions,
  makeUseRackOptions,
  useLocationsTree,
  useRackBins,
} from "../warehouses/useWarehouseLocations";
import { useWarehouse } from "../warehouses/useWarehouses";
import { useRackAssignDevice } from "./useDevices";
import { rackSeed, resolveRackTarget } from "./assign-rack-target";

interface UseAssignRackArgs {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string | null;
  warehouseId: string;
  currentLocationId?: string | null;
}

export function useAssignRack({ open, onOpenChange, deviceId, warehouseId, currentLocationId }: UseAssignRackArgs) {
  const [rackId, setRackId] = useState("");
  const [binId, setBinId] = useState("");

  const warehouse = useWarehouse(open ? warehouseId : "").data;
  const treeQuery = useLocationsTree(open ? warehouseId : "");
  const racks = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);

  // Prefill with the device's current location (D5) — parked units usually go back there.
  const { seedRack, seedBin } = rackSeed(racks, currentLocationId);

  // Reset on open / warehouse / prefill change via a render-time signature (no setState-in-effect).
  const sig = `${open}:${warehouseId}:${seedRack}:${seedBin}`;
  const [lastSig, setLastSig] = useState(sig);
  if (sig !== lastSig) {
    setLastSig(sig);
    setRackId(seedRack);
    setBinId(seedBin);
  }
  // Dirty once moved off the seed — re-confirming in place closes silently.
  const dirty = rackId !== seedRack || binId !== seedBin;

  const selectedRack = racks.find((r) => r.id === rackId);
  // A rack that can't store stock directly organizes bins — reveal the bin step.
  const isRackWithBins = !!selectedRack && !selectedRack.can_store_stock;
  const binsQuery = useRackBins(rackId, open && isRackWithBins);
  const bins = useMemo(() => binsQuery.data ?? [], [binsQuery.data]);
  const selectedBin = bins.find((b) => b.id === binId);

  // Server-searched, paged option hooks (§16.11), stable while the bound id holds.
  const useRackOptions = useMemo(() => makeUseRackOptions(warehouseId), [warehouseId]);
  const useBinOptions = useMemo(() => makeUseBinOptions(rackId), [rackId]);

  // The landing slot + first unmet data gate (excludes isPending so no stale
  // reason shows mid-submit).
  const { targetId, targetNode, blockReason } = resolveRackTarget(selectedRack, selectedBin, binId);

  const assign = useRackAssignDevice();
  const submit = () => {
    if (!deviceId || !targetId) return;
    assign.mutate(
      { id: deviceId, body: { warehouse_location_id: targetId } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const pickRack = (id: string) => {
    setRackId(id);
    setBinId("");
  };

  return {
    warehouse,
    loadingRacks: treeQuery.isLoading,
    noRacks: !treeQuery.isLoading && racks.length === 0,
    selectedRack,
    isRackWithBins,
    binsQuery,
    bins,
    selectedBin,
    useRackOptions,
    useBinOptions,
    targetId,
    targetNode,
    blockReason,
    dirty,
    assign,
    submit,
    pickRack,
    clearRack: () => pickRack(""),
    pickBin: setBinId,
  };
}
