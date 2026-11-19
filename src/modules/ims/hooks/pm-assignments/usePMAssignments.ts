import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { PM_ASSIGNMENTS_STRINGS } from "../../components/pm-assignments/pm-assignments.strings";

import {
  createPMAssignment,
  fetchPMAssignment,
  fetchPMAssignments,
  fetchPMAssignmentsPage,
  fetchProductManagers,
  fetchUsersPage,
  replacePMAssignment,
  revokePMAssignment,
  type PMAssignment,
  type PMAssignmentCreate,
  type PMAssignmentReplace,
  type PMAssignmentStatusFilter,
} from "../../api";
import { IMS_PAGE_SIZE } from "../../constants";
import { API, PAGINATION, UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";
import { FIRST_PAGE, nextPage } from "@shared/api/pagination";

const KEY = ["ims", "pm-assignments"] as const;

export function useMyPMAssignments() {
  return useQuery({
    queryKey: [...KEY, "me"],
    queryFn: () => fetchPMAssignments(),
  });
}

export function useAllPMAssignments() {
  return useQuery({
    queryKey: [...KEY, "all"],
    queryFn: () => fetchPMAssignments(),
  });
}

/** Server-paginated fetcher for the PM Assignments list page. Use this for
 *  any UI that paginates explicitly — every filter / sort / page-change
 *  fires a fresh GET against the backend (Coding-guideline §16.7).
 *
 *  Second-arg `options.enabled` skips the fetch — used by lazy precondition-
 *  count probes (e.g. the OEM delete dialog asks "how many PM assignments
 *  scope this OEM?" only when the dialog is open). */
export function usePMAssignmentsPage(
  params?: {
    page?: number;
    page_size?: number;
    user_id?: string;
    category_id?: string;
    oem_id?: string;
    condition?: string;
    permission_type?: string;
    status?: PMAssignmentStatusFilter;
    sort?: string;
  },
  options: { enabled?: boolean } = {},
) {
  const merged = { page_size: IMS_PAGE_SIZE, page: 1, ...params };
  return useQuery({
    queryKey: [...KEY, "page", merged],
    queryFn: () => fetchPMAssignmentsPage(merged),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

/** Scoped PM assignments — used by the Category / Part detail side panels
 *  to render the "Product Manager" card without pulling the global list. */
export function useScopedPMAssignments(params: {
  category_id?: string;
  user_id?: string;
}) {
  return useQuery({
    queryKey: [...KEY, "scoped", params],
    queryFn: () => fetchPMAssignments(params),
    enabled: !!params.category_id || !!params.user_id,
  });
}

export function usePMAssignment(
  id: string,
  options?: { include_revoked?: boolean },
) {
  return useQuery({
    queryKey: [...KEY, id, { include_revoked: !!options?.include_revoked }],
    queryFn: () => fetchPMAssignment(id, options),
    enabled: !!id,
  });
}

export function useCreatePMAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PMAssignmentCreate) => createPMAssignment(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(PM_ASSIGNMENTS_STRINGS.toasts.created);
    },
    onError: (e: Error) =>
      toast.error(e.message || PM_ASSIGNMENTS_STRINGS.toasts.createFailed),
  });
}

/** Replace = atomic revoke + create-new. The only mutation path; backend
 *  has no PATCH on this resource. Caller passes the assignment id being
 *  replaced and the full new body. Returns the new assignment. */
export function useReplacePMAssignment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PMAssignmentReplace) => replacePMAssignment(id, body),
    onSuccess: () => {
      // Replace = revoke OLD + create NEW. The OLD assignment is now
      // soft-deleted, so a refetch of its id (from PMAssignmentDetailPage's
      // usePMAssignment(id) observer that's still mounted on the
      // old id's route) would 404 without ?include_revoked=true.
      // Skip the old id in the invalidate; the page can navigate to the
      // new id explicitly if it wants the fresh detail.
      qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== id,
      });
      toast.success(PM_ASSIGNMENTS_STRINGS.toasts.updated);
    },
    onError: (e: Error) =>
      toast.error(e.message || PM_ASSIGNMENTS_STRINGS.toasts.updateFailed),
  });
}

