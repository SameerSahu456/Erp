/** Shared state for the inspection / repair / QC complete dialogs. Uses the op's frozen
 *  checklist snapshot (what the backend validates); photos upload only on Complete. */
import { useMemo, useState } from "react";

import { useUploadAttachment } from "@modules/attachments";

import { type ChecklistItem } from "../../api";
import {
  allRequiredAnswered,
  checklistDecidesVerdict,
  collectFailPhotoIds,
  hasChecklistInput,
  projectedChecklistVerdict,
  toResponseLines,
  type ChecklistResponses,
} from "../../components/operations/checklistResponses";
import { CHECKLIST_FIELDS_STRINGS } from "../../components/operations/checklist-fields.strings";
import { fileStepKey, useOnceSteps } from "@shared/hooks";

export type StageVerdict = "pass" | "fail";

/** The slice of an active stage op the completion form reads. */
export interface StageOpLike {
  id: string;
  checklist_snapshot_items?: Record<string, unknown>[] | null;
}

/** The op query's state, as returned by `useDevice{Inspection,Repair,Qc}`. */
interface StageOpQuery<T extends StageOpLike> {
  data: T | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

/** Tooltip copy for the checklist-level reasons Complete can be blocked. */
export interface ChecklistBlockStrings {
  checklistUnavailable: string;
  checklist: string;
  result: string;
}

const NO_ITEMS: ChecklistItem[] = [];

export function useStageCompletion<T extends StageOpLike>(opQuery: StageOpQuery<T>) {
  const op = opQuery.data ?? undefined;
  const [responses, setResponses] = useState<ChecklistResponses>({});
  // Explicit verdict — only used when the checklist can't decide pass/fail.
  const [result, setResult] = useState<StageVerdict | null>(null);
  const [notes, setNotes] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const steps = useOnceSteps();
  const uploadAttachment = useUploadAttachment();

  const snapshot = op?.checklist_snapshot_items;
  const items = useMemo(() => (snapshot as ChecklistItem[] | null | undefined) ?? NO_ITEMS, [snapshot]);
  const hasChecklist = items.length > 0;
  // The checklist drives the verdict only when it has a Pass/Fail item; an
  // evidence-only checklist (or none) needs the operator's explicit toggle.
  const checklistVerdict = checklistDecidesVerdict(items);
  const resolvedResult = checklistVerdict ? projectedChecklistVerdict(items, responses) : result;
  const checklistAnswered = !hasChecklist || allRequiredAnswered(items, responses);
  const verdictOk = checklistAnswered && (checklistVerdict || result !== null);
  const checklistLoadFailed = opQuery.isError;

  /** Any assessment input (everything except the notes). */
  const hasAssessmentInput =
    hasChecklistInput(responses) || result !== null || photoFiles.length > 0;
  /** Anything the operator entered — drives the discard-changes guard. */
  const dirty = hasAssessmentInput || notes.trim().length > 0;

  /** The first checklist-level reason Complete is disabled, or null. Callers
   *  append their stage-specific reasons after this one. */
  const checklistBlockReason = (blk: ChecklistBlockStrings): string | null => {
    if (checklistLoadFailed) return blk.checklistUnavailable;
    if (!checklistAnswered) return blk.checklist;
    if (!checklistVerdict && result === null) return blk.result;
    return null;
  };

  /** Clear every field so a reused (never-unmounted) dialog reopens clean —
   *  otherwise leftover entries read as dirty on the next open. */
  const reset = () => {
    steps.reset();
    setResponses({});
    setResult(null);
    setNotes("");
    setPhotoFiles([]);
  };

  /** Upload one buffered file against the op, once per step key. */
  const uploadOnce = (opId: string, stepPrefix: string, documentType: string, file: File) =>
    steps.run(fileStepKey(stepPrefix, file), () =>
      uploadAttachment.mutateAsync({
        file,
        document_type: documentType,
        entity_type: "warehouse_operations",
        entity_id: opId,
        // One summary toast on complete — not one per photo (§0.13).
        silent: true,
      }),
    );

  /** Upload the buffered stage photo(s) under `stageDocType`. */
  const uploadStagePhotos = async (opId: string, stageDocType: string) => {
    for (const file of photoFiles) {
      await uploadOnce(opId, "photo", stageDocType, file);
    }
  };

  /** Upload each failed check's buffered evidence photos; returns their
   *  attachment ids keyed by checklist item for the submit payload. */
  const uploadFailPhotos = (opId: string) =>
    collectFailPhotoIds(items, responses, (dt, file) =>
      uploadOnce(opId, dt, dt, file).then((a) => a.id),
    );

  /** The completion payload's shared fields. */
  const buildPayload = (failPhotoIds: Record<string, string[]>) => ({
    checklist_responses: toResponseLines(items, responses, failPhotoIds),
    // Omit result only when the checklist can decide the verdict itself.
    result: checklistVerdict ? undefined : (result ?? undefined),
    notes: notes.trim() || undefined,
  });

  return {
    op,
    templateLoading: opQuery.isLoading,
    checklistLoadFailed,
    items,
    hasChecklist,
    checklistVerdict,
    resolvedResult,
    verdictOk,
    responses,
    setResponses,
    result,
    setResult,
    notes,
    setNotes,
    photoFiles,
    setPhotoFiles,
    hasAssessmentInput,
    dirty,
    uploading: uploadAttachment.isPending,
    checklistBlockReason,
    reset,
    uploadStagePhotos,
    uploadFailPhotos,
    buildPayload,
  };
}

export type StageCompletion = ReturnType<typeof useStageCompletion>;
