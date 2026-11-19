import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { PageParams } from "@/shared/api/pagination"
import { notifyMutationError } from "@/shared/api/notify-mutation-error"

import {
  decideExtendRequest,
  fetchPendingExtendRequests,
  type ExtendDecision,
  type ExtendRequest,
} from "../../api/extend-requests"
import { invalidateDevices, invalidateInvoices, invalidateSalesOrder } from "../shared/invalidate"
import { rentalKeys } from "../shared/keys"
import { APPROVALS_HOOKS_STRINGS as S } from "./approvals-hooks.strings"

const K = rentalKeys.extendApprovals

/** Rate-changing extends still waiting for a decision. */
export const usePendingExtendRequests = (params: PageParams) =>
  useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchPendingExtendRequests(params),
    placeholderData: keepPreviousData,
  })

/** Approve (which applies the extend: new end date, new rates) or reject
 *  (with notes — nothing moves). */
export function useDecideExtendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      request,
      decision,
      notes,
    }: {
      request: ExtendRequest
      decision: ExtendDecision
      notes: string | null
    }) => decideExtendRequest(request.id, decision, notes),
    onSettled: () => void qc.invalidateQueries({ queryKey: K.lists() }),
    onSuccess: (request, { decision }) => {
      if (decision === "approve") {
        // The order's end date and its units' rates moved; future invoices
        // price at the new figures.
        invalidateSalesOrder(qc, request.sales_order_id)
        invalidateInvoices(qc, [request.sales_order_id])
        invalidateDevices(qc)
      }
      toast.success(decision === "approve" ? S.extendApproved : S.extendRejected)
    },
    onError: notifyMutationError,
  })
}
