import { useMemo } from "react";

import { useStockItemsByIds, useVariantsByIds } from "@modules/ims";

// Resolve UUIDs shown on the Material Issue surfaces → human labels, batched
// through the IMS by-id resolvers (one lookup per page, never per cell).
//
// The joined-ids "signature" dependency is deliberate: `useQueries` returns a
// fresh array of query objects every render, so depending on the array itself
// would defeat the memo. Depending on the joined resolved-id string keeps the
// label fn stable until a lookup actually lands. This is the ONE sanctioned
// exhaustive-deps exception for the sub-feature — centralized here instead of
// copy-pasted (with its eslint-disable) into every page.

/** Variant id → `sku_code` / name, falling back to an 8-char UUID stub while
 *  the lookup is in flight (or for an unknown id). */
export function useVariantLabelMap(
  variantIds: string[],
): (id: string) => string {
  const queries = useVariantsByIds(variantIds);
  const sig = queries.map((q) => q.data?.id ?? "").join(",");
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const q of queries) {
      const v = q.data;
      if (v) map.set(v.id, v.sku_code || v.name || v.id.slice(0, 8));
    }
    return (id: string) => map.get(id) ?? id.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
}

/** Stock-item id → internal (or manufacturer) serial, same stub fallback. */
export function useStockSerialMap(stockIds: string[]): (id: string) => string {
  const queries = useStockItemsByIds(stockIds);
  const sig = queries.map((q) => q.data?.id ?? "").join(",");
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const q of queries) {
      const s = q.data;
      if (s)
        map.set(
          s.id,
          s.internal_serial || s.manufacturer_serial || s.id.slice(0, 8),
        );
    }
    return (id: string) => map.get(id) ?? id.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
}
