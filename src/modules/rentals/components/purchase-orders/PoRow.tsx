import { FileSignature } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE } from "@/shared/constants";

import type { RentalPurchaseOrder } from "../../api/purchase-orders";
import { PO_KIND_LABELS, PO_STATUS_LABELS, PO_STATUS_VARIANT } from "../../constants/billing";
import { formatRentalDay } from "../../lib/format";
import type { PoDecision } from "./PoDecisionDialog";
import { PoDocumentCell } from "./PoDocumentCell";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

function periodOf(po: RentalPurchaseOrder): string {
  const to = formatRentalDay(po.valid_to);
  return po.valid_from ? S.period(formatRentalDay(po.valid_from), to) : S.periodOpen(to);
}

/** The line under a PO row: why it is waiting, or why it was turned down. */
function rowNote(po: RentalPurchaseOrder): string | null {
  if (po.status === "awaiting") return S.awaitedNote;
  if (po.status === "pending_approval") return S.pendingNote;
  if (po.status === "rejected" && po.decision_notes) return S.rejectedNote(po.decision_notes);
  return null;
}

export interface PoRowProps {
  po: RentalPurchaseOrder;
  canManage: boolean;
  canDecide: boolean;
  onDecide: (po: RentalPurchaseOrder, decision: PoDecision) => void;
  onEnterDetails: (po: RentalPurchaseOrder) => void;
}

/** One customer PO: number and status, period, document, and — for an
 *  awaited PO — the button that enters its details. */
export function PoRow({ po, canManage, canDecide, onDecide, onEnterDetails }: PoRowProps) {
  const note = rowNote(po);
  const rateChanges = po.line_rates?.length ?? 0;
  const awaiting = po.status === "awaiting";
  return (
    <li className="grid min-w-0 gap-2 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Typography variant={po.po_number ? "mono" : "body"} tone={po.po_number ? undefined : "muted"} truncate className="min-w-0">
            {po.po_number ?? S.awaitedNumber}
          </Typography>
          <StatusBadge variant={PO_STATUS_VARIANT[po.status]}>{PO_STATUS_LABELS[po.status]}</StatusBadge>
        </div>
        <Typography variant="helper" tone="muted">
          {S.rowMeta(
            PO_KIND_LABELS[po.kind],
            po.po_date ? formatRentalDay(po.po_date) : EMPTY_VALUE,
            rateChanges,
          )}
        </Typography>
        {note ? (
          <Typography variant="helper" tone={po.status === "rejected" ? "danger" : "warning"}>
            {note}
          </Typography>
        ) : null}
      </div>
      <div className="min-w-0 space-y-1">
        <Typography variant="body">{periodOf(po)}</Typography>
        <Typography variant="helper" tone="muted" truncate>
          {po.created_by_name ?? EMPTY_VALUE}
        </Typography>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {awaiting ? (
          canManage ? (
            <Button size="sm" className="self-start" onClick={() => onEnterDetails(po)}>
              <FileSignature className="size-4" />
              {S.enterDetails}
            </Button>
          ) : null
        ) : (
          <PoDocumentCell purchaseOrderId={po.id} canEdit={canManage} />
        )}
        {canDecide ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onDecide(po, "approve")}>
              {S.decision.approve}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDecide(po, "reject")}>
              {S.decision.reject}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
