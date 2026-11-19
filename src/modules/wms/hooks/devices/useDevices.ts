import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { FIRST_PAGE, nextPage } from "@shared/api/pagination";
import { toast } from "sonner";

import {
  assignDevice,
  fetchDevice,
  fetchDeviceChecklistRuns,
  fetchDeviceStats,
  fetchDeviceWorkflowHistory,
  fetchDeviceTimeLog,
  fetchDevicesPage,
  fetchMyWarehouses,
  rackAssignDevice,
  type DeviceAssignmentRequest,
  type DeviceListParams,
  type RackAssignRequest,
} from "../../api";
import { useEffect, useMemo } from "react";

import { PAGINATION } from "@shared/constants/pagination";

import { wmsKeys } from "../keys";
import { USE_DEVICES_STRINGS } from "./use-devices.strings";
import { errMsg } from "../../errorMessage";

const K = wmsKeys.devices;


/** Matches every device timeline query, for writes that do not know the device ids. */
export function isDeviceHistoryQuery(q: {
  queryKey: readonly unknown[];
}): boolean {
  const [root, feat, kind, , sub] = q.queryKey;
  return (
    root === K.all[0] &&
    feat === K.all[1] &&
    kind === "detail" &&
    sub === "workflow-history"
  );
}

/** The device worklists + their counts (no single device in scope). */
export function invalidateDeviceLists(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: K.lists() });
  void qc.invalidateQueries({ queryKey: K.statsAll() });
  void qc.invalidateQueries({ queryKey: wmsKeys.stats.all });
}

/** After a device write: its dossier, worklists, counts and stat cards — never the whole tree (§16.9). */
export function invalidateDevice(qc: QueryClient, id: string): void {
  void qc.invalidateQueries({ queryKey: K.detail(id) });
  invalidateDeviceLists(qc);
}

// ── Reads ─────────────────────────────────────────────────────────────

/** Paginated device worklist. Filters (workflow_status, search, sort, …) are
 *  part of the query key so each filter combo is its own cache entry. */
export function useDevices(
  params: DeviceListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchDevicesPage(params),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** Every device on a GRN batch, page by page until `total` — one capped page hid units past 100. */
export function useAllBatchDevices(
  batchId: string,
  options: { enabled?: boolean } = {},
) {
  const query = useInfiniteQuery({
    queryKey: K.list({ batch_id: batchId, all: true }),
    queryFn: ({ pageParam }) =>
      fetchDevicesPage({
        batch_id: batchId,
        page: pageParam,
        page_size: PAGINATION.MAX_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total && last.items.length > 0
        ? all.length + 1
        : undefined;
    },
    enabled: (options.enabled ?? true) && !!batchId,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  return { ...query, items };
}

/** Device counts by workflow_status under the same filters — powers the stat
 *  row / tab badges. */
export function useDeviceStats(params: DeviceListParams = {}) {
  return useQuery({
    queryKey: K.stats(params),
    queryFn: () => fetchDeviceStats(params),
    placeholderData: keepPreviousData,
  });
}

/** One device dossier: the lean device record + its active operation. */
export function useDevice(id: string) {
  return useQuery({
    queryKey: K.detail(id),
    queryFn: () => fetchDevice(id),
    enabled: !!id,
  });
}

/** The device's whole workflow history, newest first — one request; a
 *  device's history is small, so it is not paged. */
export function useDeviceWorkflowHistory(id: string) {
  return useQuery({
    queryKey: K.history(id),
    queryFn: () => fetchDeviceWorkflowHistory(id),
    enabled: !!id,
  });
}

/** Activity / Time Log: per-stage timing + fleet-average benchmark. */
export function useDeviceTimeLog(id: string, enabled = true) {
  return useQuery({
    queryKey: K.timeLog(id),
    queryFn: () => fetchDeviceTimeLog(id),
    enabled: enabled && !!id,
  });
}

/** Answered checklists (inspection / QC) for the device — questions+answers,
 *  result, and photos, newest run first. */
export function useDeviceChecklistRuns(id: string, enabled = true) {
  return useQuery({
    queryKey: K.checklistRuns(id),
    queryFn: () => fetchDeviceChecklistRuns(id),
    enabled: enabled && !!id,
  });
}

// NOTE: the per-device assignable-users picker used to live here. Every stage
// pool now derives from the device's warehouse TEAM via
// `useAssignPoolsByWarehouse` — one roster answers all stages for all rows, so
// there is a single source of truth for "who may be assigned this stage" and no
// request multiplies by stage, by row, or by page. The backend endpoint
// (GET /wms/devices/{id}/assignable-users) still exists; `fetchDeviceAssignableUsers`
// in api.ts remains its typed wrapper.

/** Warehouses the current user has a role in (scopes the device worklist).
 *  `enabled` lets a caller skip the fetch when it has nothing to gate (e.g. a
 *  draft GRN with no assignable devices) — the navbar scope still owns the
 *  shared query key, so no consumer goes without data when it matters. */
export function useMyWarehouses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: wmsKeys.myWarehouses,
    queryFn: () => fetchMyWarehouses(),
    enabled: options?.enabled ?? true,
  });
}

// ── Writes ────────────────────────────────────────────────────────────

export function useAssignDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DeviceAssignmentRequest }) =>
      assignDevice(id, body),
    onSuccess: (_op, { id }) => {
      invalidateDevice(qc, id);
      // An assignment moves an engineer's load and can close a lot (the
      // "withdraw" option), so the work-assignment screens are stale too.
      void qc.invalidateQueries({ queryKey: wmsKeys.workAssignments.lists() });
      void qc.invalidateQueries({ queryKey: wmsKeys.workAssignments.counts() });
      void qc.invalidateQueries({
        queryKey: wmsKeys.workAssignments.eligibleAll(),
      });
      toast.success(USE_DEVICES_STRINGS.toasts.assignmentUpdated);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useRackAssignDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RackAssignRequest }) =>
      rackAssignDevice(id, body),
    onSuccess: (_op, { id }) => {
      // Targeted per §16.9 — never the whole devices tree.
      invalidateDevice(qc, id);
      toast.success(USE_DEVICES_STRINGS.toasts.assignedToRack);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}
