import { AlertCircle } from "lucide-react"

import type { SalesOrderWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function SoRejectionBanner({ so }: { so: SalesOrderWire }) {
  // The SO header has no rejection-reason column of its own — its status rolls
  // up to "Rejected" from per-line decisions (recompute_header on the backend),
  // so the reason(s) live on the rejected lines' `line_decision_notes` (set by
  // the line /reject endpoint's `reason`). Surface every rejected line + reason.
  if (so.status !== "Rejected") return null

  const rejectedLines = so.items.filter(
    (item) => item.line_status === "Rejected",
  )
  const withReason = rejectedLines.filter((item) =>
    item.line_decision_notes?.trim(),
  )

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive-soft px-4 py-3">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="size-4 shrink-0" />
        <h4 className="text-sm font-semibold">{S.detail.rejectionBanner.title}</h4>
      </div>
      {withReason.length > 0 ? (
        <ul className="mt-2 space-y-1.5 pl-6">
          {withReason.map((item) => (
            <li key={item.id} className="list-disc break-words text-sm text-foreground">
              <span className="font-medium">{item.item_name}</span>
              {": "}
              <span className="whitespace-pre-wrap break-words text-muted-foreground">
                {item.line_decision_notes}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        // Status is Rejected but no reason text is visible — either none was
        // recorded, or the rejected line is hidden by viewer_context filtering.
        <p className="mt-1.5 pl-6 text-sm text-muted-foreground">
          {S.detail.rejectionBanner.noReason}
        </p>
      )}
    </div>
  )
}
