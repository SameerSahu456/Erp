import { Ban } from "lucide-react";

import { Typography } from "@/components/ui/typography";

import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Why a rejected adjustment was sent back — at the top, like a cancelled dispatch's reason. */
export function RejectionCallout({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5">
      <Ban className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <Typography variant="caption" tone="danger" className="font-semibold uppercase tracking-wide">
          {S.detail.rejectedReason}
        </Typography>
        <Typography variant="body-strong" className="whitespace-pre-wrap break-words">
          {reason}
        </Typography>
      </div>
    </div>
  );
}
