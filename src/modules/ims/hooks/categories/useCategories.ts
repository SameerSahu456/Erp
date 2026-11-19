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

import { CATEGORIES_STRINGS } from "../../components/categories/categories.strings";

import { API, PAGINATION, UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";

import {
  createCategory,
  deleteCategory,
  fetchAllCategories,
  fetchAllCategoriesShort,
  fetchCategories,
  fetchCategoriesPage,
  fetchCategory,
  updateCategory,
  type CategoryCreate,
  type CategoryShort,
  type CategoryUpdate,
} from "../../api";
import { IMS_PAGE_SIZE } from "../../constants";

const KEY = ["ims", "categories"] as const;
const SPEC_ATTRIBUTES_KEY = ["ims", "specification-attributes"] as const;
const OPTIONS_KEY = [...KEY, "options"] as const;

export function useCategories(
  params?: { parent_id?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...KEY, params ?? {}],
    queryFn: () => fetchCategories(params),
    enabled: options?.enabled ?? true,
  });
}

// Infinite-scroll picker hook for category dropdowns per Coding-guideline
// §16.11. Backend search requires `min_length=2`, so we gate the search
// param locally (1-char input is treated as no search) — otherwise the
// backend would 422.
//
// Defaults to `is_active: true` so pickers don't surface retired categories.
// Override via `options.isActive: false` to see all (admin views).
export function useCategoryOptions(
  rawSearch: string,
  options: { isActive?: boolean; enabled?: boolean } = {},
) {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
  // Backend rejects search shorter than 2 chars (min_length=2). Treat
  // anything below the threshold as "no search" so the field is usable
  // while typing the first letter.
  const search = debounced.length >= 2 ? debounced : "";
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
  const isActive = options.isActive ?? true;

  return useInfiniteQuery({
    queryKey: [...OPTIONS_KEY, { search, isActive }],
    queryFn: ({ pageParam }) =>
      fetchCategoriesPage({
        page: pageParam,
        page_size: pageSize,
        search: search || undefined,
        is_active: isActive,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options.enabled ?? true,
    ...API.REFERENCE_DATA_QUERY_OPTIONS,
  });
}

/**
 * Loads the FULL category set by chaining through all pages of /categories.
 * Use this only for surfaces that genuinely need every L1 + L2 in one go
 * (e.g. the parent-category picker inside the create/edit dialog, where the
 * 2-level cap and the "find a category created moments earlier" UX rule
 * out a paginated dropdown). Backend caps page_size at 100, so the chain
 * is necessary to avoid silent truncation once the catalog exceeds 100.
 *
 * Pass `{ enabled: false }` to defer the fetch until the consumer surface
 * is actually visible — list pages MUST NOT call this; use
 * `useCategoriesPage` for server-paginated listing instead.
 */
export function useAllCategories(options?: {
  enabled?: boolean;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: [...KEY, "all", { isActive: options?.isActive }],
    queryFn: () => fetchAllCategories({ is_active: options?.isActive }),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Slim variant of `useAllCategories` for filter dropdowns / pickers /
 * any caller that only needs `{id, name, parent_id, parent_name}`.
 * Threads `?shape=short` through every paged fetch so the backend skips
 * rollup subqueries (part_count, subcategory_count, stock summaries,
 * description, specification attributes, etc.) — same code path as the tree-view
 * fetcher, an order of magnitude lighter on the wire and DB.
 *
 * Separate React-Query cache key so the slim payload doesn't pollute
 * the full `useAllCategories` cache (mixing shapes would let stale slim
 * data leak into surfaces that need the rollups).
 *
 * Pass `isActive: true` to filter out inactive categories — used by
 * CategoryPicker so the dropdowns on Parts / PM Assignments / Stock /
 * etc. never offer rows the operator has marked inactive.
 */
export function useAllCategoriesShort(options?: {
  enabled?: boolean;
  isActive?: boolean;
}) {
  return useQuery<CategoryShort[]>({
    queryKey: [...KEY, "all", "short", { isActive: options?.isActive }],
    queryFn: () => fetchAllCategoriesShort({ is_active: options?.isActive }),
    enabled: options?.enabled ?? true,
  });
}

// Page-shaped fetcher for server pagination on list pages — exposes total.
// Do NOT pass `parent_id`; the backend returns a bare list under that filter.
export function useCategoriesPage(params?: {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort?: string;
}) {
  const merged = { page_size: IMS_PAGE_SIZE, page: 1, ...params };
  return useQuery({
    queryKey: [...KEY, "page", merged],
    queryFn: () => fetchCategoriesPage(merged),
    placeholderData: keepPreviousData,
  });
}

// Companion to `useCategory` for selected-but-unloaded rows: fetches each
// category by id (same cache slot as `useCategory`) so a dropdown holding only
// ids can still show real names.
export function useCategoriesByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...KEY, id],
      queryFn: () => fetchCategory(id),
      enabled: !!id,
    })),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => fetchCategory(id),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryCreate) => createCategory(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      // The category's attribute links changed → the category-scoped
      // Specifications tab list and the master list's categories_count.
      void qc.invalidateQueries({ queryKey: SPEC_ATTRIBUTES_KEY });
      toast.success(CATEGORIES_STRINGS.toasts.created);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryUpdate) => updateCategory(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      // The category's attribute links changed → the category-scoped
      // Specifications tab list and the master list's categories_count.
      void qc.invalidateQueries({ queryKey: SPEC_ATTRIBUTES_KEY });
      toast.success(CATEGORIES_STRINGS.toasts.updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: (_data, id) => {
      // Refresh every category list / page query EXCEPT the deleted
      // category's own detail + ancestors + descendants queries
      // (all of which have the deleted id at queryKey[2]). A plain
      // invalidate(KEY) would mark those as stale and the still-
      // mounted CategoryDetailPage would refetch GET
      // /ims/categories/<deleted-id> + ancestors and 404 — exactly
      // the "unnecessary API calls again and again" the operator saw.
      // Mirrors the predicate pattern in useDeleteVariant.
      void qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== id,
      });
      toast.success(CATEGORIES_STRINGS.toasts.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
