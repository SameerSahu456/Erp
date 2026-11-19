import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  activateWarehouse,
  createWarehouse,
  deactivateWarehouse,
  deleteWarehouse,
  fetchWarehouse,
  fetchWarehousesPage,
  updateWarehouse,
  type WarehouseCreate,
  type WarehouseListParams,
  type WarehouseUpdate,
} from "../../api";
import { notifyMutationError } from "@shared/api/notify-mutation-error";
import { wmsKeys } from "../keys";
import { useDebounce } from "@/shared/hooks";
import { PAGINATION, UI } from "@/shared/constants";
import { WMS_PAGE_SIZE } from "../../constants";
import { USE_WAREHOUSES_STRINGS } from "./use-warehouses.strings";

// Surface the backend's actionable 409 message — it already names every blocker
// with counts (e.g. "Cannot delete QC Test Warehouse: 982 devices in stock,
// 5 open GRNs, … Move or close these first."). Only a non-Error throw falls
// back to a generic default (CP-558 #2/Task 6).
function deleteWarehouseErrorMessage(e: unknown): string {
  return e instanceof Error
    ? e.message
    : USE_WAREHOUSES_STRINGS.deleteErrors.fallback;
}

const K = wmsKeys.warehouses;

/** Refresh warehouse lists, pickers, the record and navbar scope; not location/team trees. */
function invalidateWarehouse(qc: QueryClient, id?: string) {
  void qc.invalidateQueries({ queryKey: K.lists() });
  void qc.invalidateQueries({ queryKey: K.counts() });
  void qc.invalidateQueries({ queryKey: K.optionsAll() });
  void qc.invalidateQueries({ queryKey: wmsKeys.myWarehouses });
  if (id) void qc.invalidateQueries({ queryKey: K.detail(id), exact: true });
}

// ── Reads ─────────────────────────────────────────────────────────────

export function useWarehousesPaged(
  params: WarehouseListParams = {},
  options: { enabled?: boolean } = {},
) {
  const merged: WarehouseListParams = {
    page_size: WMS_PAGE_SIZE,
    page: 1,
    ...params,
  };
  return useQuery({
    queryKey: K.list(merged),
    queryFn: () => fetchWarehousesPage(merged),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  });
}

/** Server-side, debounced, infinite warehouse picker for filter dropdowns —
 *  the `q`-searchable source for an `<AsyncSelect useOptions={…}>` (§16.11: no
 *  fetch-all-then-filter). Active warehouses only; mirrors the shape the WMS
 *  engineer pickers return so the same AsyncSelect contract works.
 *
 *  `asTransferTarget` lists EVERY active warehouse (not just the caller's
 *  assigned ones) — the Move Stock destination picker needs it so a scoped
 *  manager can send to warehouses they don't manage (CP-375 #2). Other consumers
 *  (the "receive into" picker) keep the default assigned-scope. */
export function useWarehouseFilterOptions(
  opts: { asTransferTarget?: boolean } = {},
) {
  const asTransferTarget = opts.asTransferTarget ?? false;
  return function useOptions(
    rawSearch: string,
    options: { enabled?: boolean } = {},
  ) {
    const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
    const searchParam = debounced.length >= 2 ? debounced : undefined;
    const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
    return useInfiniteQuery({
      // The scope flag is part of the key so the destination picker and the
      // assigned-scope pickers never share a cache entry.
      queryKey: K.options(
        "filter",
        asTransferTarget ? "all" : "",
        searchParam ?? "",
      ),
      queryFn: async ({ pageParam }) => {
        const page = await fetchWarehousesPage({
          page: pageParam,
          page_size: pageSize,
          is_active: true,
          q: searchParam,
          as_transfer_target: asTransferTarget || undefined,
        });
        return {
          items: page.items.map((w) => ({
            id: w.id,
            // Name only — the warehouse code is internal and adds noise to the
            // "Receive into warehouse" picker (the only consumer of this hook).
            label: w.name,
          })),
          total: page.total,
          page_size: pageSize,
          page: pageParam,
        };
      },
      initialPageParam: 1 as number,
      getNextPageParam: (last, allPages) => {
        const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
        if (last.items.length === 0 || last.items.length < last.page_size) {
          return undefined;
        }
        return loaded < last.total ? last.page + 1 : undefined;
      },
      enabled: options.enabled !== false,
    });
  };
}

/** Server-side, debounced, INFINITE source for the navbar warehouse-scope
 *  picker (a full-access user picks from EVERY active warehouse). Loads
 *  `PAGINATION.DEFAULT_PAGE_SIZE` (10) per page; the picker fetches the next
 *  page as the operator scrolls — never the old fetch-all-100 (§16.11). Items
 *  are shaped to the picker's `WarehouseOption` ({ warehouse_id, code, name }).
 *  Pass `enabled: false` until the menu opens so nothing loads on page mount. */
export function useWarehousePickerInfinite(
  rawSearch: string,
  options: { enabled?: boolean } = {},
) {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
  const searchParam = debounced.length >= 2 ? debounced : undefined;
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: K.options("scope-picker", searchParam ?? ""),
    queryFn: async ({ pageParam }) => {
      const page = await fetchWarehousesPage({
        page: pageParam,
        page_size: pageSize,
        is_active: true,
        q: searchParam,
      });
      return {
        items: page.items.map((w) => ({
          warehouse_id: w.id,
          code: w.code ?? "",
          name: w.name,
        })),
        total: page.total,
        page_size: pageSize,
        page: pageParam,
      };
    },
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      if (last.items.length === 0 || last.items.length < last.page_size) {
        return undefined;
      }
      return loaded < last.total ? last.page + 1 : undefined;
    },
    enabled: options.enabled !== false,
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: K.detail(id),
    queryFn: () => fetchWarehouse(id),
    enabled: !!id,
  });
}

// ── Writes ────────────────────────────────────────────────────────────

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WarehouseCreate) => createWarehouse(body),
    onSuccess: () => {
      invalidateWarehouse(qc);
      toast.success(USE_WAREHOUSES_STRINGS.toasts.created);
    },
    // Field-validation 422s are shown inline on the form (applyServerFieldErrors);
    // notifyMutationError toasts everything else and stays silent for those.
    onError: notifyMutationError,
  });
}

export function useUpdateWarehouse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WarehouseUpdate) => updateWarehouse(id, body),
    onSuccess: () => {
      invalidateWarehouse(qc, id);
      toast.success(USE_WAREHOUSES_STRINGS.toasts.updated);
    },
    onError: notifyMutationError,
  });
}

export function useActivateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateWarehouse(id),
    onSuccess: (_r, id) => {
      invalidateWarehouse(qc, id);
      toast.success(USE_WAREHOUSES_STRINGS.toasts.activated);
    },
    onError: notifyMutationError,
  });
}

export function useDeactivateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateWarehouse(id),
    onSuccess: (_r, id) => {
      invalidateWarehouse(qc, id);
      toast.success(USE_WAREHOUSES_STRINGS.toasts.deactivated);
    },
    onError: notifyMutationError,
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: (_r, id) => {
      invalidateWarehouse(qc, id);
      toast.success(USE_WAREHOUSES_STRINGS.toasts.deleted);
    },
    // 409 WAREHOUSE_HAS_REFERENCES → actionable "empty/deactivate first" copy.
    onError: (e: unknown) => toast.error(deleteWarehouseErrorMessage(e)),
  });
}
