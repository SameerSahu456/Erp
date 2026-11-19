/** Pure derivations for the issue-work wizard (`useWorkAssignmentIssue`). */
import type {
  EligibleDeviceParams,
  WorkAssignmentStage,
} from "../../api/work-assignments";
import { type WorkSelection } from "../../components/work-assignments/IssueStepWork";
import { MAX_UNITS_PER_ISSUE } from "../../constants/assignment";

/** The eligible-summary / engineers scope; blanks are omitted, not sent. */
export function issueScope(
  stage: WorkAssignmentStage | "",
  warehouseId: string | null,
  categoryId: string | null,
) {
  return {
    stage: stage || undefined,
    warehouse_id: warehouseId ?? undefined,
    category_id: categoryId ?? undefined,
  };
}

/** Eligible-device params for the chosen line (only its devices are fetched). */
export function issueDeviceParams(
  scope: ReturnType<typeof issueScope>,
  effectiveWork: WorkSelection | null,
  deviceSearch: string,
): Partial<EligibleDeviceParams> {
  return {
    ...scope,
    grn_batch_id: effectiveWork?.grnBatchId ?? undefined,
    // NULL partVariantId = the whole GRN, so no variant filter at all.
    part_variant_ids: effectiveWork?.partVariantId
      ? [effectiveWork.partVariantId]
      : undefined,
    q: deviceSearch || undefined,
    page_size: MAX_UNITS_PER_ISSUE,
  };
}

interface CanSubmitArgs {
  warehouseId: string | null;
  stage: WorkAssignmentStage | "";
  effectiveWork: WorkSelection | null;
  engineerId: string | null;
  issuedCount: number;
  isPending: boolean;
}

export function canSubmitIssue(a: CanSubmitArgs): boolean {
  return (
    Boolean(a.warehouseId && a.stage && a.effectiveWork && a.engineerId) &&
    a.issuedCount > 0 &&
    a.issuedCount <= MAX_UNITS_PER_ISSUE &&
    !a.isPending
  );
}
