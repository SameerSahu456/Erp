import { useMemo } from 'react'

import { useStockItemsInfinite, useVariantsListInfinite } from '@modules/ims'

// Only sellable stock is issuable as a spare. Module-level constant so its
// identity is stable across renders (keeps the picker's query key stable).
export const STATUS_AVAILABLE = ['available'] as const

/** Part chooser options: all parts, narrowed by optional category and search. */
export function makeVariantOptions(categoryId: string) {
  return function useVariantOptions(search: string, opts?: { enabled?: boolean }) {
    return useVariantsListInfinite(search, {
      enabled: opts?.enabled,
      category_id: categoryId || undefined,
    })
  }
}

/** Per-slot unit options (§16.11), excluding units picked in other slots so no
 *  unit is issued twice. */
export function makeUnitOptions(
  partVariantId: string | undefined,
  warehouseId: string | null | undefined,
  excludeIds: readonly string[],
  gate: boolean,
) {
  const excludeKey = excludeIds.join(',')
  return function useUnitOptions(search: string, opts?: { enabled?: boolean }) {
    const query = useStockItemsInfinite(search, {
      part_variant_id: partVariantId,
      status: STATUS_AVAILABLE,
      // Only truly-pickable units — exclude ones 'available' but still in the
      // ops pipeline (in_operations). Backend enforces workflow_status IS NULL.
      available_for_pick: true,
      warehouse_id: warehouseId ?? undefined,
      enabled: (opts?.enabled ?? true) && gate && !!partVariantId,
    })
    return useMemo(() => {
      if (!query.data) return query
      const exclude = new Set(excludeKey ? excludeKey.split(',') : [])
      return {
        ...query,
        data: {
          ...query.data,
          pages: query.data.pages.map((p) => ({ ...p, items: p.items.filter((u) => !exclude.has(u.id)) })),
        },
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, excludeKey])
  }
}
