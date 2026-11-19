import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import {
  fetchBrandById,
  fetchBrands,
} from "../../api"
import { FIRST_PAGE, nextPage } from "@/shared/api/pagination"

// Server-state hooks for the "Business Vertical" (brand) picker on the quote
// builder. The brand list is small, but per Coding-guideline §16.11 an
// API-backed dropdown is still driven by `useInfiniteQuery` + AsyncSelect so
// it shares the debounced-search / scroll-to-load / 403→NoAccess behaviour of
// every other picker.

const KEY = ["crm", "brands"] as const

// Infinite-scroll query feeding the AsyncSelect vertical dropdown. Only active
// (`is_active`) brands are selectable on a new quote.
export function useBrandsInfinite(
  search: string,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: [...KEY, "infinite", { search }],
    queryFn: ({ pageParam }) =>
      fetchBrands({ search: search || undefined, is_active: true, page: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options?.enabled ?? true,
  })
}

// Single brand by id — used in edit mode to resolve `quote.brand_id` back into
// the code + name needed for the frozen dropdown chip and the "Reset to
// <brand> default" label (the quote response carries only `brand_id`).
export function useBrand(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "detail", id],
    queryFn: () => fetchBrandById(id as string),
    enabled: !!id,
  })
}