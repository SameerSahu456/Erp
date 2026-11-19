import type { StockAdjustment } from "../../stock-adjustments.api";
import { BlockedActionErrors } from "./BlockedActionErrors";
import { RejectionCallout } from "./RejectionCallout";
import { SelfApprovalNotice } from "./SelfApprovalNotice";

/** The callouts above the overview: rejection reason, self-approval warning, blocked-action list. */
export function AdjustmentNotices({
  adjustment,
  selfApproval,
  listedError,
}: {
  adjustment: StockAdjustment;
  selfApproval: boolean;
  listedError: unknown;
}) {
  return (
    <>
      {adjustment.status === "rejected" && adjustment.decision_notes ? (
        <RejectionCallout reason={adjustment.decision_notes} />
      ) : null}
      {selfApproval ? <SelfApprovalNotice /> : null}
      <BlockedActionErrors error={listedError} />
    </>
  );
}
