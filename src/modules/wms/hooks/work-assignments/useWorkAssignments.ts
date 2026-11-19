/**
 * Work-assignment queries and mutations.
 *
 * No query-config knobs anywhere in this file: `staleTime`, `gcTime`, `retry`
 * and the `refetchOn*` family belong to the global QueryClient (§6.5.1). A
 * per-hook override silently breaks the always-refetch contract, and the
 * symptom is "stale data after save".
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifyMutationError } from '@shared/api/notify-mutation-error'

import {
  createWorkAssignment,
  fetchEligibleDevices,
  fetchEligibleSummary,
  fetchEligibleEngineers,
  fetchWorkAssignment,
  fetchWorkAssignmentLines,
  fetchWorkAssignments,
  withdrawWorkAssignmentLines,
  type EligibleDeviceParams,
  type WorkAssignmentCreateRequest,
  type WorkAssignmentLineListParams,
  type WorkAssignmentListParams,
  type WorkAssignmentStage,
  type WorkAssignmentWithdrawRequest,
  listWorkAssignmentStages,
} from '../../api/work-assignments'

import { wmsKeys } from '../keys'

const K = wmsKeys.workAssignments
import { isDeviceHistoryQuery } from '../devices/useDevices'

export const useWorkAssignments = (
  params: WorkAssignmentListParams = {},
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchWorkAssignments(params),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  })

/** Reads a tab's last cached count (no fetch) — the pill's value while the list shows placeholder data. */
export function useCachedWaCount() {
  const qc = useQueryClient()
  return (params: WorkAssignmentListParams) =>
    qc.getQueryData<{ total?: number }>(K.count(params))?.total ?? 0
}

/** The assignable stages, from the backend's stage registry.
 *
 * Replaces three hardcoded copies of this list. Static master data, so the
 * global QueryClient's caching is exactly right — no per-hook staleTime
 * (§6.5.1: per-hook overrides are what cause "stale data after save").
 */
export const useWorkAssignmentStages = () =>
  useQuery({
    queryKey: K.stages(),
    queryFn: listWorkAssignmentStages,
  })

export const useWorkAssignment = (id: string | undefined) =>
  useQuery({
    queryKey: K.detail(id ?? ''),
    queryFn: () => fetchWorkAssignment(id as string),
    enabled: Boolean(id),
  })

/**
 * One page of a lot's line items — server-side search + pagination for the
 * detail table. `keepPreviousData` holds the current page visible while the
 * next loads, so paging / searching doesn't flash an empty grid.
 */
export const useWorkAssignmentLines = (
  id: string | undefined,
  params: WorkAssignmentLineListParams = {},
) =>
  useQuery({
    queryKey: K.lines(id ?? '', params),
    queryFn: () => fetchWorkAssignmentLines(id as string, params),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  })

/**
 * Engineer candidates and what each is already carrying.
 *
 * Deferred until a stage AND warehouse are chosen — asking without both is a
 * 422, and the picker cannot show a load before it knows where.
 */
export const useEligibleEngineers = (
  args: { stage?: WorkAssignmentStage; warehouse_id?: string },
) =>
  useQuery({
    queryKey: K.eligible('engineers', args.stage, args.warehouse_id),
    queryFn: () =>
      fetchEligibleEngineers({
        stage: args.stage as WorkAssignmentStage,
        warehouse_id: args.warehouse_id as string,
      }),
    enabled: Boolean(args.stage && args.warehouse_id),
  })

/**
 * Waiting work grouped GRN -> part. The picker starts here, not with devices:
 * a storeman stands at one pallet and issues one part code at a time.
 */
export const useEligibleSummary = (
  args: { stage?: WorkAssignmentStage; warehouse_id?: string; category_id?: string },
) =>
  useQuery({
    // category_id is part of the KEY, not just the request: the summary is a
    // different set of work per category, and sharing a key would serve the
    // previous category's counts on every switch.
    queryKey: K.eligible('summary', args.stage, args.warehouse_id, args.category_id),
    queryFn: () =>
      fetchEligibleSummary({
        stage: args.stage as WorkAssignmentStage,
        warehouse_id: args.warehouse_id as string,
        category_id: args.category_id,
      }),
    enabled: Boolean(args.stage && args.warehouse_id),
    // Category is part of the key (server-side filter), so switching it is a new
    // query with no cache. Hold the previous groups on screen while the new set
    // loads so the category picker (and the whole work step) isn't torn down and
    // remounted mid-selection — which read as the form "resetting". `isLoading`
    // then flips only on the very first load, never on a category switch.
    placeholderData: keepPreviousData,
  })

/** Devices free to hand out. Server-paginated (§16.7) — never sliced client-side. */
export const useEligibleDevices = (params: Partial<EligibleDeviceParams>) =>
  useQuery({
    queryKey: K.eligible('devices', params),
    queryFn: () => fetchEligibleDevices(params as EligibleDeviceParams),
    enabled: Boolean(params.stage && params.warehouse_id),
  })

/**
 * Targeted invalidation after any write (§16.9).
 *
 * The picker queries are ALWAYS invalidated: an issue removes devices from the
 * pool and moves an engineer's load, and a stale picker would offer a device
 * the next issue then rejects with a 409.
 */
function useAssignmentInvalidation() {
  const qc = useQueryClient()
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: K.lists() })
    void qc.invalidateQueries({ queryKey: K.counts() })
    void qc.invalidateQueries({ queryKey: K.eligibleAll() })
    // Lines nest under the detail key, so this refreshes the header and lines of this lot only.
    if (id) void qc.invalidateQueries({ queryKey: K.detail(id) })
    // An issue writes a `work_assignment_issued` entry, and withdraw/reassign a
    // `work_assignment_withdrawn` entry, on each affected device's timeline
    // (BE device_read_service). Refresh any open device workflow-history view so
    // the entry appears without a manual reload. The affected device ids aren't
    // in scope here, so match by key shape — same pattern as the spare
    // mutations in useStages (§16.9 targeted invalidation).
    void qc.invalidateQueries({
      predicate: isDeviceHistoryQuery,
    })
  }
}

export const useCreateWorkAssignment = () => {
  const invalidate = useAssignmentInvalidation()
  return useMutation({
    mutationFn: (body: WorkAssignmentCreateRequest) => createWorkAssignment(body),
    // Success copy belongs to the caller (it knows whether labels follow);
    // a second toast here doubled every issue.
    onSuccess: (assignment) => invalidate(assignment.id),
    onError: notifyMutationError,
  })
}

export const useWithdrawLines = (id: string) => {
  const invalidate = useAssignmentInvalidation()
  return useMutation({
    mutationFn: (body: WorkAssignmentWithdrawRequest) =>
      withdrawWorkAssignmentLines(id, body),
    onSuccess: () => invalidate(id),
    onError: notifyMutationError,
  })
}

