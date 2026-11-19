import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { components } from "@/shared/api/schema.gen"
import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"

import { fetchVariantsListPage } from "../../api"
import { PART_KIT_STRINGS as S } from "../../components/parts/kit/part-kit.strings"

// A part's kit template (return-by-count §9): what ships with each unit of
// this model — a stock variant (charger) or free text (carry bag). WMS ticks
// it at dispatch and checks it at return.

export type PartKitItem = components["schemas"]["PartKitItemRow"]
export type PartKitItemInput = components["schemas"]["PartKitItemInput"]

const key = (partId: string) => ["ims", "parts", partId, "kit-items"] as const

export const usePartKitItems = (partId: string) =>
  useQuery({
    queryKey: key(partId),
    queryFn: () => apiClient.get<PartKitItem[]>(endpoints.ims.partKitItems(partId)),
    enabled: !!partId,
  })

/** The whole list is replaced in one PUT — order is the array order. */
export function useReplacePartKit(partId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: PartKitItemInput[]) =>
      apiClient.put<PartKitItem[]>(endpoints.ims.partKitItems(partId), { items }),
    onSuccess: (rows) => {
      qc.setQueryData(key(partId), rows)
      toast.success(S.saved)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

/** AsyncSelect source over every variant (§16.11): server search, paged. */
export function useKitVariantOptions(rawSearch: string, options: { enabled?: boolean } = {}) {
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: ["ims", "variants", "kit-options", search],
    queryFn: async ({ pageParam }) => {
      const page = await fetchVariantsListPage({ page: pageParam, page_size: pageSize, search, is_active: true })
      return { ...page, items: page.items.map((v) => ({ ...v, id: v.id })) }
    },
    initialPageParam: 1 as number,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0)
      return loaded < last.total ? all.length + 1 : undefined
    },
    enabled: options.enabled !== false,
  })
}
