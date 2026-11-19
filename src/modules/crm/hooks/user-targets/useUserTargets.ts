import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION } from "@/shared/constants"

import {
  approveUserTarget,
  createUserTarget,
  deleteUserTarget,
  fetchUserTarget,
  fetchUserTargetLines,
  fetchUserTargets,
  rejectUserTarget,
  replaceUserTargetLines,
  reviseUserTarget,
  submitUserTarget,
  updateUserTarget,
  type FetchUserTargetsParams,
  type ReplaceUserSalesTargetLinesPayload,
  type UserSalesTarget,
  type UserSalesTargetCreatePayload,
  type UserSalesTargetLinesResponse,
  type UserSalesTargetUpdatePayload,
} from "../../api"
import { USER_TARGETS_STRINGS as S } from "../../components/user-targets/user-targets.strings"

// Cache layout (mirrors Coding-guideline §16.8 — bucket is a structural
// level in the query key so filter / scope changes spawn fresh entries):
//
//   ["crm","user-targets"]                                 ← KEY prefix
//   ["crm","user-targets","list", params]                  ← paged list
//   ["crm","user-targets","list", {status:'PendingApproval', scope:'all'}]
//                                                           ← Approvals tab count + rows
//   ["crm","user-targets","detail", id]                    ← single row

const KEY = ["crm", "user-targets"] as const
const LIST_KEY = [...KEY, "list"] as const
const DETAIL_KEY = [...KEY, "detail"] as const

// One place for every post-mutation cache sweep. A predicate on the KEY
// prefix catches every filter/scope/page combo without us tracking them.
function invalidateAllUserTargetCaches(qc: QueryClient) {
  void qc.invalidateQueries({
    predicate: (q) => q.queryKey[0] === "crm" && q.queryKey[1] === "user-targets",
  })
}

// ── Reads ──────────────────────────────────────────────────────────────

// Paged list. 1-indexed `page`; page size from the global pagination
// constant (§16.6 / §16.7). `params` is part of the query key — changing
// any filter spawns a fresh cache entry; the page owns resetting to page 1
// on a filter change. staleTime / refetchOnMount inherited from the global
// QueryClient defaults (§6.5.1 — never set them per-hook).
export function useUserTargets(
  params: FetchUserTargetsParams = {},
  options: { enabled?: boolean } = {},
) {
  const pageSize = params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE
  const page = params.page ?? 1
  return useQuery({
    queryKey: [...LIST_KEY, { ...params, page, page_size: pageSize }] as const,
    queryFn: () => fetchUserTargets({ ...params, page, page_size: pageSize }),
    enabled: options.enabled ?? true,
  })
}

// Light-weight count-only query powering the "Approvals [N]" tab badge.
// Fetches the first page with page_size=1 and reads `total`. Reusing
// `useUserTargets` with a shared cache key means a mutation that moves a
// row in/out of PendingApproval auto-refreshes the badge.
//
// ``scope`` defaults to ``"team"`` so a non-admin manager counts the
// pending targets in their reporting subtree (what they can approve).
// Admin callers pass ``"all"`` for the full inbox.
export function usePendingApprovalCount(
  options: { enabled?: boolean; scope?: "team" | "all" } = {},
) {
  const query = useUserTargets(
    {
      scope: options.scope ?? "team",
      status: ["PendingApproval"],
      page: 1,
      page_size: 1,
    },
    { enabled: options.enabled },
  )
  return {
    ...query,
    count: query.data?.total ?? 0,
  }
}

export function useUserTarget(
  id: string | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id ?? "none"] as const,
    queryFn: () => fetchUserTarget(id as string),
    enabled: Boolean(id) && (options.enabled ?? true),
  })
}

// ── Mutations ──────────────────────────────────────────────────────────
//
// Every mutation invalidates the whole user-targets cache tree because the
// backend's status machine can shift a row across any filter (Draft →
// PendingApproval moves it OUT of the "self scope + Draft" view AND INTO
// the "all scope + PendingApproval" view). Predicate-scoped invalidation
// per §16.9 — anchored at the module root, not blanket app-wide.

// Every mutation surfaces backend errors as a red toast via ``onError``. The
// shared ApiError (``src/shared/api/envelope.ts``) extends Error with the
// backend's ``message`` field already populated, so ``err.message`` carries
// the server's human-readable copy (e.g. "A target already exists for this
// user and financial year" for ``TARGET_ALREADY_EXISTS_FOR_FY``).  Fallback
// to a static string so network / parse failures still render something.
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function useCreateUserTarget() {
  const qc = useQueryClient()
  return useMutation<UserSalesTarget, Error, UserSalesTargetCreatePayload>({
    mutationFn: createUserTarget,
    onSuccess: (row) => {
      invalidateAllUserTargetCaches(qc)
      // Different toast depending on which path the backend took (plan §7.5
      // — PM/APM subjects route to Pending; everyone else auto-approves).
      if (row.status === "Approved") {
        toast.success(S.toast.createdApproved)
      } else {
        toast.success(S.toast.createdPending)
      }
    },
    onError: (err) => toast.error(errorMessage(err, S.errors.saveFailed)),
  })
}

