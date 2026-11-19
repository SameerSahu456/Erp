import { useMemo, useState } from "react";

import { useStockItemsPage } from "@modules/ims";

import { formatCondition } from "../../constants/condition";
import { returnableUnitIds } from "../../components/spares/return-spare-helpers";
import { SPARES_STRINGS as S } from "../../components/spares/spares.strings";
import { useFitSpareRequest, useSpareMovements } from "./useSpares";

/** A single spare request's consumed units, fetched in one page to resolve
 *  each unit's serial — they never number in the hundreds. */
const CONSUMED_UNITS_PAGE_SIZE = 100;

export interface FitSubject {
  id: string;
  deviceId: string;
  partVariantId: string;
  partLabel: string;
}

/** Fit-in-device dialog state. Keyed per request, so state starts clean. */
export function useFitSpare(request: FitSubject | null, onClose: () => void) {
  const open = request !== null;
  const movementsQuery = useSpareMovements(open ? request.id : null);
  const unitsQuery = useStockItemsPage(
    { part_variant_id: request?.partVariantId, status: ["consumed"], page_size: CONSUMED_UNITS_PAGE_SIZE },
    { enabled: open && !!request?.partVariantId },
  );

  const unitById = useMemo(() => {
    const m = new Map<string, { serial: string; part: string }>();
    for (const u of unitsQuery.data?.items ?? []) {
      const part = [u.part_number, u.part_name, formatCondition(u.variant_condition)].filter(Boolean).join(" · ");
      m.set(u.id, { serial: u.serial_number, part });
    }
    return m;
  }, [unitsQuery.data]);

  // Still loose: picked, and neither returned nor already fitted.
  const fittableIds = useMemo(() => returnableUnitIds(movementsQuery.data ?? []), [movementsQuery.data]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState("");

  const fit = useFitSpareRequest();
  const blockReason = selected.size === 0 ? S.fitDialog.noUnits : null;
  const submit = () => {
    if (!request || blockReason) return;
    fit.mutate(
      {
        reqId: request.id,
        deviceId: request.deviceId,
        body: { stock_item_ids: [...selected], position: position.trim() || null },
      },
      { onSuccess: onClose },
    );
  };

  return {
    open,
    isLoading: movementsQuery.isLoading || unitsQuery.isLoading,
    isError: movementsQuery.isError,
    fittableIds,
    unitById,
    selected,
    toggle: (unitId: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(unitId)) next.delete(unitId);
        else next.add(unitId);
        return next;
      }),
    position,
    setPosition,
    blockReason,
    dirty: selected.size > 0 || position.trim() !== "",
    pending: fit.isPending,
    submit,
  };
}
