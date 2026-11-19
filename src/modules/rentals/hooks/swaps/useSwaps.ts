import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { notifyMutationError } from "@/shared/api/notify-mutation-error"

import { SWAP_HOOK_STRINGS as T } from "./swaps-hooks.strings"
import {
  decideSwap,
  fetchSwap,
  fetchSwaps,
  proposeSwap,
  type RentalUnitSwap,
  type RentalUnitSwapCreate,
  type SwapListParams,
} from "../../api/swaps"
import { invalidateDevice } from "../shared/invalidate"
import { isSalesOrderSubQuery, rentalKeys } from "../shared/keys"

const K = rentalKeys.swaps

export const useSwaps = (params: SwapListParams) =>
  useQuery({ queryKey: K.list(params), queryFn: () => fetchSwaps(params), placeholderData: keepPreviousData })

export const useSwap = (id: string | undefined) =>
  useQuery({ queryKey: K.detail(id ?? ""), queryFn: () => fetchSwap(id as string), enabled: !!id })

function useSwapSync() {
  const qc = useQueryClient()
  return (swap: RentalUnitSwap) => {
    qc.setQueryData(K.detail(swap.id), swap)
    void qc.invalidateQueries({ queryKey: K.lists() })
    // Approving re-binds the paired units and may raise an adjustment.
    void qc.invalidateQueries({ queryKey: rentalKeys.adjustments.lists() })
    for (const pair of swap.pairs) {
      invalidateDevice(qc, { id: pair.returned_device_id })
      invalidateDevice(qc, { id: pair.staying_device_id })
    }
    // The swap names no orders; every order's billing card re-reads.
    if (swap.status === "approved") void qc.invalidateQueries({ predicate: isSalesOrderSubQuery("billing") })
  }
}

export function useProposeSwap() {
  const sync = useSwapSync()
  return useMutation({
    mutationFn: (body: RentalUnitSwapCreate) => proposeSwap(body),
    onSuccess: (swap) => {
      sync(swap)
      toast.success(T.proposedToast)
    },
    onError: notifyMutationError,
  })
}

export function useDecideSwap() {
  const sync = useSwapSync()
  return useMutation({
    mutationFn: ({ id, approve, notes }: { id: string; approve: boolean; notes?: string }) =>
      decideSwap(id, approve, notes),
    onSuccess: (swap) => {
      sync(swap)
      toast.success(swap.status === "approved" ? T.approvedToast : T.rejectedToast)
    },
    onError: notifyMutationError,
  })
}
