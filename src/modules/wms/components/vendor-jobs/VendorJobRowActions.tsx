import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type { VendorJobDialogKind } from "../../hooks/vendor-jobs/useVendorJobsList";
import { VENDOR_JOBS_STRINGS as S } from "./vendor-jobs.strings";

interface Props {
  jobId: string;
  stage: string;
  /** SERVICE_JOB_MANAGE — Send / Send again, and cancelling a job at the vendor. */
  canManage: boolean;
  /** SERVICE_JOB_COMPLETE — Receive. */
  canComplete: boolean;
  /** Device stage grant at the job's warehouse — cancel-before-send. */
  canCancel: boolean;
  onAction: (kind: VendorJobDialogKind, jobId: string) => void;
}

/** Row actions gated like the backend (§5): Send needs MANAGE, Receive needs COMPLETE,
 *  Cancel-before-send follows the device stage grant. */
export function VendorJobRowActions({ jobId, stage, canManage: canManageJob, canComplete: canCompleteJob, canCancel, onAction }: Props) {
  const fire = (kind: VendorJobDialogKind) => (e: MouseEvent) => {
    e.stopPropagation();
    onAction(kind, jobId);
  };

  if (stage === "awaiting_vendor") {
    if (canManageJob || canCancel) {
      return (
        <div className="flex items-center justify-end gap-2">
          {canManageJob && (
            <Button size="sm" variant="outline" onClick={fire("send")}>
              {S.rowActions.send}
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="destructive" onClick={fire("cancel")}>
              {S.rowActions.cancel}
            </Button>
          )}
        </div>
      );
    }
  }
  // At the vendor, writing a job off is a manager's call (same gate as the device page).
  if (stage === "with_vendor" && (canCompleteJob || canManageJob)) {
    return (
      <div className="flex items-center justify-end gap-2">
        {canCompleteJob && (
          <Button size="sm" onClick={fire("receive")}>
            {S.rowActions.receive}
          </Button>
        )}
        {canManageJob && (
          <Button size="sm" variant="destructive" onClick={fire("cancel")}>
            {S.rowActions.cancel}
          </Button>
        )}
      </div>
    );
  }
  if (stage === "returned" && canManageJob) {
    return (
      <Button size="sm" variant="outline" onClick={fire("resend")}>
        {S.rowActions.sendAgain}
      </Button>
    );
  }
  return (
    <Typography variant="body" tone="muted" asChild>
      <span aria-hidden>—</span>
    </Typography>
  );
}
