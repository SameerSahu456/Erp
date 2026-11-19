import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"

import {
  createVendor,
  deleteVendor,
  fetchVendor,
  fetchVendorContacts,
  fetchVendors,
  updateVendor,
  type FetchVendorsParams,
  type Vendor,
  type VendorCreatePayload,
  type VendorUpdatePayload,
} from "../../api"
import { VENDORS_STRINGS } from "../../components/vendors/vendors.strings"

const KEY = ["procurement", "vendors"] as const
const LIST_KEY = [...KEY, "list"] as const
const DETAIL_KEY = [...KEY, "detail"] as const
const OPTIONS_KEY = [...KEY, "options"] as const

function invalidateLists(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: LIST_KEY })
  void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
}

export function useVendors(
  params: FetchVendorsParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchVendors(params),
    placeholderData: keepPreviousData,
    // Optional gate for callers that mount the hook before it should fetch
    // (e.g. a closed dialog whose consumer lacks `procurement:vendor_read`).
    enabled: options.enabled ?? true,
  })
}

export function useVendor(id: string | null | undefined) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id ?? ""],
    queryFn: () => fetchVendor(id as string),
    enabled: !!id,
  })
}

// Infinite-scroll picker hook for vendor dropdowns (Coding-guideline §16.11).
// Backend `?search` accepts arbitrary length; debounce locally to keep the
// keystroke-storm down. Use from `<AsyncMultiSelect useOptions={…}>`.
export function useVendorOptions(
  rawSearch: string,
  options: { enabled?: boolean } = {},
) {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE

  return useInfiniteQuery({
    queryKey: [...OPTIONS_KEY, { search: debounced }],
    queryFn: ({ pageParam }) =>
      fetchVendors({
        page: pageParam,
        page_size: pageSize,
        search: debounced || undefined,
        status: "active",
        sort: "name",
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options.enabled ?? true,
  })
}

// Infinite-scroll picker hook for a specific vendor's contacts — backs the PO
// "Purchase Requested By" AsyncSelect. Disabled until a vendor is selected.
export function useVendorContactOptions(
  vendorId: string,
  rawSearch: string,
  options: { enabled?: boolean } = {},
) {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE

  return useInfiniteQuery({
    queryKey: [...OPTIONS_KEY, "contacts", vendorId, { search: debounced }],
    queryFn: ({ pageParam }) =>
      fetchVendorContacts(vendorId, {
        page: pageParam,
        page_size: pageSize,
        search: debounced || undefined,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: !!vendorId && (options.enabled ?? true),
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: VendorCreatePayload) => createVendor(body),
    onSuccess: (created: Vendor) => {
      invalidateLists(qc)
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      toast.success(VENDORS_STRINGS.toast.created)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateVendor(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: VendorUpdatePayload) => updateVendor(id, body),
    onSuccess: (updated: Vendor) => {
      invalidateLists(qc)
      qc.setQueryData([...DETAIL_KEY, id], updated)
      toast.success(VENDORS_STRINGS.toast.updated)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: (_data, id) => {
      invalidateLists(qc)
      qc.removeQueries({ queryKey: [...DETAIL_KEY, id] })
      toast.success(VENDORS_STRINGS.toast.deleted)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
