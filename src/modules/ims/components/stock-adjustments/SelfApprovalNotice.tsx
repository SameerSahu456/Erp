import { ShieldAlert } from "lucide-react";

import { Typography } from "@/components/ui/typography";

import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Shown to a super admin about to approve their own adjustment (D9). */
export function SelfApprovalNotice() {
  return (
    <div role="note" className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
      <ShieldAlert className="size-4 shrink-0 text-warning" aria-hidden />
      <Typography variant="body-strong" tone="warning">{S.actions.selfApprovalNotice}</Typography>
    </div>
  );
}
