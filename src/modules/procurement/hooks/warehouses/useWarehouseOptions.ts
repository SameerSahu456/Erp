import { useInfiniteQuery } from "@tanstack/react-query"

import { fetchWarehousesPage } from "@modules/wms"
import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"

const OPTIONS_KEY = ["procurement", "warehouse-options"] as const

/**
 * AsyncSelect-compatible options hook for the PO form's warehouse picker:
 * active warehouses, server-searched by `q`, paged. Mirrors `useVendorOptions`
 * so the warehouse field is the SAME `AsyncSelect` as the vendor field.
 */
export function useWarehouseOptions(
  rawSearch: string,
  options: { enabled?: boolean } = {},
) {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE

  return useInfiniteQuery({
    queryKey: [...OPTIONS_KEY, { search: debounced }],
    queryFn: ({ pageParam }) =>
      fetchWarehousesPage({
        page: pageParam,
        page_size: pageSize,
        q: debounced || undefined,
        is_active: true,
        sort: "name",
        // A PO's warehouse is the DESTINATION goods are received into — a buyer
        // may direct a PO to any warehouse, and procurement users are never given
        // a warehouse_user_assignment (they're not engineers/SM/WM). So bypass the
        // assigned-warehouse scope here, exactly as the stock-transfer picker does;
        // without it this dropdown is always empty for a procurement-only user.
        as_transfer_target: true,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options.enabled ?? true,
  })
}
