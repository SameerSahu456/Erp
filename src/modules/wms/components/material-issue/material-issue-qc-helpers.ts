import { ApiError } from "@shared/api/envelope";

import type { ChecklistItem, OperationResponse } from "../../api";
import {
  allRequiredAnswered,
  checklistDecidesVerdict,
  type ChecklistResponses,
} from "../operations/checklistResponses";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

export type QcVerdict = "pass" | "fail";

/** Why-tooltip reason (§0.9) — the first unmet DATA gate on the disabled
 *  Complete button, null when met. */
export function qcBlockReason(input: {
  checklistAnswered: boolean;
  resultMissing: boolean;
}): string | null {
  if (!input.checklistAnswered) return S.qc.checklistIncomplete;
  if (input.resultMissing) return S.qc.resultRequired;
  return null;
}

/** Checklist + verdict gating for the Complete button. */
export function qcGates(input: {
  op: OperationResponse | null;
  responses: ChecklistResponses;
  result: QcVerdict | null;
  checklistLoading: boolean;
  submitting: boolean;
}) {
  const { op, responses, result, checklistLoading } = input;
  // Fill the op's FROZEN run snapshot (what the backend grades), never the live
  // template, which may have changed since start. No snapshot ⇒ explicit verdict.
  const checklistItems = (op?.checklist_snapshot_items ?? []) as ChecklistItem[];
  const hasChecklist = checklistItems.length > 0;
  // Binding only with a verdict-capable item; otherwise the operator's result is required.
  const checklistDecides = hasChecklist && checklistDecidesVerdict(checklistItems);
  const resultRequired = !checklistDecides;
  const checklistAnswered =
    !hasChecklist || (!checklistLoading && allRequiredAnswered(checklistItems, responses));
  const canSubmit =
    !!op &&
    !input.submitting &&
    checklistAnswered &&
    (!resultRequired || result !== null);
  // Transient states (op / pending / loading) are excluded so the tooltip only
  // names a condition the operator can act on.
  const blockReason = qcBlockReason({
    checklistAnswered,
    resultMissing: resultRequired && result === null,
  });
  return { checklistItems, hasChecklist, checklistDecides, resultRequired, canSubmit, blockReason };
}

/** Complete's error wins over start's; mapped to copy by business code. */
export function qcErrors(startErr: unknown, completeErr: unknown) {
  const startError = startErr instanceof ApiError ? startErr : null;
  const completeError = completeErr instanceof ApiError ? completeErr : null;
  const apiError = completeError ?? startError;
  const errorMessage = apiError
    ? (S.errors[apiError.businessCode] ?? apiError.envMessage)
    : null;
  return { startError, errorMessage };
}
