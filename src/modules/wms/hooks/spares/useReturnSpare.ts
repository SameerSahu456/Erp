import { useMemo, useState } from "react";

import { useStockItemsPage } from "@modules/ims";

import type { SpareReturnDestination } from "../../api";
import { formatCondition } from "../../constants/condition";
import { useReturnSpareRequest, useSpareMovements } from "./useSpares";
import {
  returnBlockReason,
  returnableUnitIds,
  type ReturnSubject,
} from "../../components/spares/return-spare-helpers";
import { SPARES_STRINGS as S } from "../../components/spares/spares.strings";

/** A single spare request's consumed units, fetched in one page to resolve
 *  each unit's serial — they never number in the hundreds (§16.6: named). */
const CONSUMED_UNITS_PAGE_SIZE = 100;

export interface ReturnUnitIdentity {
  serial: string;
  part: string;
  warehouseId: string | null;
}

/** Return-spare-units dialog state (§17). Keyed per request, so state starts clean. */
export function useReturnSpare(request: ReturnSubject | null, warehouseId: string | null, onClose: () => void) {
  const open = request !== null;
  const movementsQuery = useSpareMovements(open ? request.id : null);
  // Consumed units of this variant, so a serial shows instead of a UUID.
  const unitsQuery = useStockItemsPage(
    { part_variant_id: request?.partVariantId, status: ["consumed"], page_size: CONSUMED_UNITS_PAGE_SIZE },
    { enabled: open && !!request?.partVariantId },
  );

  // Each consumed unit's serial plus the part it is, so a row reads
  // "0000044223 / DL-LAT-7420 · Latitude 7420 · refurbished".
  const unitById = useMemo(() => {
    const m = new Map<string, ReturnUnitIdentity>();
    for (const u of unitsQuery.data?.items ?? []) {
      const part = [u.part_number, u.part_name, formatCondition(u.variant_condition)].filter(Boolean).join(" · ");
      m.set(u.id, { serial: u.serial_number, part, warehouseId: u.warehouse_id });
    }
    return m;
  }, [unitsQuery.data]);

  const returnableIds = useMemo(() => returnableUnitIds(movementsQuery.data ?? []), [movementsQuery.data]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [locationByUnit, setLocationByUnit] = useState<Record<string, string>>({});
  // Where each unit goes; unset means stock (unused, back on the rack).
  const [sendToByUnit, setSendToByUnit] = useState<Record<string, SpareReturnDestination>>({});
  const sendToFor = (unitId: string): SpareReturnDestination => sendToByUnit[unitId] ?? "stock";
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");

  const isOther = reasonCode === S.returnReasonOther;
  const chosen = [...selected];
  // A unit going back to stock must name its bin — otherwise it is available
  // with nowhere to physically find it. QC / repair may name one; scrap never does.
  const allPlaced = chosen.every((id) => sendToFor(id) !== "stock" || Boolean(locationByUnit[id]));
  const blockReason = request
    ? returnBlockReason({ selectedCount: chosen.length, allPlaced, reasonCode, isOther, notes })
    : null;
  const ready = !!request && blockReason === null;

  const returnUnits = useReturnSpareRequest();
  const submit = () => {
    if (!request || !ready) return;
    returnUnits.mutate(
      {
        reqId: request.id,
        body: {
          // The API takes one free-text `reason`; notes ride along after an em
          // dash so the stored string stays readable wherever it surfaces.
          reason: [reasonCode, notes.trim()].filter(Boolean).join(" — "),
          returns: chosen.map((id) => {
            const sendTo = sendToFor(id);
            return {
              stock_item_id: id,
              send_to: sendTo,
              return_location_id: sendTo === "scrap" ? null : locationByUnit[id] || null,
            };
          }),
        },
      },
      { onSuccess: onClose },
    );
  };

  return {
    open,
    isLoading: movementsQuery.isLoading || unitsQuery.isLoading,
    isError: movementsQuery.isError,
    returnableIds,
    unitById,
    // Use the unit's own warehouse (what the backend checks); the prop is only a fallback.
    unitWarehouseId: (unitId: string): string | null => unitById.get(unitId)?.warehouseId ?? warehouseId,
    selected,
    toggle: (unitId: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(unitId)) next.delete(unitId);
        else next.add(unitId);
        return next;
      }),
    locationFor: (unitId: string) => locationByUnit[unitId] ?? "",
    sendToFor,
    setSendToFor: (unitId: string, sendTo: SpareReturnDestination) =>
      setSendToByUnit((prev) => ({ ...prev, [unitId]: sendTo })),
    setLocationFor: (unitId: string, locationId: string) =>
      setLocationByUnit((prev) => ({ ...prev, [unitId]: locationId })),
    reasonCode,
    setReasonCode,
    notes,
    setNotes,
    isOther,
    chosenCount: chosen.length,
    ready,
    blockReason,
    // Any unit picked, reason chosen or note typed makes the modal dirty.
    dirty: selected.size > 0 || reasonCode !== "" || notes.trim() !== "",
    pending: returnUnits.isPending,
    submit,
  };
}
