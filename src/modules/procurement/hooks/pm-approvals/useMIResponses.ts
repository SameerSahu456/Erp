import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  addMIResponse,
  approveMIResponse,
  deleteMIResponse,
  fetchMIProcurementDetail,
  fetchMIResponse,
  fetchMIResponsesForItem,
  fetchMyPMQueue,
  rejectMIResponse,
  type FetchMyPMQueueParams,
  type MIResponseAddPayload,
  type MIResponsePMApprovePayload,
  type MIResponsePMRejectPayload,
} from "../../api"
import { PM_APPROVALS_STRINGS } from "../../components/pm-approvals/pm-approvals.strings"

// Query keys split per Coding-guideline §16.9 so mutations can do targeted
// invalidation. The list key is keyed by (miId, itemId) so adding a
// response on one item doesn't invalidate every other item's list.
const KEY = ["procurement", "mi-responses"] as const
const RESPONSES_LIST_KEY = [...KEY, "by-item"] as const
const RESPONSE_DETAIL_KEY = [...KEY, "detail"] as const
const PM_QUEUE_KEY = ["procurement", "pm-queue"] as const
const PROC_MI_DETAIL_KEY = ["procurement", "mi-detail"] as const

// CRM-side query keys we also poke. Adding/updating/deleting a response
// changes the sales-side `responses[]` embed under the MI detail GET, so
// we invalidate that detail entry too. Keeps the sales view in sync without
// the user reloading.
const CRM_MI_DETAIL_KEY = ["crm", "material-inquiries", "detail"] as const

export function useMIResponsesForItem(
  miId: string,
  itemId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...RESPONSES_LIST_KEY, miId, itemId],
    queryFn: () => fetchMIResponsesForItem(miId, itemId),
    enabled: !!miId && !!itemId && (options?.enabled ?? true),
  })
}

export function useMIResponse(
  miId: string,
  respId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...RESPONSE_DETAIL_KEY, miId, respId ?? ""],
    queryFn: () => fetchMIResponse(miId, respId as string),
    enabled: !!miId && !!respId && (options?.enabled ?? true),
  })
}

function invalidateAffectedItem(
  qc: ReturnType<typeof useQueryClient>,
  miId: string,
  itemId: string,
) {
  void qc.invalidateQueries({ queryKey: [...RESPONSES_LIST_KEY, miId, itemId] })
  void qc.invalidateQueries({ queryKey: [...CRM_MI_DETAIL_KEY, miId] })
}

// Wider invalidation used after PM approve/reject — beyond the per-item
// list, the procurement-side MI detail (response_summary + qty_allocated /
// remaining + blended_sell_price) and the PM pending queue both shift.
function invalidateAfterPMAction(
  qc: ReturnType<typeof useQueryClient>,
  miId: string,
  itemId: string,
) {
  invalidateAffectedItem(qc, miId, itemId)
  void qc.invalidateQueries({ queryKey: [...PROC_MI_DETAIL_KEY, miId] })
  void qc.invalidateQueries({ queryKey: PM_QUEUE_KEY })
}

export function useAddMIResponse(miId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: MIResponseAddPayload }) =>
      addMIResponse(miId, itemId, body),
    onSuccess: (_data, { itemId }) => {
      invalidateAffectedItem(qc, miId, itemId)
      toast.success(PM_APPROVALS_STRINGS.toast.responseRecorded)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteMIResponse(miId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ respId, itemId: _itemId }: { respId: string; itemId: string }) =>
      deleteMIResponse(miId, respId),
    onSuccess: (_data, { itemId, respId }) => {
      invalidateAffectedItem(qc, miId, itemId)
      qc.removeQueries({ queryKey: [...RESPONSE_DETAIL_KEY, miId, respId] })
      toast.success(PM_APPROVALS_STRINGS.toast.responseDeleted)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── PM queue + approve / reject (MI-4) ───────────────────────────

// PM queue, grouped per inquiry and server-paginated.
export function useMyPMQueue(
  params: FetchMyPMQueueParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...PM_QUEUE_KEY, params],
    queryFn: () => fetchMyPMQueue(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

// Procurement-side MI detail — different shape from the sales-side
// `useMaterialInquiry`: embeds lead snapshot, per-item response_summary +
// qty_allocated_total / qty_remaining / blended_sell_price (no inline
// responses; PM clicks through to the per-item response list).
export function useMIProcurementDetail(
  miId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...PROC_MI_DETAIL_KEY, miId ?? ""],
    queryFn: () => fetchMIProcurementDetail(miId as string),
    enabled: !!miId && (options?.enabled ?? true),
  })
}

export function useApproveMIResponse(miId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      respId,
      itemId: _itemId,
      body,
    }: {
      respId: string
      itemId: string                // for targeted invalidation
      body: MIResponsePMApprovePayload
    }) => approveMIResponse(miId, respId, body),
    onSuccess: (data, { itemId }) => {
      invalidateAfterPMAction(qc, miId, itemId)
      qc.setQueryData([...RESPONSE_DETAIL_KEY, miId, data.id], data)
      toast.success(PM_APPROVALS_STRINGS.toast.responseApproved)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRejectMIResponse(miId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      respId,
      itemId: _itemId,
      body,
    }: {
      respId: string
      itemId: string
      body?: MIResponsePMRejectPayload
    }) => rejectMIResponse(miId, respId, body ?? {}),
    onSuccess: (data, { itemId }) => {
      invalidateAfterPMAction(qc, miId, itemId)
      qc.setQueryData([...RESPONSE_DETAIL_KEY, miId, data.id], data)
      toast.success(PM_APPROVALS_STRINGS.toast.responseRejected)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
