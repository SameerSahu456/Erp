import { AlertTriangle } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { ApiError } from "@shared/api/envelope";

import { listAdjustmentErrors } from "../../lib/stock-adjustment-errors";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

const STALE = "STOCK_ADJUSTMENT_STALE";

/** The per-line list a blocked submit / approve returned. A 409 STALE means
 *  approval re-validation failed under lock and nothing changed (D8). */
export function BlockedActionErrors({ error }: { error: unknown }) {
  const rows = listAdjustmentErrors(error);
  if (rows.length === 0) return null;
  const stale = error instanceof ApiError && (error.businessCode === STALE || error.hasErrorCode(STALE));
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive-soft p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
        <Typography variant="body-strong" tone="danger">
          {stale ? S.detail.staleTitle : S.detail.listedTitle}
        </Typography>
      </div>
      <ul className="space-y-1">
        {rows.map((row, i) => (
          <li key={`${row.line ?? "h"}-${i}`} className="flex min-w-0 gap-2">
            <Typography variant="body-strong" className="shrink-0">
              {S.detail.lineRef(row.line)}
            </Typography>
            <Typography variant="body-sm" className="min-w-0 break-words">
              {row.message}
            </Typography>
          </li>
        ))}
      </ul>
    </div>
  );
}
