import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { notifyMutationError } from "@/shared/api/notify-mutation-error"
import { formatIST_date } from "@shared/lib/date"

import {
  cancelActionRequest,
  decideActionRequest,
  fetchActionRequests,
  type ActionRequestsQuery,
  type DecidableRequest,
} from "../../api/action-requests"
import { invalidateDeletedInvoice } from "../invoices/useRentalInvoices"
import { invalidateDevices, invalidateInvoices, invalidateSalesOrder } from "../shared/invalidate"
import { rentalKeys } from "../shared/keys"
import { APPROVALS_HOOKS_STRINGS as S } from "./approvals-hooks.strings"

/** Termination / invoice-deletion requests — a queue, or one order's or
 *  invoice's own (the "waiting for approval" banner). */
export const useActionRequests = (params: ActionRequestsQuery, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: rentalKeys.actionRequests.list(params),
    queryFn: () => fetchActionRequests(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  })

// Still open: waiting for a decision, or a termination approved for a later
// date and not yet carried out (2026-11-15).
const OPEN_STATUSES: readonly string[] = ["pending", "scheduled"]

/** The one open request against an order or invoice, if any. At most one is
 *  open at a time and a new one can only follow a closed one, so the newest
 *  request is the open one when anything is. */
export function usePendingActionRequest(
  params: Pick<ActionRequestsQuery, "subject" | "sales_order_id" | "rental_invoice_id">,
) {
  const query = useActionRequests(
    { ...params, page: 1, page_size: 1 },
    { enabled: !!(params.sales_order_id || params.rental_invoice_id) },
  )
  const newest = query.data?.items[0]
  return newest && OPEN_STATUSES.includes(newest.status) ? newest : null
}

/** Both queues a termination or deletion appears in. */
function invalidateRequestQueues(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: rentalKeys.actionRequests.lists() })
  void qc.invalidateQueries({ queryKey: rentalKeys.earlyExitQueue.lists() })
}

/** Approve (which carries the action out — for a termination, optionally
 *  waiving its early-exit charge) or reject (with a reason). */
export function useDecideActionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      row,
      approve,
      notes,
      waiveEarlyExit,
    }: {
      row: DecidableRequest
      approve: boolean
      notes?: string
      waiveEarlyExit?: boolean
    }) => decideActionRequest(row, approve, notes, waiveEarlyExit),
    onSuccess: (row, { approve, waiveEarlyExit }) => {
      invalidateRequestQueues(qc)
      if (approve && row.subject === "terminate") {
        // The order ended, its final invoice was raised and its units retired.
        invalidateSalesOrder(qc, row.sales_order_id)
        invalidateInvoices(qc, [row.sales_order_id])
        invalidateDevices(qc)
        void qc.invalidateQueries({ queryKey: rentalKeys.salesOrders.earlyExit(row.sales_order_id) })
      } else if (approve && row.rental_invoice_id) {
        invalidateDeletedInvoice(qc, row.rental_invoice_id)
      }
      let message: string = S.rejected
      if (approve) message = waiveEarlyExit ? S.approvedWaived : S.approved
      // Dated ahead: approved, but carried out on its date.
      if (row.status === "scheduled" && row.effective_date) {
        message = S.scheduled(formatIST_date(row.effective_date))
      }
      toast.success(message)
    },
    onError: notifyMutationError,
  })
}

/** The requester withdraws their own request. */
export function useCancelActionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; scheduled?: boolean }) => cancelActionRequest(id),
    onSuccess: (row, { scheduled }) => {
      invalidateRequestQueues(qc)
      // A scheduled termination's date came off the order: it bills to its end again.
      if (scheduled) invalidateSalesOrder(qc, row.sales_order_id)
      toast.success(scheduled ? S.scheduleCancelled : S.withdrawn)
    },
    onError: notifyMutationError,
  })
}
