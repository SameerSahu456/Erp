import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { FIRST_PAGE, nextPage } from "@shared/api/pagination";
import { toast } from "sonner";

import { PARTS_STRINGS } from "../../components/parts/parts.strings";
import {
  createPart,
  deletePart,
  fetchPart,
  fetchPartsFlatPage,
  fetchPartsPage,
  updatePart,
  type FetchPartsParams,
  type PartCreate,
  type PartUpdate,
} from "../../api";
import { IMS_PAGE_SIZE } from "../../constants";
import { PAGINATION } from "@/shared/constants";
import { imsKeys } from "../keys";

// Exported so cross-module mutations (e.g. variant create / update /
// delete in `useVariants`) can invalidate the parts list — parts
// queries fetched with `include_variants: true` embed each part's
// variants on the row, so a variant change must refresh both caches
// or the parts table stays stale until the next manual refetch.
export const PARTS_KEY = imsKeys.parts;
const KEY = PARTS_KEY;

// Page-shaped variant for server pagination — exposes total + has_next.
// Pass `include_variants: true` to embed each part's variants[] on the row
// and unlock the variant-scoped filters (condition / variant_is_active /
// is_default / has_stock). Without that flag the backend returns 422 if any
// of those filters are sent.
export function usePartsPage(
  params?: FetchPartsParams,
  options?: { enabled?: boolean },
) {
  const merged = { page_size: IMS_PAGE_SIZE, page: 1, ...params };
  return useQuery({
    queryKey: [...KEY, "page", merged],
    queryFn: () => fetchPartsPage(merged),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

// Flat (ROW-paginated) variant of usePartsPage for the parts list page:
// `flatten=true` returns parent + variant rows as one stream with a ROW-based
// total, so the footer pager matches the rendered rows exactly. Distinct
// queryKey segment ("flat") so it never collides with the nested cache.
export function usePartsFlatPage(
  params?: FetchPartsParams,
  options?: { enabled?: boolean },
) {
  const merged = { page_size: IMS_PAGE_SIZE, page: 1, ...params };
  return useQuery({
    queryKey: [...KEY, "page", "flat", merged],
    queryFn: () => fetchPartsFlatPage(merged),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Infinite-scroll search for the AsyncSelect Part picker (Stock Item form,
 * filters, etc.). Sends `search` + `page` + `page_size` and exposes
 * `getNextPageParam` so the open dropdown can lazy-load page 2, 3, … as
 * the user scrolls.
 */
export function usePartsInfinite(search: string) {
  return useInfiniteQuery({
    // Dropdown rule: only active parts surface in pickers. Include
    // `isActive: true` in the queryKey so toggling it later doesn't
    // silently re-use the active-only cache.
    queryKey: [...KEY, "infinite", { search, isActive: true }],
    queryFn: ({ pageParam }) =>
      fetchPartsPage({
        page: pageParam,
        page_size: PAGINATION.DEFAULT_PAGE_SIZE,
        is_active: true,
        search: search || undefined,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
  });
}

export function usePart(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => fetchPart(id),
    enabled: !!id,
  });
}

/** Fetch several parts in parallel (e.g. to resolve `is_tracking` for a set of
 *  BOM component variants by their part ids). Mirrors `useVariantsByIds`. */
export function usePartsByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...KEY, id],
      queryFn: () => fetchPart(id),
      enabled: !!id,
    })),
  });
}

export function useCreatePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PartCreate) => createPart(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(PARTS_STRINGS.toasts.created);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePart(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PartUpdate) => updatePart(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(PARTS_STRINGS.toasts.updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePart(id),
    onSuccess: (_data, id) => {
      // Skip the deleted part's own detail query — see useDeleteVariant
      // for the rationale. Same 404-on-refetch race as the other delete
      // hooks once shared.
      void qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== id,
      });
      toast.success(PARTS_STRINGS.toasts.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
