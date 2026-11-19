import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { PAGINATION } from "@/shared/constants";

import { CATEGORY_APPROVERS_STRINGS } from "../../components/category-approvers/category-approvers.strings";
import {
  type CategoryApproverWire,
  fetchCategoryApproversForScope,
  fetchCategoryApproversPage,
  fetchEligibleApprovers,
  replaceCategoryApprovers,
  type ApprovalScope,
  type CategoryApproversReplacePayload,
  type CategoryApproversPageWire,
  type CategoryApproversScopedResponseWire,
  type EligibleApproversResponseWire,
} from "../../api/category-approvers";

// Narrow + stable query keys so §16.9 targeted invalidation works —
// a replace on (categoryId, scope) only kicks that one list, not every
// approver query across every category.
const CATEGORY_APPROVERS_KEY = ["crm", "category-approvers"] as const;
const byScopeKey = (categoryId: string, scope: ApprovalScope) =>
  [...CATEGORY_APPROVERS_KEY, categoryId, scope] as const;

// Paged reads hang off the same (categoryId, scope) prefix, so invalidating
// `byScopeKey` after a save refetches every cached page of that set too.
const pageKey = (
  categoryId: string,
  scope: ApprovalScope,
  page: number,
  pageSize: number,
) => [...byScopeKey(categoryId, scope), "page", page, pageSize] as const;

const ELIGIBLE_APPROVERS_KEY = ["crm", "eligible-approvers"] as const;
const eligibleByScopeKey = (scope: ApprovalScope) =>
  [...ELIGIBLE_APPROVERS_KEY, scope] as const;

// Query config inherits from the global defaults in `app/providers.tsx`
// (§6.5.1 — never set staleTime / refetchOnMount per hook).
export function useCategoryApprovers(
  categoryId: string | undefined,
  scope: ApprovalScope,
  options?: { enabled?: boolean },
) {
  return useQuery<CategoryApproversScopedResponseWire>({
    queryKey: byScopeKey(categoryId ?? "", scope),
    queryFn: () => fetchCategoryApproversForScope(categoryId as string, scope),
    enabled: !!categoryId && (options?.enabled ?? true),
  });
}

/** One server page of the approver set — feeds the table (§16.7). The
 *  previous page stays on screen while the next one loads. */
export function useCategoryApproversPage(
  categoryId: string | undefined,
  scope: ApprovalScope,
  page: number,
  pageSize: number,
) {
  return useQuery<CategoryApproversPageWire>({
    queryKey: pageKey(categoryId ?? "", scope, page, pageSize),
    queryFn: () =>
      fetchCategoryApproversPage(categoryId as string, scope, page, pageSize),
    enabled: !!categoryId,
    placeholderData: keepPreviousData,
  });
}

/** Server total of the (categoryId, scope) approver set, for the tab badge
 *  on the Category page. Lives at page level — `DetailTabs` only mounts the
 *  active tab, so the badge must not depend on the Approvers tab being open.
 *  Reads the smallest page (not the full list) and shares the paged prefix,
 *  so a save in the Manage dialog refreshes it along with the table. */
export function useCategoryApproversCount(
  categoryId: string | undefined,
  scope: ApprovalScope,
) {
  const { data } = useCategoryApproversPage(
    categoryId,
    scope,
    1,
    PAGINATION.PAGE_SIZE_OPTIONS[0],
  );
  return data?.total ?? 0;
}

export function useEligibleApprovers(
  scope: ApprovalScope,
  options?: { enabled?: boolean },
) {
  return useQuery<EligibleApproversResponseWire>({
    queryKey: eligibleByScopeKey(scope),
    queryFn: () => fetchEligibleApprovers(scope),
    enabled: options?.enabled ?? true,
  });
}

/** One line describing what a save changed, from the set before it and
 *  the set the backend returned: added / removed users and threshold edits
 *  on kept users. `null` when nothing differs. */
export function summarizeApproverChanges(
  prev: readonly CategoryApproverWire[],
  next: readonly CategoryApproverWire[],
): string | null {
  const T = CATEGORY_APPROVERS_STRINGS.toast;
  const before = new Map(prev.map((a) => [a.user_id, Number(a.threshold)]));
  const after = new Map(next.map((a) => [a.user_id, Number(a.threshold)]));
  let added = 0;
  let removed = 0;
  let thresholdUpdated = 0;
  for (const [userId, threshold] of after) {
    const old = before.get(userId);
    if (old === undefined) added += 1;
    else if (old !== threshold) thresholdUpdated += 1;
  }
  for (const userId of before.keys()) {
    if (!after.has(userId)) removed += 1;
  }
  const parts: string[] = [];
  if (added) parts.push(T.added(added));
  if (removed) parts.push(T.removed(removed));
  if (thresholdUpdated) parts.push(T.thresholdUpdated(thresholdUpdated));
  return parts.length ? parts.join(", ") : null;
}

export function useReplaceCategoryApprovers(
  categoryId: string,
  scope: ApprovalScope,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryApproversReplacePayload) =>
      replaceCategoryApprovers(categoryId, scope, payload),
    onSuccess: (data) => {
      // The Manage dialog loaded the full set into this key before the
      // save, so it is still the "before" picture here — read it ahead of
      // the overwrite below to word the toast by what actually changed.
      const prev = qc.getQueryData<CategoryApproversScopedResponseWire>(
        byScopeKey(categoryId, scope),
      );
      // Seed the FULL-list cache with the set the backend just returned,
      // then invalidate the (categoryId, scope) prefix — that is the full
      // list plus every cached page of it, and nothing else (§16.9).
      qc.setQueryData(byScopeKey(categoryId, scope), data);
      void qc.invalidateQueries({ queryKey: byScopeKey(categoryId, scope) });
      const T = CATEGORY_APPROVERS_STRINGS.toast;
      if (!prev) {
        toast.success(T.fallback);
        return;
      }
      const summary = summarizeApproverChanges(prev.approvers, data.approvers);
      toast.success(summary ?? T.noChanges);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : CATEGORY_APPROVERS_STRINGS.toast.saveFailed;
      toast.error(msg);
    },
  });
}
