/** Controller behind `QcCompleteDialog`; uploads are once-steps so retries never re-upload. */
import { useState } from "react";
import { toast } from "sonner";

import { QC_STRINGS } from "../../components/qc/qc.strings";
import { errMsg } from "../../errorMessage";
import { useStageCompletion } from "../operations/useStageCompletion";
import { useCompleteQc, useDeviceQc } from "./useQc";

const S = QC_STRINGS.completeDialog;

/** Grade is a pass-tier (A/B today). Failing is NOT a grade — it's the explicit
 *  result control (shown only when no checklist drives the verdict). */
export const QC_GRADE_OPTIONS = ["A", "B"] as const;
export type QcGrade = (typeof QC_GRADE_OPTIONS)[number];

const isQcGrade = (v: string): v is QcGrade => (QC_GRADE_OPTIONS as readonly string[]).includes(v);

export function useQcComplete(deviceId: string | null, onClose: () => void) {
  const open = deviceId !== null;
  const stage = useStageCompletion(useDeviceQc(deviceId ?? "", open));
  const { op } = stage;
  const [grade, setGrade] = useState("");
  // Guards the multi-step completion against a double-click while it runs.
  const [submitting, setSubmitting] = useState(false);
  const completeQc = useCompleteQc();
  const busy = completeQc.isPending || stage.uploading;

  const close = () => {
    stage.reset();
    setGrade("");
    setSubmitting(false);
    onClose();
  };

  // A grade is required whenever the resolved result is a pass; a fail takes none.
  const resolvedPass = stage.resolvedResult === "pass";
  const gradeOk = !resolvedPass || !!grade;
  const ready = !!op && stage.verdictOk && gradeOk && !stage.checklistLoadFailed;

  const blockReason = (() => {
    if (!op) return null;
    const checklistReason = stage.checklistBlockReason(S.blocked);
    if (checklistReason) return checklistReason;
    return gradeOk ? null : S.blocked.grade;
  })();

  const submit = async () => {
    if (!deviceId || !op || !ready || submitting) return;
    setSubmitting(true);
    let failPhotoIds: Record<string, string[]>;
    try {
      // Upload the buffered photo(s) now (nothing hit the API while editing).
      await stage.uploadStagePhotos(op.id, "qc_final");
      failPhotoIds = await stage.uploadFailPhotos(op.id);
    } catch (e) {
      toast.error(errMsg(e, S.photoUploadFailed));
      setSubmitting(false);
      return;
    }
    completeQc.mutate(
      {
        id: deviceId,
        body: {
          ...stage.buildPayload(failPhotoIds),
          // Grade only on a pass.
          grade: resolvedPass && isQcGrade(grade) ? grade : undefined,
        },
      },
      // On failure re-enable so the operator can retry (uploads won't re-run).
      { onSuccess: close, onError: () => setSubmitting(false) },
    );
  };

  return {
    open,
    stage,
    grade,
    setGrade,
    resolvedPass,
    ready,
    blockReason,
    busy,
    submitting,
    submit,
    close,
  };
}
