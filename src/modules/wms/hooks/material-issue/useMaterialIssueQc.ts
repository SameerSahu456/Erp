import { useEffect, useRef, useState } from "react";

import { useUploadAttachment } from "@modules/attachments";

import { useCompleteOutwardQc, useStartOutwardQc } from "./useMaterialIssueMutations";
import { fileStepKey, useOnceSteps } from "@shared/hooks";
import type { OperationResponse } from "../../api";
import {
  collectFailPhotoIds,
  toResponseLines,
  type ChecklistResponses,
} from "../../components/operations/checklistResponses";
import {
  qcErrors,
  qcGates,
  type QcVerdict,
} from "../../components/material-issue/material-issue-qc-helpers";

interface QcInput {
  materialIssueId: string;
  lineId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Local verdict/notes/checklist state plus the reset-and-close handler. */
function useQcLocalState(onOpenChange: (open: boolean) => void) {
  const [op, setOp] = useState<OperationResponse | null>(null);
  const [result, setResult] = useState<QcVerdict | null>(null);
  const [notes, setNotes] = useState("");
  const [responses, setResponses] = useState<ChecklistResponses>({});
  // Buffered: uploaded only on Complete, so Cancel leaves no orphan attachment.
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const steps = useOnceSteps();

  // Resets fire from event handlers (close, submit success), never from an
  // effect — adjusting state in an effect is the anti-pattern.
  const resetLocalState = () => {
    setOp(null);
    setResult(null);
    setNotes("");
    setResponses({});
    setPhotoFiles([]);
    steps.reset();
  };

  const close = () => {
    resetLocalState();
    onOpenChange(false);
  };

  return {
    op,
    setOp,
    result,
    setResult,
    notes,
    setNotes,
    responses,
    setResponses,
    photoFiles,
    setPhotoFiles,
    steps,
    close,
  };
}

/** Opening starts a fresh op against the line's unit, once per open session. */
function useStartOnOpen(
  { materialIssueId, lineId, open }: Omit<QcInput, "onOpenChange">,
  setOp: (op: OperationResponse) => void,
) {
  const startMutation = useStartOutwardQc();
  // Guards against re-firing for the same open session (React 19 dev
  // double-invoke, or a re-render while in flight) — a ref, not state.
  const startedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !lineId) {
      startedForRef.current = null;
      return;
    }
    if (startedForRef.current === lineId) return;
    startedForRef.current = lineId;
    startMutation.mutate(
      { id: materialIssueId, lineId },
      { onSuccess: (data) => setOp(data) },
    );
    // Only the open/line transition should (re)start the op — not every
    // render while the mutation object is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, materialIssueId, lineId]);

  return startMutation;
}

interface SubmitInput {
  materialIssueId: string;
  lineId: string | null;
  op: OperationResponse | null;
  canSubmit: boolean;
  gates: ReturnType<typeof qcGates>;
  local: ReturnType<typeof useQcLocalState>;
}

/** Upload the buffered photos (stage photos, then fail evidence), then complete the op. */
function useQcSubmit(completeMutation: ReturnType<typeof useCompleteOutwardQc>) {
  const uploadAttachment = useUploadAttachment();
  const run = async ({ materialIssueId, lineId, op, canSubmit, gates, local }: SubmitInput) => {
    const { hasChecklist, checklistItems, checklistDecides } = gates;
    const { responses, result, notes, photoFiles, steps, close } = local;
    if (!op || !lineId || !canSubmit) return;
    // Each upload is a once-step, so a retry after a failed complete never
    // re-uploads. The upload mutation toasts its own failure, so a catch just aborts.
    const upload = (dt: string, file: File) =>
      steps.run(fileStepKey(dt, file), () =>
        uploadAttachment
          .mutateAsync({
            file,
            document_type: dt,
            entity_type: "warehouse_operations",
            entity_id: op.id,
            silent: true,
          })
          .then((a) => a.id),
      );
    let failPhotoIds: Record<string, string[]> = {};
    try {
      for (const file of photoFiles) await upload("qc_final", file);
      if (hasChecklist) {
        failPhotoIds = await collectFailPhotoIds(checklistItems, responses, upload);
      }
    } catch {
      return;
    }
    completeMutation.mutate(
      {
        id: materialIssueId,
        lineId,
        body: {
          checklist_responses: hasChecklist
            ? toResponseLines(checklistItems, responses, failPhotoIds)
            : [],
          // Omit the result only when the checklist itself decides — the
          // backend derives pass/fail from the checklist responses then.
          result: checklistDecides ? undefined : (result ?? undefined),
          notes: notes.trim() || undefined,
        },
      },
      { onSuccess: close },
    );
  };
  return { run, uploading: uploadAttachment.isPending };
}

/** Per-line outward QC state, start-on-open, gating and submit (spec §6, D20/D21). */
export function useMaterialIssueQc(input: QcInput) {
  const { materialIssueId, lineId, open } = input;
  const local = useQcLocalState(input.onOpenChange);
  const { op, result, notes, responses, photoFiles } = local;
  const startMutation = useStartOnOpen(input, local.setOp);
  const completeMutation = useCompleteOutwardQc();
  const { run: runSubmit, uploading } = useQcSubmit(completeMutation);
  const submitting = completeMutation.isPending || uploading;

  const checklistLoading = startMutation.isPending;
  const gates = qcGates({
    op,
    responses,
    result,
    checklistLoading,
    submitting,
  });
  const { canSubmit } = gates;
  const submit = () =>
    runSubmit({ materialIssueId, lineId, op, canSubmit, gates, local });

  const { startError, errorMessage } = qcErrors(
    startMutation.error,
    completeMutation.error,
  );
  const starting = startMutation.isPending || (open && !op && !startError);

  // Dirty once the operator entered a verdict, notes, a photo or a checklist answer (the
  // auto-started `op` is not an edit) — so Cancel / Esc route through the guard.
  const dirty =
    result !== null ||
    notes.trim().length > 0 ||
    photoFiles.length > 0 ||
    Object.keys(responses).length > 0;

  return {
    ...local,
    checklistItems: gates.checklistItems,
    hasChecklist: gates.hasChecklist,
    checklistLoading,
    resultRequired: gates.resultRequired,
    canSubmit,
    blockReason: gates.blockReason,
    submit,
    submitting,
    errorMessage,
    starting,
    dirty,
  };
}