export function useUpdateUserTarget() {
  const qc = useQueryClient()
  return useMutation<
    UserSalesTarget,
    Error,
    { id: string; payload: UserSalesTargetUpdatePayload }
  >({
    mutationFn: ({ id, payload }) => updateUserTarget(id, payload),
    onSuccess: () => {
      invalidateAllUserTargetCaches(qc)
      toast.success(S.toast.updated)
    },
    onError: (err) => toast.error(errorMessage(err, S.errors.saveFailed)),
  })
}

export function useSubmitUserTarget() {
  const qc = useQueryClient()
  return useMutation<UserSalesTarget, Error, string>({
    mutationFn: submitUserTarget,
    onSuccess: () => {
      invalidateAllUserTargetCaches(qc)
      toast.success(S.toast.submitted)
    },
    onError: (err) => toast.error(errorMessage(err, S.errors.saveFailed)),
  })
}

export function useApproveUserTarget() {
  const qc = useQueryClient()
  return useMutation<UserSalesTarget, Error, string>({
    mutationFn: approveUserTarget,
    onSuccess: () => {
      invalidateAllUserTargetCaches(qc)
      toast.success(S.toast.approved)
    },
    onError: (err) => toast.error(errorMessage(err, S.errors.saveFailed)),
  })
}

export function useRejectUserTarget() {
  const qc = useQueryClient()
  return useMutation<UserSalesTarget, Error, { id: string; notes: string }>({
    mutationFn: ({ id, notes }) => rejectUserTarget(id, { notes }),
    onSuccess: () => {
      invalidateAllUserTargetCaches(qc)
      toast.success(S.toast.rejected)
    },
    onError: (err) => toast.error(errorMessage(err, S.errors.saveFailed)),
  })
}

export function useReviseUserTarget() {
  const qc = useQueryClient()
  return useMutation<UserSalesTarget, Error, string>({
    mutationFn: reviseUserTarget,
    onSuccess: () => {
      invalidateAllUserTargetCaches(qc)
      toast.success(S.toast.revised)
    },
    onError: (err) => toast.error(errorMessage(err, S.errors.saveFailed)),
  })
}

export function useDeleteUserTarget() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: deleteUserTarget,
    onSuccess: () => {
      invalidateAllUserTargetCaches(qc)
      toast.success(S.toast.discarded)
    },
    onError: (err) => toast.error(errorMessage(err, S.errors.saveFailed)),
  })
}

// ── Bifurcation lines (plan.md §9) ──────────────────────────────────────
//
// The Bifurcation dialog lazy-loads lines via infinite scroll — one page per
// scroll request. Cache key includes the ``targetId`` so switching rows in
// the Sale Targets table doesn't crosspolinate. The mutation does a single
// ``PUT`` with the full in-memory set (replace-all) and invalidates the
// full user-targets subtree because the header rollup moves with the lines.

const LINES_KEY = [...KEY, "lines"] as const

export function useUserTargetLines(
  targetId: string | undefined,
  options: { enabled?: boolean; pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...LINES_KEY, targetId ?? "none", { pageSize }] as const,
    queryFn: ({ pageParam }) =>
      fetchUserTargetLines(targetId as string, {
        page: pageParam,
        page_size: pageSize,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last) => {
      const loaded = (last.page - 1) * last.page_size + last.items.length
      return loaded < last.total ? last.page + 1 : undefined
    },
    enabled: Boolean(targetId) && (options.enabled ?? true),
  })
}

export function useReplaceUserTargetLines() {
  const qc = useQueryClient()
  return useMutation<
    UserSalesTargetLinesResponse,
    Error,
    { id: string; payload: ReplaceUserSalesTargetLinesPayload }
  >({
    mutationFn: ({ id, payload }) => replaceUserTargetLines(id, payload),
    onSuccess: (_, { id }) => {
      // Blow away the whole user-targets subtree — the header rollup (list
      // page quarters) moved with the lines, and the lines cache itself is
      // now stale. Scoped to this module's root per §16.9.
      invalidateAllUserTargetCaches(qc)
      // Also drop any lines-cache entry for this target specifically so a
      // re-open of the dialog refetches from page 1 immediately.
      void qc.invalidateQueries({ queryKey: [...LINES_KEY, id] })
      toast.success(S.toast.bifurcationSaved)
    },
    onError: (err) => toast.error(errorMessage(err, S.errors.saveFailed)),
  })
}
