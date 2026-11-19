import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@shared/api/notify-mutation-error";
import { wmsKeys } from "../keys";

import { PAGINATION } from "@/shared/constants";

import {
  createLocation,
  deleteLocation,
  fetchAssignableLocations,
  fetchBinOptions,
  fetchLocation,
  fetchLocationContentsPage,
  fetchLocationsTree,
  fetchRackChildren,
  fetchRackOptions,
  fetchStorageSummary,
  fetchWarehouseRacks,
  updateLocation,
  type LocationContentsParams,
  type WarehouseRacksParams,
  type WarehouseLocationCreate,
  type WarehouseLocationUpdate,
} from "../../api";
import { USE_WAREHOUSE_LOCATIONS_STRINGS } from "./use-warehouse-locations.strings";

// Surface the backend's actionable 409 message — it already names every blocker
// with counts (e.g. "Location holds 31 live stock item(s); migrate them first",
// or "Rack has 2 live child bin(s); clear them first"). Only a non-Error throw
// falls back to a generic default (CP-558 #3/Task 6).
function deleteLocationErrorMessage(e: unknown): string {
  return e instanceof Error
    ? e.message
    : USE_WAREHOUSE_LOCATIONS_STRINGS.deleteErrors.fallback;
}

const WK = wmsKeys.warehouses;
const LK = wmsKeys.locations;

/** Refresh only this warehouse's location views and its record (§16.9). */
function invalidateLocations(qc: QueryClient, warehouseId: string) {
  void qc.invalidateQueries({ queryKey: WK.locations(warehouseId) });
  void qc.invalidateQueries({ queryKey: LK.details() });
  void qc.invalidateQueries({ queryKey: WK.detail(warehouseId), exact: true });
  void qc.invalidateQueries({ queryKey: WK.lists() });
}

// ── Tree + per-warehouse aggregates ───────────────────────────────────

export function useLocationsTree(warehouseId: string, enabled = true) {
  return useQuery({
    queryKey: WK.locationView(warehouseId, "tree"),
    queryFn: () => fetchLocationsTree(warehouseId),
    enabled: enabled && !!warehouseId,
  });
}

/** One page of the warehouse's rack table, bins rolled up; each rack's bins
 *  load lazily via {@link useRackBins} when expanded. */
export function useWarehouseRacks(warehouseId: string, params: WarehouseRacksParams) {
  return useQuery({
    queryKey: WK.locationView(warehouseId, "racks", params),
    queryFn: () => fetchWarehouseRacks(warehouseId, params),
    enabled: !!warehouseId,
    placeholderData: keepPreviousData,
  });
}

/** Rack, bin and slot counts behind the storage summary. */
export function useStorageSummary(warehouseId: string) {
  return useQuery({
    queryKey: WK.locationView(warehouseId, "summary"),
    queryFn: () => fetchStorageSummary(warehouseId),
    enabled: !!warehouseId,
  });
}

/** One rack or bin in full, fetched when its edit form opens. */
export function useLocation(locationId: string | undefined) {
  return useQuery({
    queryKey: LK.detail(locationId ?? ""),
    queryFn: () => fetchLocation(locationId as string),
    enabled: !!locationId,
  });
}

/** The bins under one rack — fired only when the rack is expanded
 *  (``enabled``). Cached per rack, so re-expanding is instant. */
export function useRackBins(rackId: string, enabled: boolean) {
  return useQuery({
    queryKey: LK.bins(rackId),
    queryFn: () => fetchRackChildren(rackId),
    enabled: enabled && !!rackId,
  });
}

/** Assignable leaf locations for the Assign-to-Rack picker (backend pre-filters
 *  to can_store_stock + active + room-left). Enabled lazily so it only fires
 *  when the picker is open for a warehouse. */
export function useAssignableLocations(warehouseId: string, enabled = true) {
  return useQuery({
    queryKey: WK.locationView(warehouseId, "assignable"),
    queryFn: () => fetchAssignableLocations(warehouseId),
    enabled: enabled && !!warehouseId,
  });
}

// ── Searchable option hooks for the assignment pickers (§16.11) ───────
// Factories: bind the parent id, then hand the returned hook to <AsyncSelect
// useOptions=…>. Memoize at the call site — `useMemo(() =>
// makeUseRackOptions(warehouseId), [warehouseId])` — so the hook identity is
// stable while the id holds. `search` arrives already-debounced from
// AsyncSelect; the server does the case-insensitive name filter + paging.

