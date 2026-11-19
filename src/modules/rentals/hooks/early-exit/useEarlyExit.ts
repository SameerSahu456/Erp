import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { notifyMutationError } from "@/shared/api/notify-mutation-error"
import { deficiencyKeys } from "@modules/crm"

import { EARLY_EXIT_HOOK_STRINGS as T } from "./early-exit-hooks.strings"
import {
  decideWaiverRequest,
  fetchEarlyExitCharges,
  fetchEarlyExitQueue,
  markDeviceFoundInUse,
  recordDeviceLoss,
  requestAccountEarlyExitTerms,
  requestEarlyExitWaiver,
  type AccountEarlyExitTermsRequest,
  type RecordLossRequest,
  type WaiverRequest,
} from "../../api/early-exit"
import type { RentalDevice } from "../../api/devices"
import { invalidateDevice } from "../shared/invalidate"
import { isSalesOrderSubQuery, rentalKeys } from "../shared/keys"

export const useEarlyExitCharges = (salesOrderId: string | undefined) =>
  useQuery({
    queryKey: rentalKeys.salesOrders.earlyExit(salesOrderId),
    queryFn: () => fetchEarlyExitCharges(salesOrderId as string),
    enabled: !!salesOrderId,
  })

/** Approvals → Early exit: terminations and waivers in one paged queue. */
export const useEarlyExitQueue = (
  params: { status?: string[]; page?: number; page_size?: number },
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: rentalKeys.earlyExitQueue.list(params),
    queryFn: () => fetchEarlyExitQueue(params),
    placeholderData: keepPreviousData,
    // Off while the page shows its early-exit returns tab instead (§19).
    enabled: options?.enabled ?? true,
  })

/** A waiver names a charge or an account, never its order: every order's charges re-read. */
function invalidateWaivers(qc: QueryClient) {
  void qc.invalidateQueries({ predicate: isSalesOrderSubQuery("early-exit") })
  void qc.invalidateQueries({ queryKey: rentalKeys.earlyExitQueue.lists() })
}

function useWaiverMutation<V>(run: (vars: V) => Promise<WaiverRequest>, message: string, decides = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (row) => {
      invalidateWaivers(qc)
      // An approved terms change rewrites the account's settings.
      if (decides) void qc.invalidateQueries({ queryKey: rentalKeys.accountSettings.detail(row.account_id) })
      toast.success(message)
    },
    onError: notifyMutationError,
  })
}

export const useRequestEarlyExitWaiver = () =>
  useWaiverMutation(
    ({ chargeId, reason }: { chargeId: string; reason: string }) => requestEarlyExitWaiver(chargeId, reason),
    T.waiverRequested,
  )

export const useRequestAccountEarlyExitTerms = () =>
  useWaiverMutation(
    ({ accountId, body }: { accountId: string; body: AccountEarlyExitTermsRequest }) =>
      requestAccountEarlyExitTerms(accountId, body),
    T.waiverRequested,
  )

export const useDecideWaiverRequest = () =>
  useWaiverMutation(
    ({ id, approve, notes }: { id: string; approve: boolean; notes?: string }) => decideWaiverRequest(id, approve, notes),
    T.decided,
    true,
  )

/** Lost / found moves the unit, its order's billing + early-exit charges, and
 *  CRM's deficiency register. The order comes from the cached unit. */
function useDeviceSync() {
  const qc = useQueryClient()
  return (deviceId: string) => {
    const device = qc.getQueryData<RentalDevice>(rentalKeys.devices.detail(deviceId))
    invalidateDevice(qc, device ?? { id: deviceId })
    if (!device) {
      void qc.invalidateQueries({ predicate: isSalesOrderSubQuery("billing") })
      void qc.invalidateQueries({ predicate: isSalesOrderSubQuery("early-exit") })
    }
    void qc.invalidateQueries({ queryKey: deficiencyKeys.lists() })
    void qc.invalidateQueries({ queryKey: deficiencyKeys.counts() })
  }
}

export function useRecordDeviceLoss() {
  const sync = useDeviceSync()
  return useMutation({
    mutationFn: ({ deviceId, body }: { deviceId: string; body: RecordLossRequest }) =>
      recordDeviceLoss(deviceId, body),
    onSuccess: (_res, { deviceId }) => {
      sync(deviceId)
      toast.success(T.lost)
    },
    onError: notifyMutationError,
  })
}

export function useMarkDeviceFoundInUse() {
  const sync = useDeviceSync()
  return useMutation({
    mutationFn: ({ deviceId, notes }: { deviceId: string; notes: string }) =>
      markDeviceFoundInUse(deviceId, notes),
    onSuccess: (_res, { deviceId }) => {
      sync(deviceId)
      toast.success(T.found)
    },
    onError: notifyMutationError,
  })
}
