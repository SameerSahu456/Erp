import { useState } from "react"
import { CheckCircle2, Clock, ThumbsDown, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"

import {
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
} from "../../hooks/purchase-orders/usePurchaseOrders"
import type { PurchaseOrderItemView } from "../../api"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

const LAC_S = PURCHASE_ORDERS_STRINGS.detail.lineApproval

const STATUS: Record<string, { label: string; variant: StatusBadgeVariant }> = {
  pending: { label: LAC_S.status.pending, variant: "warning" },
  approved: { label: LAC_S.status.approved, variant: "success" },
  rejected: { label: LAC_S.status.rejected, variant: "error" },
}

/**
 * Per-line approval control on the PO detail items table: a status badge,
 * plus Approve / Reject buttons when the line is pending and the viewer may
 * act on it (``can_act``). Reject opens a required-note prompt (one rejected
 * line rejects the whole PO).
 */
export function LineApprovalCell({
  poId,
  item,
  part = "both",
  appearance = "default",
}: {
  poId: string
  item: PurchaseOrderItemView
  /** Render just the status badge, just the action buttons, or both (default). */
  part?: "status" | "action" | "both"
  /** `so` = the SO approval panel's look (PM approval card): an actionable
   *  line shows only inline outlined Approve / Reject buttons; a decided line
   *  shows an icon + status text. `default` = badge + stacked buttons. */
  appearance?: "default" | "so"
}) {
  const approve = useApprovePurchaseOrder()
  const reject = useRejectPurchaseOrder()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [note, setNote] = useState("")
  const busy = approve.isPending || reject.isPending

  if (!item.pm_status) return <span className="text-muted-foreground">—</span>

  const s = STATUS[item.pm_status] ?? STATUS.pending
  const showStatus = part === "status" || part === "both"
  const showAction = part === "action" || part === "both"
  const canAct = item.pm_status === "pending" && item.can_act

  const rejectDialog = (
    <OperationDialog
      open={rejectOpen}
      onOpenChange={setRejectOpen}
      title={LAC_S.rejectDialog.title}
      bodyClassName="space-y-4"
      footer={
        <>
          <Button variant="outline" onClick={() => setRejectOpen(false)}>
            {LAC_S.rejectDialog.cancel}
          </Button>
          <Button
            variant="outline"
            disabled={!note.trim() || busy}
            onClick={() =>
              reject.mutate(
                { id: poId, body: { line_ids: [item.id], notes: note.trim() } },
                { onSuccess: () => setRejectOpen(false) },
              )
            }
          >
            {LAC_S.rejectDialog.confirm}
          </Button>
        </>
      }
    >
      <Typography variant="body" tone="muted" asChild>
        <p>{LAC_S.rejectDialog.body}</p>
      </Typography>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={PURCHASE_ORDERS_STRINGS.detail.rejectionReasonPlaceholder}
        autoFocus
      />
    </OperationDialog>
  )

  if (appearance === "so") {
    // Mirrors SalesOrderApprovalRow / SalesOrderApprovalDetailPanel line cells.
    const decided = item.pm_status === "approved" || item.pm_status === "rejected"
    return (
      <div className="flex justify-end">
        {canAct ? (
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-success/40 text-success hover:bg-success/10"
              disabled={busy}
              onClick={() => approve.mutate({ id: poId, body: { line_ids: [item.id] } })}
            >
              <CheckCircle2 className="size-3.5" data-icon="inline-start" />
              {LAC_S.approve}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              <ThumbsDown className="size-3.5" data-icon="inline-start" />
              {LAC_S.reject}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {item.pm_status === "approved" ? (
              <CheckCircle2 className="size-3.5 text-success" />
            ) : item.pm_status === "rejected" ? (
              <XCircle className="size-3.5 text-destructive" />
            ) : (
              <Clock className="size-3.5 text-muted-foreground" />
            )}
            <Typography
              variant="caption"
              tone={decided ? (item.pm_status === "approved" ? "success" : "danger") : "muted"}
              className="font-semibold"
              asChild
            >
              <span>{s.label}</span>
            </Typography>
          </div>
        )}
        {rejectDialog}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Just the verdict badge — the rejection reason is shown once, in a
          banner above the line-items table (a long note here broke the cell). */}
      {showStatus && <StatusBadge variant={s.variant}>{s.label}</StatusBadge>}
      {showAction && canAct && (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => approve.mutate({ id: poId, body: { line_ids: [item.id] } })}
          >
            {LAC_S.approve}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setRejectOpen(true)}
          >
            {LAC_S.reject}
          </Button>
        </div>
      )}
      {showAction && !canAct && item.pm_status === "pending" && (
        <span className="text-muted-foreground">—</span>
      )}

      {rejectDialog}
    </div>
  )
}
