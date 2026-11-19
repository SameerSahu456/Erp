import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { makeStaticAsyncOptions, type AsyncSelectOption } from "@/components/ui/async-select";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useVariantsListInfinite } from "@modules/ims";

import { useWarehouseScope } from "../../context/warehouse-scope";
import { MOVE_STOCK_PAGE_STRINGS as P } from "../../components/stock-transfer/stock-transfer.strings";
import { unassignedFirst } from "../../components/stock-transfer/move-stock-helpers";
import { useMoveStock } from "./useMoveStock";

export type TransferType = "internal" | "external";

export const TRANSFERS_LIST_PATH = "/wms/transfers";

/** Where the stock moves FROM: the navbar warehouse when it names exactly one,
 *  else the user's only assigned warehouse; otherwise the page asks. */
function useSourceWarehouse() {
  const { selectedWarehouseIds, pickerWarehouses, isFullAccess } = useWarehouseScope();
  const fixedId =
    selectedWarehouseIds.length === 1
      ? selectedWarehouseIds[0]
      : !isFullAccess && pickerWarehouses.length === 1
        ? pickerWarehouses[0].warehouse_id
        : "";
  const [pickedId, setPickedId] = useState("");
  const id = fixedId || pickedId;
  // The navbar's warehouses (all of them when it is on "All"); a bounded list.
  const useOptions = useMemo(
    () =>
      makeStaticAsyncOptions(
        pickerWarehouses
          .filter((w) => !selectedWarehouseIds.length || selectedWarehouseIds.includes(w.warehouse_id))
          .map((w) => ({ id: w.warehouse_id, label: w.name })),
        (o) => o.label,
      ),
    [pickerWarehouses, selectedWarehouseIds],
  );
  const name = pickerWarehouses.find((w) => w.warehouse_id === id)?.name ?? "";
  return { id, name, isFixed: !!fixedId, pickedId, setPickedId, useOptions };
}

// shortcut: every active variant. The variant stock filters count only sellable
// racked units, so they would hide the unassigned / mid-repair stock this page
// moves; the units card says when a variant has nothing here. Upgrade with a
// backend "has movable units in warehouse X" filter if the list gets noisy.
function useMovableVariantOptions(search: string, opts?: { enabled?: boolean }) {
  return useVariantsListInfinite(search, { enabled: opts?.enabled ?? true });
}

/** State for the full-page Move Stock form: the dialog's move logic plus the
 *  source warehouse, the picked variant and an explicit Internal / External choice. */
export function useMoveStockPage() {
  const navigate = useNavigate();
  const source = useSourceWarehouse();
  const [variant, setVariant] = useState<AsyncSelectOption | null>(null);
  const [transferType, setTransferType] = useState<TransferType>("internal");
  // Set by useMoveStock's close callback, which it fires only after a successful move.
  const moved = useRef(false);

  const move = useMoveStock({
    open: !!source.id && !!variant,
    onOpenChange: (open) => {
      if (!open) moved.current = true;
    },
    warehouseId: source.id || undefined,
    warehouseName: source.name || undefined,
    variantId: variant?.id,
    units: [],
  });

  const guard = useUnsavedChangesGuard({
    isDirty: move.dirty || !!variant || !!source.pickedId || transferType === "external",
  });

  const leave = async () => {
    guard.bypassOnce();
    await guard.popSentinelIfPresent();
    navigate(TRANSFERS_LIST_PATH, { replace: true });
  };

  // Switching Internal ↔ External starts a fresh form; only the From warehouse
  // is kept. (Internal never has a far warehouse; useMoveStock reads "no
  // destination" as a relocation, and reset clears it.)
  const changeTransferType = (next: TransferType) => {
    if (next === transferType) return;
    setTransferType(next);
    setVariant(null);
    move.reset();
  };

  const changeSource = (id: string) => {
    source.setPickedId(id);
    setVariant(null);
    // The old ticks and rack / bin belong to the old warehouse.
    move.selection.clearPicks();
    move.destination.setLocationId("");
    // To can never equal From; any other To stays as picked.
    if (move.destination.id === id) move.destination.change(null);
  };

  const changeVariant = (next: AsyncSelectOption | null) => {
    setVariant(next);
    move.selection.clearPicks();
    move.selection.setSearch("");
    // The page has ONE unit list with its search always on (no By Variant /
    // By Serial switch), which is the selection's "serial" mode.
    move.selection.setMode("serial");
  };

  // The rows as shown: searched, with units that have no rack / bin on top.
  const units = unassignedFirst(move.selection.filtered);
  // Quantity is simply how many units are ticked; typing N ticks the first N
  // rows shown, so it always matches the table's order.
  const quantity = move.selection.selected.size;
  const setQuantity = (n: number) =>
    move.selection.keepOnly(units.slice(0, Math.max(0, n)).map((u) => u.id));

  const submit = async () => {
    if (transferType === "external" && !move.destination.id) {
      toast.error(P.validationNoWarehouse);
      return;
    }
    moved.current = false;
    await move.submit();
    if (moved.current) await leave();
  };

  return {
    move,
    guard,
    source,
    changeSource,
    variant,
    changeVariant,
    units,
    quantity,
    setQuantity,
    useVariantOptions: useMovableVariantOptions,
    transferType,
    changeTransferType,
    submit,
    cancel: () => navigate(TRANSFERS_LIST_PATH),
  };
}

export type MoveStockPageState = ReturnType<typeof useMoveStockPage>;
