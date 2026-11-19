import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@shared/api/notify-mutation-error";

import { CHECKLISTS_STRINGS } from "../../components/checklists/checklists.strings";

import {
  createChecklist,
  deleteChecklist,
  fetchChecklist,
  fetchChecklists,
  fetchChecklistTypes,
  updateChecklist,
  type ChecklistTemplateCreate,
  type ChecklistTemplateUpdate,
} from "../../api";

const KEY = ["ims", "checklists"] as const;
const TYPES_KEY = ["ims", "checklist-types"] as const;

// Checklists-per-part are few and shown as one block (no pager), so this fetch
// deliberately pulls more than the 10-row list default — named here rather than
// left as a bare literal (§16.6).
const CHECKLIST_PAGE_SIZE = 25;

/** Checklist-template list, server-side filtered and paged (§16.7); refreshed by every template write. */
export function useChecklistsList(
  params: NonNullable<Parameters<typeof fetchChecklists>[0]>,
) {
  return useQuery({
    queryKey: [...KEY, "list", params],
    queryFn: () => fetchChecklists(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Lists checklist templates scoped to a specific part. Uses the standard
 * standard page envelope from `GET /ims/checklists`.
 */
export function useChecklistsForPart(
  partId: string,
  params?: { page?: number; page_size?: number },
  options?: { enabled?: boolean },
) {
  const page = params?.page ?? 1;
  const pageSize = params?.page_size ?? CHECKLIST_PAGE_SIZE;
  return useQuery({
    queryKey: [...KEY, "by-part", partId, { page, pageSize }],
    queryFn: () =>
      fetchChecklists({
        target_type: "part",
        target_id: partId,
        page,
        page_size: pageSize,
      }),
    enabled: (options?.enabled ?? true) && !!partId,
    placeholderData: keepPreviousData,
  });
}

/** Single checklist template — used by the full-page edit form. */
export function useChecklist(id: string) {
  return useQuery({
    queryKey: [...KEY, "by-id", id],
    queryFn: () => fetchChecklist(id),
    enabled: !!id,
  });
}

/** Canonical checklist types — Inward QC / Outward QC / Inspection / etc. */
export function useChecklistTypes() {
  return useQuery({
    queryKey: TYPES_KEY,
    queryFn: fetchChecklistTypes,
  });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChecklistTemplateCreate) => createChecklist(body),
    onSuccess: (_, variables) => {
      // Invalidate the per-target list this template belongs to.
      void qc.invalidateQueries({
        queryKey: [...KEY, "by-part", variables.target_id],
      });
      toast.success(CHECKLISTS_STRINGS.toasts.created);
    },
    onError: notifyMutationError,
  });
}

export function useUpdateChecklist(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChecklistTemplateUpdate) => updateChecklist(id, body),
    onSuccess: () => {
      // Identity (target_type/target_id/type_code) is immutable so the row
      // stays under the same per-part list — invalidate broadly.
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(CHECKLISTS_STRINGS.toasts.updated);
    },
    onError: notifyMutationError,
  });
}

/** Row-level Active toggle (list pages). Takes the id per call, unlike
 *  `useUpdateChecklist`, so one hook serves every row. */
export function useSetChecklistActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateChecklist(id, { is_active: isActive }),
    onSuccess: (_data, { isActive }) => {
      toast.success(
        isActive
          ? CHECKLISTS_STRINGS.toasts.activated
          : CHECKLISTS_STRINGS.toasts.deactivated,
      );
    },
    onError: notifyMutationError,
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChecklist(id),
    onSuccess: (_data, id) => {
      // Skip the deleted checklist's own detail query — see
      // useDeleteVariant for the rationale. ChecklistFormPage's
      // still-mounted useChecklist(id) observer would otherwise
      // refetch the just-deleted id and 404.
      void qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== id,
      });
      toast.success(CHECKLISTS_STRINGS.toasts.deleted);
    },
    onError: notifyMutationError,
  });
}
