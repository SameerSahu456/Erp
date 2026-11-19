import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { AsyncSelectOption } from "@/components/ui/async-select";
import { useDispatchReadyUnits } from "./useDispatchReadyUnits";
import {
  useOutwardSourcesInfinite,
  type OutwardSourceOption,
} from "../material-issue/useOutwardSources";
import {
  SOURCE_TYPES,
  parseDispatchCreateSeed,
} from "../../components/dispatches/dispatch-create-helpers";

/** Source + ready-unit selection for the dispatch-create wizard, incl. the deep-link seed. */
export function useDispatchCreateSource() {
  // Deep-link seed, validated per §11.1; invalid params leave the default.
  const [searchParams] = useSearchParams();
  const [seed] = useState(() => parseDispatchCreateSeed(searchParams));

  const [sourceTypeKey, setSourceTypeKey] = useState(seed.sourceTypeKey);
  const sourceType = SOURCE_TYPES.find((s) => s.key === sourceTypeKey)!;
  const [source, setSource] = useState<AsyncSelectOption | null>(seed.source);
  const [sourceRow, setSourceRow] = useState<OutwardSourceOption | null>(null);
  const sourceId = source?.id ?? "";

  const readyQ = useDispatchReadyUnits(
    sourceType.wired ? sourceType.entity : "",
    sourceId,
  );
  const units = useMemo(() => readyQ.data?.units ?? [], [readyQ.data]);

  // A seeded source has no picked row, so fetch it to fill the summary card.
  const isSeedSourceSelected =
    !!seed.source && source?.id === seed.source.id;
  const seedRowQuery = useOutwardSourcesInfinite(
    sourceType.dispatchType,
    seed.source?.label ?? "",
    { readyOnly: true, enabled: isSeedSourceSelected && !sourceRow },
  );
  const seedSourceRow = useMemo(() => {
    if (!isSeedSourceSelected) return null;
    const rows = seedRowQuery.data?.pages.flatMap((p) => p.items) ?? [];
    return rows.find((r) => r.id === seed.source?.id) ?? null;
  }, [isSeedSourceSelected, seedRowQuery.data, seed.source]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === units.length
        ? new Set()
        : new Set(units.map((u) => u.material_issue_item_id)),
    );

  const selectType = (key: string) => {
    if (key === sourceTypeKey) return;
    setSourceTypeKey(key);
    setSource(null);
    setSourceRow(null);
    setSelected(new Set());
  };
  const changeSource = (next: AsyncSelectOption | null) => {
    setSource(next);
    if (!next) setSourceRow(null);
    setSelected(new Set());
  };

  return {
    seed,
    sourceTypeKey,
    sourceType,
    source,
    sourceId,
    // Falls back to the seed-fetched row so a deep-linked source shows its
    // summary without a manual re-pick.
    summaryRow: sourceRow ?? seedSourceRow,
    selectType,
    changeSource,
    pickSourceRow: setSourceRow,
    readyQ,
    units,
    selected,
    toggle,
    toggleAll,
  };
}

export type DispatchCreateSourceState = ReturnType<typeof useDispatchCreateSource>;
