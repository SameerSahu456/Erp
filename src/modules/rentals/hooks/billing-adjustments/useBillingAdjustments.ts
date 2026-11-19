import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { notifyMutationError } from "@/shared/api/notify-mutation-error"

import { BILLING_ADJUSTMENT_HOOK_STRINGS as T } from "./billing-adjustments-hooks.strings"
import {
  cancelBillingAdjustment,
  fetchBillingAdjustment,
  fetchBillingAdjustments,
  issueBillingAdjustment,
  type AdjustmentIssueRequest,
  type RentalBillingAdjustment,
  type SwapListParams,
} from "../../api/swaps"
import { invalidateCreditNotes, invalidateInvoices } from "../shared/invalidate"
import { rentalKeys } from "../shared/keys"

const K = rentalKeys.adjustments

export const useBillingAdjustments = (params: SwapListParams, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchBillingAdjustments(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  })

export const useBillingAdjustment = (id: string | undefined) =>
  useQuery({
    queryKey: K.detail(id ?? ""),
    queryFn: () => fetchBillingAdjustment(id as string),
    enabled: !!id,
  })

function useAdjustmentSync() {
  const qc = useQueryClient()
  return (row: RentalBillingAdjustment) => {
    qc.setQueryData(K.detail(row.id), row)
    void qc.invalidateQueries({ queryKey: K.lists() })
    // Issuing writes credit notes against invoices the row does not name.
    invalidateInvoices(qc)
    invalidateCreditNotes(qc)
  }
}

export function useIssueBillingAdjustment() {
  const sync = useAdjustmentSync()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdjustmentIssueRequest }) => issueBillingAdjustment(id, body),
    onSuccess: (row) => {
      sync(row)
      toast.success(T.issuedToast)
    },
    onError: notifyMutationError,
  })
}

export function useCancelBillingAdjustment() {
  const sync = useAdjustmentSync()
  return useMutation({
    mutationFn: (id: string) => cancelBillingAdjustment(id),
    onSuccess: (row) => {
      sync(row)
      toast.success(T.cancelledToast)
    },
    onError: notifyMutationError,
  })
}
