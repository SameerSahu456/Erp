import { useMemo, useState } from "react";

import {
  groupUnitsByVariant,
  searchUnits,
  type MovableUnit,
  type SelectMode,
} from "../../components/stock-transfer/move-stock-helpers";

/** Move-dialog unit selection: serial ticks, per-variant quantities and search. */
export function useUnitSelection(
  pool: MovableUnit[],
  defaultSelectedIds: string[],
  isTransfer: boolean,
) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedIds),
  );
  // Arriving from a single unit, the unit is already decided — serial mode.
  const [mode, setMode] = useState<SelectMode>(
    defaultSelectedIds.length > 0 ? "serial" : "variant",
  );
  // qty per variant id, the shape variant mode edits.
  const [variantQty, setVariantQty] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const variantGroups = useMemo(() => groupUnitsByVariant(pool), [pool]);

  /** Variant mode resolves to serials at once (D5); "move 5" is ambiguous across conditions. */
  const applyVariantQty = (variantId: string, qty: number) => {
    const next = { ...variantQty, [variantId]: Math.max(0, qty) };
    setVariantQty(next);
    const picked = new Set<string>();
    for (const group of variantGroups) {
      const n = next[group.variantId] ?? 0;
      for (const u of group.units.slice(0, n)) picked.add(u.id);
    }
    setSelected(picked);
  };

  // Mid-pipeline units may cross warehouses (inspection restarts there), so nothing is filtered;
  // the row shows the caveat instead.
  const eligible = pool;
  const restartingInspection = isTransfer
    ? pool.filter((u) => selected.has(u.id) && u.status === "in_operations").length
    : 0;

  // Prune stale ticks during render (no setState-in-effect) so the count matches the screen.
  const eligibleIds = useMemo(() => new Set(eligible.map((u) => u.id)), [eligible]);
  const strandedSelected = [...selected].filter((id) => !eligibleIds.has(id));
  if (isTransfer && strandedSelected.length > 0) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of strandedSelected) next.delete(id);
      return next;
    });
  }

  // The search box lives on the "By serial" tab only, so it filters only there;
  // the text is kept for when the operator comes back to that tab.
  const filtered = useMemo(
    () => (mode === "serial" ? searchUnits(pool, search) : pool),
    [pool, search, mode],
  );

  const selectableFiltered = filtered;
  const allFilteredSelected =
    selectableFiltered.length > 0 && selectableFiltered.every((u) => selected.has(u.id));
  const toggleAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) for (const u of selectableFiltered) next.delete(u.id);
      else for (const u of selectableFiltered) next.add(u.id);
      return next;
    });
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Drop every pick — the old selection belongs to an old source/destination. */
  const clearPicks = () => {
    setSelected(new Set());
    setVariantQty({});
  };
  /** Narrow the selection to exactly these ids. Used after a partial relocate
   *  to keep only the un-assigned overflow ticked; variant qty no longer maps. */
  const keepOnly = (ids: string[]) => {
    setSelected(new Set(ids));
    setVariantQty({});
  };
  const reset = () => {
    setSelected(new Set(defaultSelectedIds));
    setVariantQty({});
    setSearch("");
  };

  // Compared to caller defaults (a pre-ticked unit isn't a change); search is a filter, not data.
  const selectionDirty =
    selected.size !== defaultSelectedIds.length ||
    defaultSelectedIds.some((id) => !selected.has(id));
  const dirty = selectionDirty || Object.values(variantQty).some((n) => n > 0);

  return {
    selected,
    mode,
    setMode,
    variantQty,
    variantGroups,
    applyVariantQty,
    search,
    setSearch,
    filtered,
    selectableFiltered,
    allFilteredSelected,
    toggleAllFiltered,
    toggle,
    restartingInspection,
    clearPicks,
    keepOnly,
    reset,
    dirty,
  };
}

export type UnitSelectionState = ReturnType<typeof useUnitSelection>;
