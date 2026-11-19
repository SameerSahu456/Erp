import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@shared/api/envelope"

import { DEFICIENCIES_STRINGS as S } from "../../components/deficiencies/deficiencies.strings"
import {
  decideDeficiencyWaiver,
  fetchCustomerDeficiencies,
  fetchCustomerDeficiency,
  markDeficiencyRecovered,
  raiseChargeOrder,
  requestDeficiencyWaiver,
  type ChargeOrderLineWire,
  type CustomerDeficiencyWire,
  type FetchDeficienciesParams,
} from "../../api"

// One key factory for the queue (Coding-guideline §15 — never inline keys).
export const deficiencyKeys = {
  all: ["crm", "deficiencies"] as const,
  lists: () => [...deficiencyKeys.all, "list"] as const,
  list: (p: FetchDeficienciesParams) => [...deficiencyKeys.lists(), p] as const,
  counts: () => [...deficiencyKeys.all, "count"] as const,
  count: (p: FetchDeficienciesParams) => [...deficiencyKeys.counts(), p] as const,
  detail: (id: string) => [...deficiencyKeys.all, "detail", id] as const,
}

function explain(error: Error): string {
  const code = error instanceof ApiError ? error.businessCode : undefined
  return (code && S.errors[code]) || error.message
}

export function useCustomerDeficiencies(params: FetchDeficienciesParams) {
  return useQuery({
    queryKey: deficiencyKeys.list(params),
    queryFn: () => fetchCustomerDeficiencies(params),
    placeholderData: keepPreviousData,
  })
}

/** A tab badge — one `page_size: 1` query, read off `total`. */
export function useCustomerDeficiencyCount(params: FetchDeficienciesParams) {
  return useQuery({
    queryKey: deficiencyKeys.count(params),
    queryFn: () => fetchCustomerDeficiencies({ ...params, page: 1, page_size: 1 }),
    select: (page) => page.total,
    placeholderData: keepPreviousData,
  })
}

export function useCustomerDeficiency(id: string | undefined) {
  return useQuery({
    queryKey: deficiencyKeys.detail(id ?? ""),
    queryFn: () => fetchCustomerDeficiency(id as string),
    enabled: !!id,
  })
}

/** Lists + counts move on any change; the detail is set from the response. */
function useSync() {
  const qc = useQueryClient()
  return (row?: CustomerDeficiencyWire) => {
    if (row) qc.setQueryData(deficiencyKeys.detail(row.id), row)
    else void qc.invalidateQueries({ queryKey: [...deficiencyKeys.all, "detail"] })
    void qc.invalidateQueries({ queryKey: deficiencyKeys.lists() })
    void qc.invalidateQueries({ queryKey: deficiencyKeys.counts() })
  }
}

export function useRaiseChargeOrder() {
  const sync = useSync()
  return useMutation({
    mutationFn: (lines: ChargeOrderLineWire[]) => raiseChargeOrder(lines),
    onSuccess: (order) => {
      sync()
      toast.success(S.charge.created(order.order_number))
    },
    onError: (e: Error) => toast.error(explain(e)),
  })
}

export function useRequestDeficiencyWaiver() {
  const sync = useSync()
  return useMutation({
    mutationFn: ({ id, reason, amount }: { id: string; reason: string; amount?: string }) =>
      requestDeficiencyWaiver(id, { reason, proposed_amount: amount || null }),
    onSuccess: (row) => {
      sync(row)
      toast.success(S.toasts.waiverRequested)
    },
    onError: (e: Error) => toast.error(explain(e)),
  })
}

export function useDecideDeficiencyWaiver() {
  const sync = useSync()
  return useMutation({
    mutationFn: ({ id, approve, notes }: { id: string; approve: boolean; notes?: string }) =>
      decideDeficiencyWaiver(id, approve, notes),
    onSuccess: (row) => {
      sync(row)
      toast.success(S.toasts.decided)
    },
    onError: (e: Error) => toast.error(explain(e)),
  })
}

export function useMarkDeficiencyRecovered() {
  const sync = useSync()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => markDeficiencyRecovered(id, notes),
    onSuccess: (row) => {
      sync(row)
      toast.success(S.toasts.recovered)
    },
    onError: (e: Error) => toast.error(explain(e)),
  })
}
