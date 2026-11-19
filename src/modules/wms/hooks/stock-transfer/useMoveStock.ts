import { useState } from "react";
import { toast } from "sonner";

import { istDayStartISO, todayDateParam } from "@shared/lib/date";
import { useWarehouse } from "../warehouses/useWarehouses";
import { useStockTransferMutations } from "./useStockTransfer";
import { useMovableUnits } from "./useMovableUnits";
import { useUnitSelection } from "./useUnitSelection";
import { STOCK_TRANSFER_STRINGS as S } from "../../components/stock-transfer/stock-transfer.strings";
import {
  EMPTY_TRANSFER_LOGISTICS,
  RELOCATE_MAX,
  transferLogisticsDirty,
  transferLogisticsError,
  type MoveStockDialogProps,
  type TransferLogisticsForm,
} from "../../components/stock-transfer/move-stock-helpers";

/** State owner for MoveStockDialog; same warehouse = relocation, different warehouse = transfer. */
export function useMoveStock({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  partId,
  variantId,
  units,
  defaultSelectedIds = [],
}: MoveStockDialogProps) {
  const { relocate, sendTransfer, isPending } = useStockTransferMutations();
  // Which warehouse we are moving FROM, when the stock spans more than one.
  const [pickedSourceId, setPickedSourceId] = useState<string>("");
  const [dest, setDest] = useState({ id: "", name: "" });
  const [destLocationId, setDestLocationId] = useState("");
  const [destLocationLabel, setDestLocationLabel] = useState("");
  const [notes, setNotes] = useState("");
  // Transfer-only logistics. Carrier starts UNSET so the operator makes an
  // explicit choice (the Select shows a placeholder); submit guards on it.
  const [logistics, setLogistics] = useState<TransferLogisticsForm>(EMPTY_TRANSFER_LOGISTICS);
  const setLogistic = <K extends keyof TransferLogisticsForm>(
    key: K,
    value: TransferLogisticsForm[K],
  ) => setLogistics((prev) => ({ ...prev, [key]: value }));
  // Local today (yyyy-mm-dd) — drives the date input's `min` and the past-date
  // guard on submit.
  const todayStr = todayDateParam();

  const { sourceWarehouseIds, sourceWarehouseId, pool, poolLoading } = useMovableUnits({
    open,
    partId,
    variantId,
    units,
    warehouseId,
    pickedSourceId,
  });
  // Resolved by id, not a fetch-all list (§16.11); gated on `open`.
  const sourceWarehouseQuery = useWarehouse(open && !warehouseName ? sourceWarehouseId : "");
  const sourceName = warehouseName || sourceWarehouseQuery.data?.name || "";

  // THE derived mode. Never a toggle.
  // Empty destination means 'not chosen yet' -> same warehouse.
  const isTransfer = !!dest.id && dest.id !== sourceWarehouseId;
  const destWarehouseName = (isTransfer && dest.name) || sourceName;

  const selection = useUnitSelection(pool, defaultSelectedIds, isTransfer);
  const { selected } = selection;

  const reset = () => {
    setPickedSourceId("");
    setDest({ id: "", name: "" });
    setDestLocationId("");
    setDestLocationLabel("");
    selection.reset();
    setNotes("");
    setLogistics(EMPTY_TRANSFER_LOGISTICS);
  };

  // A new destination resets the unit picks — eligibility can differ, so stale ticks could 422.
  const changeDestination = (next: { id: string; name: string } | null) => {
    setDest(next ?? { id: "", name: "" });
    selection.clearPicks();
  };
  const changeSource = (next: string) => {
    setPickedSourceId(next);
    // The old selection belongs to the old warehouse.
    selection.clearPicks();
    setDest({ id: "", name: "" });
  };

  // PAGE-UI §3.1: no RHF here, so `dirty` ORs every local field.
  const dirty =
    selection.dirty ||
    !!pickedSourceId ||
    !!dest.id ||
    !!destLocationId ||
    notes.trim().length > 0 ||
    transferLogisticsDirty(logistics);

  const submitTransfer = async () => {
    const err = transferLogisticsError(logistics, todayStr);
    if (err) return toast.error(err);
    const f = logistics;
    await sendTransfer({
      fromWarehouseId: sourceWarehouseId,
      toWarehouseId: dest.id,
      toWarehouseName: destWarehouseName,
      stockItemIds: [...selected],
      notes: notes.trim() || undefined,
      delivery: {
        delivery_details: {
          // Non-empty past transferLogisticsError's carrier guard.
          mode: f.carrier || undefined,
          vehicle_number: f.vehicleNumber.trim() || null,
          driver_name: f.driverName.trim() || null,
          driver_phone: f.driverPhone.trim() || null,
          courier: f.courierName.trim() || null,
          docket_number: f.docket.trim() || null,
          // The picked IST day — `new Date("YYYY-MM-DD")` parses as UTC midnight.
          expected_delivery_date: istDayStartISO(f.expectedDelivery),
        },
        challan_number: f.challanNumber.trim() || null,
      },
    });
    return null;
  };

  const submitRelocate = async () => {
    if (!destLocationId) return toast.error(S.validationNoDestination);
    // The backend caps a relocate at 200 units per transaction (one row lock
    // per unit — RelocateRequest). Over that, assign the first 200 now and keep
    // the overflow selected for the next round, rather than rejecting the lot.
    const ids = [...selected];
    const assignIds = ids.slice(0, RELOCATE_MAX);
    const pendingIds = ids.slice(RELOCATE_MAX);
    await relocate({
      locationId: destLocationId,
      locationLabel: destLocationLabel,
      stockItemIds: assignIds,
      notes: notes.trim() || undefined,
    });
    if (pendingIds.length > 0) {
      // The placed units drop out of the pool on refetch; keep ONLY the
      // overflow ticked (relocate does not auto-prune) so it stays at the top,
      // ready to assign, and hold the dialog open.
      selection.setMode("serial");
      selection.keepOnly(pendingIds);
      toast.info(S.relocateOverLimit(assignIds.length, pendingIds.length, RELOCATE_MAX));
      return "partial";
    }
    return null;
  };

  const submit = async () => {
    if (selected.size === 0) return toast.error(S.validationNoUnits);
    const blocked = isTransfer ? await submitTransfer() : await submitRelocate();
    if (blocked !== null) return blocked;
    onOpenChange(false);
    reset();
  };

  return {
    isPending,
    isTransfer,
    dirty,
    submit,
    reset,
    todayStr,
    source: {
      ids: sourceWarehouseIds,
      id: sourceWarehouseId,
      name: sourceName,
      change: changeSource,
    },
    destination: {
      id: dest.id,
      name: destWarehouseName,
      change: changeDestination,
      locationId: destLocationId,
      setLocationId: setDestLocationId,
      locationLabel: destLocationLabel,
      setLocationLabel: setDestLocationLabel,
    },
    logistics,
    setLogistic,
    notes,
    setNotes,
    pool,
    poolLoading,
    selection,
  };
}

export type MoveStockState = ReturnType<typeof useMoveStock>;
