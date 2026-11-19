import { useMemo, useState } from "react";

import type { ReturnableUnit } from "../../api";
import type { ReturnSelections } from "../../components/purchase-returns/return-selection";

/** Client-side line-item search + status filter and the header select-all. */
export function useReturnableUnitFilter(
  units: ReturnableUnit[],
  selections: ReturnSelections,
  onToggle: (unit: ReturnableUnit) => void,
) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const statusOptions = useMemo(
    () => [...new Set(units.map((u) => u.status).filter(Boolean))],
    [units],
  );
  const visibleUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units
      .filter((u) => {
        if (statusFilter && u.status !== statusFilter) return false;
        if (q) {
          const hay = `${u.internal_serial ?? ""} ${u.manufacturer_serial ?? ""} ${
            u.part_number ?? ""
          } ${u.part_variant_name ?? ""} ${u.grn_batch_number ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      // Selectable units first; the stable sort keeps receipt order within each group.
      .sort((a, b) => Number(b.returnable) - Number(a.returnable));
  }, [units, search, statusFilter]);
  // Select-all toggles every RETURNABLE visible unit. Parent `onToggle` uses a
  // functional setState, so looping it in one handler batches safely.
  const selectableVisible = useMemo(
    () => visibleUnits.filter((u) => u.returnable),
    [visibleUnits],
  );
  const allSelected =
    selectableVisible.length > 0 &&
    selectableVisible.every((u) => selections[u.stock_item_id] != null);
  function toggleAll() {
    selectableVisible.forEach((u) => {
      const isSel = selections[u.stock_item_id] != null;
      if (allSelected ? isSel : !isSel) onToggle(u);
    });
  }
  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    statusOptions,
    visibleUnits,
    selectableVisible,
    allSelected,
    toggleAll,
  };
}
