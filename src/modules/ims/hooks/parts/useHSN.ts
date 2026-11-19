import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { FIRST_PAGE, nextPage } from "@shared/api/pagination";
import { toast } from "sonner";

import { HSN_CODES_STRINGS } from "../../components/hsn-codes/hsn-codes.strings";

import { PAGINATION } from "@/shared/constants";

import {
  createHSNCode,
  deleteHSNCode,
  fetchHSNCode,
  fetchHSNCodesPaged,
  updateHSNCode,
  type HSNCodeCreate,
  type HSNCodeUpdate,
  type HSNSortField,
} from "../../api";

const KEY = ["ims", "hsn-codes"] as const;

/**
 * Server-paginated, server-searchable, server-sortable HSN list hook for
 * the HSN Codes management page. Forwards every param straight to the
 * backend; the response now carries a real `total`, so the BMT footer
 * can render exact "Showing N–M of T" + accurate page-count nav.
 * `keepPreviousData` avoids the empty-state flash on page change.
 */
export function useHSNCodesPaged(params: {
  page: number;
  page_size: number;
  search?: string;
  is_active?: boolean;
  sort?: HSNSortField;
}) {
  return useQuery({
    queryKey: [...KEY, "paged", params],
    queryFn: () => fetchHSNCodesPaged(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Options hook for the HSN AsyncSelect dropdowns.
 *
 * `useInfiniteQuery` against `/ims/hsn-codes?page=&page_size=&search=` —
 * backend now exposes server-side search (min 2 chars). Scroll triggers
 * page loads; typing in the search box refetches from page 1 with the
 * `?search=` filter. Matches §16.11 (API-backed dropdowns are dynamic;
 * never fetch-all + client-filter).
 */
export function useHSNCodeOptions(
  search: string,
  options: { enabled?: boolean } = {},
) {
  const trimmed = search.trim();
  // Backend's `search` is gated at min_length=2. Send `undefined` (no
  // filter) until the user has typed the 2nd char so the dropdown still
  // shows a useful first page on the empty / single-char state.
  const searchParam = trimmed.length >= 2 ? trimmed : undefined;
  return useInfiniteQuery({
    // Dropdown rule: only active HSN codes surface in pickers. Retired
    // tax classifications shouldn't be reachable from a Parts /
    // Variant form — they stay valid on rows already tagged with them
    // (managed via the HSN admin list page), but new selections never
    // see them.
    queryKey: [...KEY, "infinite", { search: searchParam, isActive: true }],
    queryFn: ({ pageParam }) =>
      fetchHSNCodesPaged({
        page: pageParam,
        page_size: PAGINATION.DEFAULT_PAGE_SIZE,
        is_active: true,
        ...(searchParam ? { search: searchParam } : {}),
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options.enabled ?? true,
  });
}

export function useHSNCode(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => fetchHSNCode(id),
    enabled: !!id,
  });
}

export function useCreateHSNCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: HSNCodeCreate) => createHSNCode(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(HSN_CODES_STRINGS.toasts.created);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateHSNCode(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: HSNCodeUpdate) => updateHSNCode(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(HSN_CODES_STRINGS.toasts.updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHSNCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHSNCode(id),
    onSuccess: (_data, id) => {
      // Skip the deleted HSN's own detail query — see useDeleteVariant
      // for the rationale. Same 404-on-refetch race as the other delete
      // hooks once shared.
      void qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== id,
      });
      toast.success(HSN_CODES_STRINGS.toasts.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