export function makeUseRackOptions(warehouseId: string) {
  return function useRackOptions(search: string, options?: { enabled?: boolean }) {
    const q = search.trim() || undefined;
    return useInfiniteQuery({
      queryKey: WK.locationView(warehouseId, "rack-options", q ?? ""),
      queryFn: ({ pageParam }) =>
        fetchRackOptions(warehouseId, {
          page: pageParam,
          page_size: PAGINATION.DEFAULT_PAGE_SIZE,
          search: q,
        }),
      initialPageParam: 1,
      getNextPageParam: (last) => {
        const loaded = (last.page - 1) * last.page_size + last.items.length;
        return loaded < last.total ? last.page + 1 : undefined;
      },
      enabled: (options?.enabled ?? true) && !!warehouseId,
    });
  };
}

/** A bin's parent picker: only racks that hold bins can take one. */
export function makeUseRacksHoldingBinsOptions(warehouseId: string) {
  return function useRacksHoldingBinsOptions(search: string, options?: { enabled?: boolean }) {
    const q = search.trim() || undefined;
    return useInfiniteQuery({
      queryKey: WK.locationView(warehouseId, "racks-holding-bins", q ?? ""),
      queryFn: ({ pageParam }) =>
        fetchWarehouseRacks(warehouseId, {
          page: pageParam,
          page_size: PAGINATION.DEFAULT_PAGE_SIZE,
          search: q,
          kind: "with-bins",
        }),
      initialPageParam: 1,
      getNextPageParam: (last) => {
        const loaded = (last.page - 1) * last.page_size + last.items.length;
        return loaded < last.total ? last.page + 1 : undefined;
      },
      enabled: (options?.enabled ?? true) && !!warehouseId,
    });
  };
}

export function makeUseBinOptions(rackId: string) {
  return function useBinOptions(search: string, options?: { enabled?: boolean }) {
    const q = search.trim() || undefined;
    return useInfiniteQuery({
      queryKey: LK.binOptions(rackId, q ?? ""),
      queryFn: ({ pageParam }) =>
        fetchBinOptions(rackId, {
          page: pageParam,
          page_size: PAGINATION.DEFAULT_PAGE_SIZE,
          search: q,
        }),
      initialPageParam: 1,
      getNextPageParam: (last) => {
        const loaded = (last.page - 1) * last.page_size + last.items.length;
        return loaded < last.total ? last.page + 1 : undefined;
      },
      enabled: (options?.enabled ?? true) && !!rackId,
    });
  };
}

// ── Single-location reads ─────────────────────────────────────────────

/** One page of the stock at a location. A location can hold tens of thousands
 *  of units, so the table pages through them and `search` finds a specific one. */
export function useLocationContents(
  locationId: string,
  params: LocationContentsParams,
) {
  return useQuery({
    queryKey: LK.contents(locationId, params),
    queryFn: () => fetchLocationContentsPage(locationId, params),
    enabled: !!locationId,
    placeholderData: keepPreviousData,
  });
}

// ── Writes ────────────────────────────────────────────────────────────

export function useCreateLocation(warehouseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WarehouseLocationCreate) =>
      createLocation(warehouseId, body),
    onSuccess: () => {
      invalidateLocations(qc, warehouseId);
      toast.success(USE_WAREHOUSE_LOCATIONS_STRINGS.toasts.created);
    },
    onError: notifyMutationError,
  });
}

export function useUpdateLocation(warehouseId: string, locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WarehouseLocationUpdate) =>
      updateLocation(locationId, body),
    onSuccess: () => {
      invalidateLocations(qc, warehouseId);
      toast.success(USE_WAREHOUSE_LOCATIONS_STRINGS.toasts.updated);
    },
    onError: notifyMutationError,
  });
}

export function useDeleteLocation(warehouseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) => deleteLocation(locationId),
    onSuccess: () => {
      invalidateLocations(qc, warehouseId);
      toast.success(USE_WAREHOUSE_LOCATIONS_STRINGS.toasts.deleted);
    },
    // 409 LOCATION_HAS_REFERENCES → actionable "empty/deactivate first" copy.
    onError: (e: unknown) => toast.error(deleteLocationErrorMessage(e)),
  });
}
