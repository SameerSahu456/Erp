import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { CRM_SHARED_STRINGS } from "../../components/shared/crm-shared.strings";
import { invalidateEntityStats } from "./entityStats";

import { PAGINATION } from "@/shared/constants";

import {
  createEntityComment,
  deleteComment,
  fetchEntityComments,
} from "../../api";
import type { CommentCreatePayload, CommentEntityType } from "../../api";

// Mutations bind to (entityType, entityId) so we know which list query to
// invalidate. The backend's DELETE route doesn't carry the entity info in
// the URL, so we have to track it client-side. Page/pageSize live below the
// `by-entity` level so a single create/delete invalidation refetches every
// open page of the list.
const COMMENTS_KEY = ["crm", "comments"] as const;
const byEntityKey = (entityType: CommentEntityType, entityId: string) =>
  [...COMMENTS_KEY, "by-entity", entityType, entityId] as const;

// staleTime / refetchOnMount inherited from global QueryClient defaults
// (§6.5.1 — never set them per-hook).
//
// Numbered pagination (Coding-guideline §16.7): the detail-page Comments
// tab pages through the API one page at a time with a 1-indexed `page`,
// driven by `CrmListPaginationFooter` / `TablePagination`. The backend now
// returns a `{items, total, limit, offset}` envelope so the footer can show
// "showing X–Y of Z". `keepPreviousData` keeps the current page visible
// (no flash to skeleton) while the next page loads.
export function useEntityComments(
  entityType: CommentEntityType,
  entityId: string | null | undefined,
  options?: { enabled?: boolean; pageSize?: number; page?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const page = options?.page ?? 1;
  return useQuery({
    queryKey: [
      ...byEntityKey(entityType, entityId ?? ""),
      { page, pageSize },
    ] as const,
    queryFn: () =>
      fetchEntityComments(entityType, entityId as string, {
        page,
        page_size: pageSize,
      }),
    enabled: !!entityId && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
  });
}

export function useCreateComment(
  entityType: CommentEntityType,
  entityId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CommentCreatePayload) =>
      createEntityComment(entityType, entityId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: byEntityKey(entityType, entityId),
      });
      invalidateEntityStats(qc, { type: entityType, id: entityId });
      toast.success(CRM_SHARED_STRINGS.toast.commentAdded);
    },
    onError: (error: Error) => {
      toast.error(error.message || CRM_SHARED_STRINGS.toast.commentAddFailed);
    },
  });
}

export function useDeleteComment(
  entityType: CommentEntityType,
  entityId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: byEntityKey(entityType, entityId),
      });
      invalidateEntityStats(qc, { type: entityType, id: entityId });
      toast.success(CRM_SHARED_STRINGS.toast.commentDeleted);
    },
    onError: (error: Error) => {
      // Backend surfaces "Only the comment author or a superuser can delete
      // this comment" via the ApiResponse envelope — apiClient turns it
      // into Error.message.
      toast.error(
        error.message || CRM_SHARED_STRINGS.toast.commentDeleteFailed,
      );
    },
  });
}
