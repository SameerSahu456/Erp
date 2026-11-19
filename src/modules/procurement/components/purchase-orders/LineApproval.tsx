import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/display/StatusBadge"

import { type PoSnapshotLine } from "../../api"
import { PM_STATUS } from "./po-pending-changes-helpers"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

const LA_S = PURCHASE_ORDERS_STRINGS.detail.lineApproval

/** Per-line approval control (pending amendment): status badge + (when the
 *  viewer may act on a pending line) Approve / Reject buttons. */
export function LineApproval({
  line,
  busy,
  onApprove,
  onReject,
}: {
  line: PoSnapshotLine
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const s = PM_STATUS[line.pm_status] ?? PM_STATUS.pending
  return (
    <div className="flex flex-col items-start gap-1.5">
      <StatusBadge variant={s.variant}>{s.label}</StatusBadge>
      {line.pm_status === "pending" && line.can_act && (
        <div className="flex gap-1.5">
          <Button size="sm" disabled={busy} onClick={onApprove}>
            {busy && <Loader2 className="mr-1 size-4 animate-spin" />}
            {LA_S.approve}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
            {busy && <Loader2 className="mr-1 size-4 animate-spin" />}
            {LA_S.reject}
          </Button>
        </div>
      )}
    </div>
  )
}
