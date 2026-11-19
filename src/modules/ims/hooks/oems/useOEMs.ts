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

import { OEMS_STRINGS } from "../../components/oems/oems.strings";

import { API, PAGINATION } from "@/shared/constants";

import {
  createOEM,
  deleteOEM,
  fetchOEM,
  fetchOEMsPage,
  updateOEM,
  type OEMCreate,
  type OEMUpdate,
} from "../../api";
import { IMS_PAGE_SIZE } from "../../constants";

const KEY = ["ims", "oems"] as const;

// Page-shaped fetcher for the OEMs list page — exposes total + has_next.
export function useOEMsPaged(params?: {
  search?: string;
  tier?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort?: string;
}) {
  const merged = { page_size: IMS_PAGE_SIZE, page: 1, ...params };
  return useQuery({
    queryKey: [...KEY, "page", merged],
    queryFn: () => fetchOEMsPage(merged),
    placeholderData: keepPreviousData,
  });
}

// Infinite-scroll picker hook for OEM dropdowns (per Coding-guideline §16.11).
// Backend search is server-side on /ims/oems, so the search term is a
// structural query-key dimension and is forwarded to the page fetcher.
// `options.enabled` lets callers (e.g. AsyncMultiSelect with `loadOnOpen`) defer
// the first request until the popover opens.
export function useOEMOptions(
  search: string,
  options: { enabled?: boolean } = {},
) {
  const limit = PAGINATION.DEFAULT_PAGE_SIZE;
  const normalizedSearch = search.trim();
  const searchParam =
    normalizedSearch.length >= 2 ? normalizedSearch : undefined;

  return useInfiniteQuery({
    // Dropdown rule: only active OEMs surface in pickers. Keep
    // `isActive: true` in the queryKey so flipping the default
    // would automatically miss this cache instead of returning
    // stale active-only rows.
    queryKey: [
      ...KEY,
      "options",
      { search: searchParam ?? "", isActive: true },
    ],
    queryFn: ({ pageParam }) =>
      fetchOEMsPage({
        page: pageParam,
        page_size: limit,
        search: searchParam,
        is_active: true,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options.enabled ?? true,
    ...API.REFERENCE_DATA_QUERY_OPTIONS,
  });
}

// Companion hook for selected-but-unloaded items (per Coding-guideline §16.11
// rule 5). Fetches each missing OEM by id in parallel so the dropdown can
// render the chip even when the user has scrolled past or filtered the row out.
export function useOEMsByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...KEY, id],
      queryFn: () => fetchOEM(id),
      enabled: !!id,
      ...API.REFERENCE_DATA_QUERY_OPTIONS,
    })),
  });
}

export function useOEM(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => fetchOEM(id),
    enabled: !!id,
  });
}

export function useCreateOEM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OEMCreate) => createOEM(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(OEMS_STRINGS.toasts.created);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateOEM(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OEMUpdate) => updateOEM(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(OEMS_STRINGS.toasts.updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteOEM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOEM(id),
    onSuccess: (_data, id) => {
      // Skip the deleted OEM's own detail query — see useDeleteVariant
      // for the rationale. Without the predicate, OEMDetailPage's
      // still-mounted useOEM(id) hook refetches the deleted id and
      // surfaces a 404 just before navigation unmounts the page.
      void qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== id,
      });
      toast.success(OEMS_STRINGS.toasts.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
