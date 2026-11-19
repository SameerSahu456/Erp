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
  createEntityNote,
  deleteNote,
  fetchEntityNotes,
  updateNote,
} from "../../api";
import type {
  NoteCreatePayload,
  NoteEntityType,
  NoteUpdatePayload,
} from "../../api";

// Mutations bind to (entityType, entityId) so we know which list query to
// invalidate. The backend's PATCH/DELETE routes don't carry the entity
// info in the URL, so we have to track it client-side. Page/pageSize live
// below the `by-entity` level so a single create/update/delete
// invalidation refetches every open page of the list.
const NOTES_KEY = ["crm", "notes"] as const;
const byEntityKey = (entityType: NoteEntityType, entityId: string) =>
  [...NOTES_KEY, "by-entity", entityType, entityId] as const;

// staleTime / refetchOnMount inherited from global QueryClient defaults
// (§6.5.1 — never set them per-hook).
//
// Numbered pagination (Coding-guideline §16.7): the detail-page Notes tab
// pages through the API one page at a time with a 1-indexed `page`, driven
// by `CrmListPaginationFooter` / `TablePagination`. The backend now returns
// a `{items, total, limit, offset}` envelope so the footer can show
// "showing X–Y of Z". `keepPreviousData` keeps the current page visible
// (no flash to skeleton) while the next page loads.
export function useEntityNotes(
  entityType: NoteEntityType,
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
      fetchEntityNotes(entityType, entityId as string, {
        page,
        page_size: pageSize,
      }),
    enabled: !!entityId && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
  });
}

export function useCreateNote(entityType: NoteEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NoteCreatePayload) =>
      createEntityNote(entityType, entityId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: byEntityKey(entityType, entityId),
      });
      invalidateEntityStats(qc, { type: entityType, id: entityId });
      toast.success(CRM_SHARED_STRINGS.toast.noteAdded);
    },
    onError: (error: Error) => {
      toast.error(error.message || CRM_SHARED_STRINGS.toast.noteAddFailed);
    },
  });
}

export function useUpdateNote(entityType: NoteEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      updateNote(noteId, { content } as NoteUpdatePayload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: byEntityKey(entityType, entityId),
      });
      toast.success(CRM_SHARED_STRINGS.toast.noteUpdated);
    },
    onError: (error: Error) => {
      // Backend surfaces "Only the note author can edit this note" /
      // "Edit window has expired" / "Note editing is disabled" via the
      // ApiResponse envelope — apiClient turns them into Error.message.
      toast.error(error.message || CRM_SHARED_STRINGS.toast.noteUpdateFailed);
    },
  });
}

export function useDeleteNote(entityType: NoteEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: byEntityKey(entityType, entityId),
      });
      invalidateEntityStats(qc, { type: entityType, id: entityId });
      toast.success(CRM_SHARED_STRINGS.toast.noteDeleted);
    },
    onError: (error: Error) => {
      toast.error(error.message || CRM_SHARED_STRINGS.toast.noteDeleteFailed);
    },
  });
}
