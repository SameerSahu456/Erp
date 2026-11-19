import { useState } from "react";

import { usePermission } from "@shared/rbac";
import { wmsPermissions } from "../../permissions";
import { useStockTransferMutations } from "./useStockTransfer";
import type { TransferItemResponse } from "../../api";
import { TRANSFERS_PAGE_STRINGS as S } from "../../components/stock-transfer/stock-transfer.strings";

/** Units awaiting "mark lost" confirmation: one row's ⋯ menu or the ticked rows. */
interface LostTarget {
  ids: string[];
  label: string;
}

/** Receive-card state: bulk + per-row locations, ticked rows, search / status
 *  filter, the Assign Locations dialog, mark-lost target and the mutations. */
export function useTransferReceive() {
  const { placeUnit, flagUnit, markLost, returnToSource, isPending } =
    useStockTransferMutations();
  const [bulkLocationId, setBulkLocationId] = useState("");
  // itemId → location; an unset unit falls back to the bulk location.
  const [rowLocations, setRowLocations] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  // A ConfirmDialog, never a raw window.confirm (§5).
  const [lostTarget, setLostTarget] = useState<LostTarget | null>(null);
  // Mirror backend gates: place/flag/return need inward_manage, mark-lost needs transit_reconcile.
  const permission = usePermission();
  const canSettle = permission.can(wmsPermissions.INWARD_MANAGE);
  const canMarkLost = permission.can(wmsPermissions.TRANSIT_RECONCILE);

  // One unit at a time: each call is its own row-locked transaction on the backend.
  const runEach = async (ids: string[], run: (itemId: string) => Promise<unknown>) => {
    for (const id of ids) await run(id);
    setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
  };
  // A row's own action settles that unit, so it also leaves the ticked set; the
  // bulk buttons hide once nothing is ticked, and other ticked rows stay ticked.
  const runRow = (itemId: string, run: (itemId: string) => Promise<unknown>) =>
    void runEach([itemId], run);

  const placeAll = async (outstanding: TransferItemResponse[]) => {
    if (!bulkLocationId) return;
    await runEach(
      outstanding.map((i) => i.id),
      (itemId) => placeUnit({ itemId, locationId: bulkLocationId }),
    );
  };

  // A unit's own picked bin wins; otherwise it inherits the bulk location, so a
  // half-filled per-unit list still places cleanly against the top picker.
  const locationForRow = (itemId: string) => rowLocations[itemId] || bulkLocationId;
  const setRowLocation = (itemId: string, locationId: string) =>
    setRowLocations((prev) => ({ ...prev, [itemId]: locationId }));

  const toggle = (itemId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  const setAll = (ids: string[], on: boolean) => setSelected(new Set(on ? ids : []));
  const selectedIds = [...selected];

  // A write-off, not a correction — the styled ConfirmDialog names what is lost.
  const confirmLost = (items: { id: string; internal_serial?: string | null }[]) =>
    setLostTarget({
      ids: items.map((i) => i.id),
      label: items.length === 1 ? (items[0].internal_serial ?? items[0].id) : S.unitsCount(items.length),
    });
  const commitLost = () => {
    if (lostTarget)
      void runEach(lostTarget.ids, (itemId) => markLost({ itemId, reason: S.lostConfirmTitle }));
    setLostTarget(null);
  };

  return {
    canSettle,
    canMarkLost,
    isPending,
    bulkLocationId,
    setBulkLocationId,
    rowLocations,
    locationForRow,
    setRowLocation,
    placeAll,
    placeUnit: (itemId: string) =>
      runRow(itemId, (id) => placeUnit({ itemId: id, locationId: locationForRow(id) })),
    flagUnit: (itemId: string) => runRow(itemId, (id) => flagUnit({ itemId: id })),
    returnToSource: (itemId: string) => runRow(itemId, (id) => returnToSource({ itemId: id })),
    selected,
    selectedIds,
    toggle,
    setAll,
    search,
    setSearch,
    status,
    setStatus,
    assignOpen,
    setAssignOpen,
    placeSelected: async (locationId: string) => {
      await runEach(selectedIds, (itemId) => placeUnit({ itemId, locationId }));
      setAssignOpen(false);
    },
    flagSelected: () => void runEach(selectedIds, (itemId) => flagUnit({ itemId })),
    returnSelected: () => void runEach(selectedIds, (itemId) => returnToSource({ itemId })),
    lostTarget,
    confirmLost,
    cancelLost: () => setLostTarget(null),
    commitLost,
  };
}

export type TransferReceiveState = ReturnType<typeof useTransferReceive>;
