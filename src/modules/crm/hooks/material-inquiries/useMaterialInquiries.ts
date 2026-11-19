import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION } from "@/shared/constants"

import {
  addMaterialInquiryItem,
  closeMaterialInquiry,
  createMaterialInquiry,
  deleteMaterialInquiry,
  deleteMaterialInquiryItem,
  fetchMaterialInquiries,
  fetchMaterialInquiry,
  submitMaterialInquiry,
  updateMaterialInquiry,
  updateMaterialInquiryItem,
} from "../../api"
import type {
  FetchMaterialInquiriesParams,
  MaterialInquiryCreatePayload,
  MaterialInquiryItemCreatePayload,
  MaterialInquiryItemUpdatePayload,
  MaterialInquiryUpdatePayload,
  MaterialInquiryWire,
} from "../../api"
import { MATERIAL_INQUIRIES_STRINGS as S } from "../../components/material-inquiries/material-inquiries.strings"
import { invalidateEntityStats } from "../shared/entityStats"

// Query keys split into structural levels per Coding-guideline §16.9 so
// mutations can do targeted invalidation. Item mutations only touch the
// parent MI's detail key + the list; never blanket-invalidate.
const MI_KEY = ["crm", "material-inquiries"] as const
const LIST_KEY = [...MI_KEY, "list"] as const
const DETAIL_KEY = [...MI_KEY, "detail"] as const
const OPTIONS_KEY = [...MI_KEY, "options"] as const

export function useMaterialInquiries(
  params: FetchMaterialInquiriesParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchMaterialInquiries(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

// Infinite-scroll variant for embedded list views (Lead/Deal detail
// "Material Inquiries" tab) per Coding-guideline §16.11: pages through
// the same `?lead_id=` / `?deal_id=` filter and lets the consumer drive
// `fetchNextPage()` from a scroll observer.
export function useMaterialInquiriesInfinite(
  params: Omit<FetchMaterialInquiriesParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...LIST_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchMaterialInquiries({ ...params, page: pageParam, page_size: pageSize }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

export function useMaterialInquiry(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => fetchMaterialInquiry(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}

function invalidateLists(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: LIST_KEY })
  void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
}

// ── Header CRUD ──────────────────────────────────────────────────

export function useCreateMaterialInquiry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MaterialInquiryCreatePayload) => createMaterialInquiry(body),
    onSuccess: (created: MaterialInquiryWire) => {
      invalidateLists(qc)
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      // Bump the parent lead/deal's Material Inquiries count badge. The parent
      // isn't in scope here, so refresh whichever entity-stats query is cached.
      invalidateEntityStats(qc)
      toast.success(S.toast.created)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateMaterialInquiry(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MaterialInquiryUpdatePayload) => updateMaterialInquiry(id, body),
    onSuccess: (updated: MaterialInquiryWire) => {
      invalidateLists(qc)
      qc.setQueryData([...DETAIL_KEY, id], updated)
      toast.success(S.toast.updated)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteMaterialInquiry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMaterialInquiry(id),
    onSuccess: (_data, id) => {
      invalidateLists(qc)
      qc.removeQueries({ queryKey: [...DETAIL_KEY, id] })
      invalidateEntityStats(qc)
      toast.success(S.toast.deleted)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── State transitions ────────────────────────────────────────────

export function useSubmitMaterialInquiry(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => submitMaterialInquiry(id),
    onSuccess: (updated) => {
      invalidateLists(qc)
      qc.setQueryData([...DETAIL_KEY, id], updated)
      toast.success(S.toast.submitted(updated.enquiry_number))
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCloseMaterialInquiry(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => closeMaterialInquiry(id),
    onSuccess: (updated) => {
      invalidateLists(qc)
      qc.setQueryData([...DETAIL_KEY, id], updated)
      toast.success(S.toast.closed)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Item endpoints (Draft-only on the backend) ───────────────────
//
// All three invalidate ONLY the parent MI's detail entry — the list query
// returns slim rows without items so it doesn't need to refetch on item
// edits. Per §16.9.

export function useAddMaterialInquiryItem(miId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MaterialInquiryItemCreatePayload) =>
      addMaterialInquiryItem(miId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, miId] })
      toast.success(S.toast.itemAdded)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateMaterialInquiryItem(miId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: MaterialInquiryItemUpdatePayload }) =>
      updateMaterialInquiryItem(miId, itemId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, miId] })
      toast.success(S.toast.itemUpdated)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteMaterialInquiryItem(miId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => deleteMaterialInquiryItem(miId, itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, miId] })
      toast.success(S.toast.itemDeleted)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
