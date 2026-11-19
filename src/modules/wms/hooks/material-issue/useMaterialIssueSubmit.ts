import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  useCreateMaterialIssue,
  useIssueMaterialIssue,
  usePatchMaterialIssueHeader,
  useAddMaterialIssueLines,
  useDeleteMaterialIssueLines,
  useInvalidateMaterialIssue,
} from "./useMaterialIssueMutations";
import { materialIssueFormSchema } from "../../schemas";
import type { MaterialIssueLineInput, MaterialIssueResponse, WiredIssueType } from "../../api";
import { MATERIAL_ISSUE_STRINGS as S } from "../../components/material-issue/material-issue.strings";
import {
  type FormFieldError,
  focusFormError,
} from "../../components/material-issue/material-issue-form-helpers";

export interface MaterialIssueSubmitInput {
  isEdit: boolean;
  draft: MaterialIssueResponse | undefined;
  /** Unsaved user edits exist (before the submitting gate is applied). */
  hasEdits: boolean;
  headerChanged: boolean;
  linesChanged: boolean;
  newRowCount: number;
  removedIds: Set<string>;
  header: {
    issueType: WiredIssueType;
    sourceEntityId: string;
    warehouseId: string;
    engineerId: string;
    externalTicket: string;
    notes: string;
  };
  buildLineItems: () => MaterialIssueLineInput[];
  validate: () => FormFieldError | null;
  setFormError: (err: FormFieldError | null) => void;
}

/** Material-issue save flow: create→issue, or edit (patch + delete→re-add → issue). */
export function useMaterialIssueSubmit(input: MaterialIssueSubmitInput) {
  const navigate = useNavigate();
  const createMutation = useCreateMaterialIssue();
  const issueMutation = useIssueMaterialIssue();
  const patchMutation = usePatchMaterialIssueHeader();
  const addMutation = useAddMaterialIssueLines();
  const deleteLinesMutation = useDeleteMaterialIssueLines();
  const invalidateMi = useInvalidateMaterialIssue();
  const isSubmitting =
    createMutation.isPending ||
    issueMutation.isPending ||
    patchMutation.isPending ||
    addMutation.isPending ||
    deleteLinesMutation.isPending;

  // Unsaved-changes guard — prompt to discard when the user has started editing
  // and tries to leave before saving (see `hasEdits` in useMaterialIssueForm).
  const isDirty = !isSubmitting && input.hasEdits;
  const guard = useUnsavedChangesGuard({ isDirty });

  const { draft, header } = input;

  const buildPayload = () => ({
    issue_type: header.issueType,
    source_entity_id: header.sourceEntityId,
    warehouse_id: header.warehouseId,
    issued_to_user_id: header.engineerId,
    external_ticket_number: header.externalTicket.trim() || null,
    notes: header.notes.trim() || null,
    line_items: input.buildLineItems(),
  });

  // Rebuild lines (delete existing + re-add). Runs `silent` so the delete and
  // the add don't each toast + invalidate; one summary toast + one invalidation
  // fire after the rebuild instead of per call (§0.13/§11). Removed lines go in
  // ONE bulk-delete request (not a PATCH-per-line loop) so a trim of N lines is
  // a single round-trip.
  const rebuildLines = async (draftId: string) => {
    // Not one transaction: invalidate in `finally` so screens show the real server state.
    try {
      const removedIds = [...input.removedIds];
      if (removedIds.length > 0) {
        await deleteLinesMutation.mutateAsync({
          id: draftId,
          lineIds: removedIds,
          silent: true,
        });
      }
      const newLines = input.buildLineItems();
      if (newLines.length > 0) {
        await addMutation.mutateAsync({ id: draftId, lines: newLines, silent: true });
      }
    } finally {
      invalidateMi(draftId);
    }
    toast.success(S.toast.linesUpdated);
  };

  const goToDetail = async (miId: string) => {
    // Saved — suppress the discard guard for the navigation that follows.
    guard.bypassOnce();
    await guard.popSentinelIfPresent();
    // Replace (not push) so the detail's Back button returns to the LIST,
    // not back into this now-submitted form.
    navigate(`/wms/material-issue/${miId}`, { replace: true });
  };

  const submitEdit = async (thenIssue: boolean) => {
    if (!draft) return;
    try {
      // Only patch the header if it actually changed (else no needless
      // "Draft updated" toast on a save that only touched lines / nothing).
      if (input.headerChanged) {
        await patchMutation.mutateAsync({
          id: draft.id,
          body: {
            notes: header.notes.trim() || null,
            issued_to_user_id: header.engineerId,
            external_ticket_number: header.externalTicket.trim() || null,
          },
        });
      }
      // Only rebuild lines if the line items changed — a no-op save must NOT
      // delete/re-add and fire "Line item removed".
      if (input.linesChanged) await rebuildLines(draft.id);
      if (thenIssue) {
        await issueMutation.mutateAsync(draft.id);
      }
      await goToDetail(draft.id);
    } catch {
      // The mutation's error handler surfaces the message.
    }
  };

  const schemaRejects = (payload: ReturnType<typeof buildPayload>): boolean => {
    const parsed = materialIssueFormSchema.safeParse(payload);
    if (parsed.success) return false;
    toast.error(parsed.error.issues[0]?.message ?? S.form.validation.checkForm);
    return true;
  };

  const submit = (thenIssue: boolean) => {
    const err = input.validate();
    if (err) {
      // Block, surface the message inline on the offending control, and scroll
      // to + focus it (§3/§6.4) — no toast for a validation miss.
      input.setFormError(err);
      focusFormError(err.target);
      return;
    }
    input.setFormError(null);
    if (input.isEdit) {
      // New lines still go through the create-shape schema (line_items only).
      if (input.newRowCount > 0 && schemaRejects(buildPayload())) return;
      void submitEdit(thenIssue);
      return;
    }
    const payload = buildPayload();
    if (schemaRejects(payload)) return;
    createMutation.mutate(payload, {
      onSuccess: (created) => {
        if (thenIssue) {
          // The draft exists either way; go to its detail so a retry does not create a second draft.
          issueMutation.mutate(created.id, {
            onSettled: () => void goToDetail(created.id),
          });
        } else {
          void goToDetail(created.id);
        }
      },
    });
  };

  return { guard, isSubmitting, submit };
}
