/** Scrap / place / un-scrap / dispose (D2, D5, D6, D9) and the placement queue.
 *  Every write refreshes the device, device lists, the placement queue and the
 *  spare requests scrap closes. */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@shared/api/envelope";

import {
  disposeDevice,
  type DisposeRequest,
  fetchScrapPendingPlacement,
  placeScrappedDevice,
  scrapDevice,
  unscrapDevice,
  type ScrapPlaceRequest,
  type ScrapRequest,
  type UnscrapRequest,
} from "../../api";
import { errMsg } from "../../errorMessage";
import { warehouseScopeKey, wmsKeys } from "../keys";
import { USE_STAGES_STRINGS } from "../operations/use-stages.strings";
import { invalidateSpares } from "../spares/useSpares";
import { invalidateDevice, invalidateDeviceLists } from "./useDevices";

/** Invalidate everything a scrap-family mutation can change. */
function invalidateScrapSurfaces(qc: QueryClient, id: string) {
  invalidateDevice(qc, id);
  invalidateDeviceLists(qc);
  void qc.invalidateQueries({ queryKey: wmsKeys.scrapPendingPlacementAll() });
  // Scrap cancels the device's open spare requests.
  invalidateSpares(qc);
}

export function useScrapDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ScrapRequest }) =>
      scrapDevice(id, body),
    onSuccess: (_o, { id }) => {
      invalidateScrapSurfaces(qc, id);
      toast.success(USE_STAGES_STRINGS.scrap.done);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

/** The store manager's placement queue — condemned units with no location. */
export function useScrapPendingPlacement(
  warehouseIds?: readonly string[],
  options?: { enabled?: boolean; page?: number },
) {
  const scopeKey = warehouseScopeKey(warehouseIds ?? []);
  const page = options?.page ?? 1;
  return useQuery({
    queryKey: wmsKeys.scrapPendingPlacement(scopeKey, page),
    queryFn: () => fetchScrapPendingPlacement(warehouseIds, page),
    enabled: options?.enabled ?? true,
    // Keep the prior page on screen while the next loads (server-paginated,
    // §16.7) — without it the queue blanks on every page step.
    placeholderData: keepPreviousData,
  });
}

export function usePlaceScrappedDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ScrapPlaceRequest }) =>
      placeScrappedDevice(id, body),
    onSuccess: (_o, { id }) => {
      invalidateScrapSurfaces(qc, id);
      toast.success(USE_STAGES_STRINGS.scrap.placed);
    },
    // LOCATION_CAPACITY_EXCEEDED is shown inline on the field by the caller; others toast.
    onError: (e: Error) => {
      if (e instanceof ApiError && e.businessCode === "LOCATION_CAPACITY_EXCEEDED") return;
      toast.error(errMsg(e));
    },
  });
}

/** Write a unit off the books (device-scrap D2) — the one irreversible step.
 *  Manager-gated (`wmsPermissions.STOCK_DISPOSE`), not a stage check. */
export function useDisposeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DisposeRequest }) => disposeDevice(id, body),
    onSuccess: (_o, { id }) => {
      invalidateScrapSurfaces(qc, id);
      toast.success(USE_STAGES_STRINGS.scrap.disposed);
    },
    // No onError: the dispose dialog shows the backend message inline (it
    // carries the component count, D13) — one error surface (§6.9 #5).
  });
}

export function useUnscrapDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UnscrapRequest }) =>
      unscrapDevice(id, body),
    onSuccess: (_o, { id }) => {
      invalidateScrapSurfaces(qc, id);
      toast.success(USE_STAGES_STRINGS.scrap.reversed);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}