export function useRevokePMAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokePMAssignment(id),
    onSuccess: (_data, id) => {
      // Skip the revoked assignment's own detail query — see
      // useDeleteVariant for the rationale. A broad invalidate would
      // queue a refetch on PMAssignmentDetailPage's usePMAssignment(id)
      // observer that would then 404 (without ?include_revoked=true).
      qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== id,
      });
      toast.success(PM_ASSIGNMENTS_STRINGS.toasts.revoked);
    },
    onError: (e: Error) =>
      toast.error(e.message || PM_ASSIGNMENTS_STRINGS.toasts.revokeFailed),
  });
}

/**
 * AsyncSelect option source for the **PM filter on the list page** — yields
 * only PMs who actually appear as the `user_id` on an existing assignment.
 * Sourced from `/ims/pm-assignments` (NOT `/users`) because the filter is
 * meant to scope the table to "assignments by PM X" — including users
 * who don't yet have any assignment would surface dead choices.
 *
 * `useAllPMAssignments()` returns the full set (backend caps at
 * `page_size=100`; that's plenty for distinct-user derivation in
 * practice — if you grow past a few hundred PMs we can move this
 * derivation server-side). We then derive `{ id: user_id, label:
 * user_name }`, dedupe, sort by name, and filter by the user's
 * `search` string client-side. Shape mirrors a single-page
 * `useInfiniteQuery` so AsyncSelect can consume it without changes.
 *
 * NOTE: the PM picker INSIDE THE FORM still uses `useUserOptions`
 * (every active user) because operators creating a new assignment
 * need to pick from the whole roster.
 */
// Distinct PMs for the picker, sourced server-side from
// GET /ims/pm-assignments/product-managers: real infinite scroll + server
// search, so the list is never capped (replaces the old fetch-every-assignment
// + dedup-and-filter-in-the-browser version). §16.11. Search gates at ≥2 chars
// to match the backend `min_length`; callers already debounce the input.
export function usePMUserOptions(
  rawSearch: string,
  options: { enabled?: boolean } = {},
) {
  const limit = PAGINATION.DEFAULT_PAGE_SIZE;
  const normalized = rawSearch.trim();
  const searchParam = normalized.length >= 2 ? normalized : undefined;

  return useInfiniteQuery({
    queryKey: [...KEY, "product-managers", { search: searchParam ?? "" }],
    queryFn: ({ pageParam }) =>
      fetchProductManagers({
        page: pageParam,
        page_size: limit,
        search: searchParam,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options.enabled ?? true,
    ...API.REFERENCE_DATA_QUERY_OPTIONS,
  });
}

/** Infinite-scroll user options for AsyncSelect dropdowns (PM picker
 *  inside the create/edit form). Loads 25 active users per page, gates
 *  `search` to ≥2 chars to match backend `min_length`. Per Coding-
 *  guideline §16.11. */
export function useUserOptions(
  rawSearch: string,
  options: { enabled?: boolean } = {},
) {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
  const searchParam = debounced.length >= 2 ? debounced : undefined;
  const limit = PAGINATION.DEFAULT_PAGE_SIZE;

  return useInfiniteQuery({
    // `pm_assignable: true` is baked into the queryKey so the dropdown's
    // cache doesn't collide with any other consumer of /users that loads
    // the full roster. Backend filters to PM-eligible roles
    // (superusers + `product_manager` / `asst_product_manager`); the FE
    // simply trusts that result.
    queryKey: [
      "auth",
      "users",
      "options",
      { search: searchParam ?? "", pm_assignable: true },
    ],
    queryFn: ({ pageParam }) =>
      fetchUsersPage({
        page: pageParam,
        page_size: limit,
        search: searchParam,
        is_active: true,
        pm_assignable: true,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options.enabled ?? true,
    staleTime: API.STALE_TIME_MS,
  });
}

export function hasPMAccess(
  assignments: PMAssignment[],
  categoryId: string | null | undefined,
  oemId: string | null | undefined,
  condition: string | null | undefined,
): { canView: boolean; canManage: boolean } {
  if (!categoryId) return { canView: false, canManage: false };
  const matching = assignments.filter(
    (a) =>
      a.category_id === categoryId &&
      (a.oem_id === null || a.oem_id === oemId) &&
      (a.condition === null || a.condition === condition),
  );
  return {
    canView: matching.some(
      (a) => a.permission_type === "view" || a.permission_type === "manage",
    ),
    canManage: matching.some((a) => a.permission_type === "manage"),
  };
}
