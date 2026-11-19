import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { PAGINATION, UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";

import {
  cancelGrnBatch,
  createGrnBatch,
  fetchGrnBatch,
  fetchGrnBatchesPage,
  fetchInwardSources,
  finalizeGrnBatch,
  finalizePreviewGrnBatch,
  updateGrnBatchDraft,
  type GrnBatchCancelRequest,
  type GrnBatchCreate,
  type GrnBatchListParams,
  type GrnBatchUpdate,
  type InwardSourceParams,
} from "../../api";
import { inwardErrorMessage } from "../../inwardErrors";
import { USE_INWARDS_STRINGS } from "./use-inwards.strings";
import { warehouseScopeKey, wmsKeys } from "../keys";
import { invalidateDeviceLists } from "../devices/useDevices";

const K = wmsKeys.grnBatches;

/** A batch write: its detail, batch lists + tab counts, and the inward-source picker. */
function invalidateBatch(qc: QueryClient, id?: string) {
  if (id) void qc.invalidateQueries({ queryKey: K.detail(id) });
  void qc.invalidateQueries({ queryKey: K.lists() });
  void qc.invalidateQueries({ queryKey: K.counts() });
  void qc.invalidateQueries({ queryKey: wmsKeys.inwardSources.lists() });
  // The Inward list also renders the shared <WmsStatsCards scope="inward">,
  // whose KPI query lives under `wmsKeys.stats`, so it must be invalidated here
  // too or those tiles stay stale until a refresh after a GRN action (CP-577).
  void qc.invalidateQueries({ queryKey: wmsKeys.stats.all });
}

// ── Reads ─────────────────────────────────────────────────────────────

/**
 * Paginated GRN-batch list. The `status` filter is part of the query key so
 * each status tab (open / all) is its own cache entry and refetches
 * independently (§16.8).
 */
export function useGrnBatches(
  params: GrnBatchListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchGrnBatchesPage(params),
    placeholderData: keepPreviousData,
    // Callers without `wms:inward_read` (e.g. engineers on the Inspection queue,
    // whose Batch filter is hidden) pass `enabled: false` so this never 403s.
    enabled: options.enabled ?? true,
  });
}

export function useGrnBatch(id: string) {
  return useQuery({
    queryKey: K.detail(id),
    queryFn: () => fetchGrnBatch(id),
    enabled: !!id,
  });
}

/**
 * Server-side, debounced, INFINITE options for a GRN-batch picker/filter — the
 * AsyncSelect-shaped source (§16.11: load 10, fetch the next 10 on scroll).
 * Factory: pass the destination warehouse ids to scope the list; the returned
 * `useOptions(search, { enabled })` is what `<AsyncSelect useOptions={…}>` calls.
 * Only FINALISED (closed) batches are surfaced — an open/cancelled batch has no
 * devices in the pipeline. Items are `{ id, label: grn_number }`.
 */
export function useGrnBatchOptions(warehouseIds: readonly string[] = []) {
  const whKey = warehouseScopeKey(warehouseIds);
  return function useOptions(rawSearch: string, options: { enabled?: boolean } = {}) {
    const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
    const searchParam = debounced.length >= 2 ? debounced : undefined;
    const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
    return useInfiniteQuery({
      queryKey: K.options("batch", whKey, searchParam ?? ""),
      queryFn: async ({ pageParam }) => {
        const page = await fetchGrnBatchesPage({
          status: "closed",
          to_warehouse_ids: whKey ? whKey.split(",") : undefined,
          q: searchParam,
          page: pageParam,
          page_size: pageSize,
        });
        return {
          items: page.items.map((b) => ({ id: b.id, label: b.grn_number })),
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

/**
 * Inward source picker. List mode (no `source_entity_id`) returns the
 * dispatchable/receivable documents; singleton mode (with `source_entity_id`)
 * folds in the document's expected lines.
 */
export function useInwardSources(
  params: InwardSourceParams,
  enabled = true,
) {
  return useQuery({
    queryKey: wmsKeys.inwardSources.list(params),
    queryFn: () => fetchInwardSources(params),
    enabled: enabled && !!params.inward_type,
    placeholderData: keepPreviousData,
  });
}

// ── Writes ────────────────────────────────────────────────────────────

export function useCreateGrnBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GrnBatchCreate) => createGrnBatch(body),
    onSuccess: (b) => {
      invalidateBatch(qc, b.id);
      toast.success(USE_INWARDS_STRINGS.toasts.created(b.grn_number));
    },
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}

export function useUpdateGrnBatchDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: GrnBatchUpdate }) =>
      updateGrnBatchDraft(id, body),
    onSuccess: (b) => invalidateBatch(qc, b.id),
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}

export function useFinalizeGrnBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => finalizeGrnBatch(id),
    onSuccess: (b) => {
      invalidateBatch(qc, b.id);
      // A closed batch now appears in the batch filter / picker options.
      void qc.invalidateQueries({ queryKey: K.optionsAll() });
      // Finalize mints the received units, so the same-screen devices list and
      // the stat tiles must refetch — targeted, not the whole devices tree.
      invalidateDeviceLists(qc);
      toast.success(
        USE_INWARDS_STRINGS.toasts.finalized(
          b.grn_number,
          b.line_items_summary?.total_units ?? 0,
        ),
      )
    },
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}

/**
 * Dry-run the finalize pipeline without committing. Powers the pre-finalize
 * confirmation modal — returns would_succeed, per-line validation errors, and
 * the side-effect summary. Read-only, so no cache invalidation.
 */
export function useFinalizePreview() {
  return useMutation({
    mutationFn: (id: string) => finalizePreviewGrnBatch(id),
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}

export function useCancelGrnBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: GrnBatchCancelRequest }) =>
      cancelGrnBatch(id, body),
    onSuccess: (_b, { id }) => {
      invalidateBatch(qc, id);
      toast.success(USE_INWARDS_STRINGS.toasts.cancelled);
    },
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}
