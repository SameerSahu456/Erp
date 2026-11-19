/** Spare requests: reads, writes and the shared `invalidateSpares` helper. */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  cancelSpareRequest,
  createSpareRequests,
  fetchSpareMovements,
  fetchSpareRequests,
  fetchSparesInventory,
  fitSpareRequestUnits,
  fulfillSpareRequest,
  returnSpareRequestUnits,
  type SpareRequestBulkCreateRequest,
  type SpareRequestCancelRequest,
  type SpareRequestFitRequest,
  type SpareRequestFulfillRequest,
  type SpareRequestListParams,
  type SpareRequestReturnRequest,
  type SparesInventoryParams,
} from "../../api";
import { SPARES_STRINGS } from "../../components/spares/spares.strings";
import { errMsg } from "../../errorMessage";
import {
  invalidateDevice,
  invalidateDeviceLists,
  isDeviceHistoryQuery,
} from "../devices/useDevices";
import { invalidateComponentSurfaces } from "../devices/useDeviceComposition";
import { wmsKeys } from "../keys";
import { USE_STAGES_STRINGS } from "../operations/use-stages.strings";

const SK = wmsKeys.spares;

/** §16.9: refresh request lists, stats, inventory and this request's movements only. */
export function invalidateSpares(qc: QueryClient, reqId?: string) {
  void qc.invalidateQueries({ queryKey: SK.lists() });
  void qc.invalidateQueries({ queryKey: SK.counts() });
  void qc.invalidateQueries({ queryKey: SK.statsAll() });
  void qc.invalidateQueries({ queryKey: SK.inventoryAll() });
  // The page's WmsStatsCards live under `wmsKeys.stats`, so refresh them too (CP-577).
  void qc.invalidateQueries({ queryKey: wmsKeys.stats.all });
  if (reqId) void qc.invalidateQueries({ queryKey: SK.detail(reqId) });
}

// ── Reads ──

export function useSpareRequests(
  params: SpareRequestListParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SK.list(params),
    queryFn: () => fetchSpareRequests(params),
    // Callers disable this to avoid a 403 without `wms:spares_read`.
    enabled: options?.enabled ?? true,
    // Keep the prior page/tab visible while the next loads, so the Spares list
    // and its tab counts don't flash to 0 on every interaction (§13/§1.1.H).
    placeholderData: keepPreviousData,
  });
}

export function useSparesInventory(params: SparesInventoryParams = {}) {
  return useQuery({
    queryKey: SK.inventory(params),
    queryFn: () => fetchSparesInventory(params),
    // Keep the prior page visible while the next loads (server-paginated, §16.7).
    placeholderData: keepPreviousData,
  });
}

/** Movements against one spare request — picks AND returns. The return dialog
 *  derives "still returnable" from these (a pick with no matching return). */
export function useSpareMovements(reqId: string | null) {
  return useQuery({
    queryKey: SK.movements(reqId ?? ""),
    queryFn: () => fetchSpareMovements(reqId as string),
    enabled: Boolean(reqId),
  });
}

// ── Writes ──

export function useCreateSpareRequests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SpareRequestBulkCreateRequest }) =>
      createSpareRequests(id, body),
    onSuccess: (_o, { id }) => {
      invalidateDevice(qc, id);
      invalidateSpares(qc);
      toast.success(USE_STAGES_STRINGS.spare.created);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useFulfillSpareRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reqId, body }: { reqId: string; body: SpareRequestFulfillRequest }) =>
      fulfillSpareRequest(reqId, body),
    onSuccess: (_r, { reqId }) => {
      invalidateSpares(qc, reqId);
      // Targeted per §16.9: refresh the device worklists + stats (the request's
      // device id isn't in scope here); detail queries refetch on next mount.
      invalidateDeviceLists(qc);
      // Fulfilment writes timeline entries; refresh any open workflow history.
      void qc.invalidateQueries({ predicate: isDeviceHistoryQuery });
      toast.success(USE_STAGES_STRINGS.spare.fulfilled);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useReturnSpareRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reqId, body }: { reqId: string; body: SpareRequestReturnRequest }) =>
      returnSpareRequestUnits(reqId, body),
    onSuccess: (_r, { reqId }) => {
      // The returned unit re-enters the available pool, so the inventory
      // count moves along with the request lists and stats.
      invalidateSpares(qc, reqId);
      // A return writes timeline entries; refresh any open workflow history.
      void qc.invalidateQueries({ predicate: isDeviceHistoryQuery });
      toast.success(SPARES_STRINGS.returnDialog.success);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useCancelSpareRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reqId, body }: { reqId: string; body: SpareRequestCancelRequest }) =>
      cancelSpareRequest(reqId, body),
    onSuccess: (_r, { reqId }) => {
      invalidateSpares(qc, reqId);
      toast.success(USE_STAGES_STRINGS.spare.cancelled);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

/** Record fulfilled spares as components of the device they were drawn for. */
export function useFitSpareRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reqId, body }: { reqId: string; deviceId: string; body: SpareRequestFitRequest }) =>
      fitSpareRequestUnits(reqId, body),
    onSuccess: (_r, { reqId, deviceId, body }) => {
      invalidateSpares(qc, reqId);
      // The units move consumed → installed and appear in the Components card.
      invalidateComponentSurfaces(qc, deviceId);
      void qc.invalidateQueries({ predicate: isDeviceHistoryQuery });
      toast.success(SPARES_STRINGS.fitDialog.success(body.stock_item_ids.length));
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}
