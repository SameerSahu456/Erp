import { useState } from "react";
import { CalendarPlus, FilePlus2 } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { usePermission } from "@shared/rbac";

import type {
  RentalOrderPurchaseOrders,
  RentalPurchaseOrder,
} from "../../api/purchase-orders";
import {
  PO_INVOICING_LABELS,
  PO_STATE_LABELS,
  PO_STATE_VARIANT,
} from "../../constants/billing";
import { useOrderPurchaseOrders } from "../../hooks/purchase-orders/usePurchaseOrders";
import { ExtendRentalSalesOrderDialog } from "../agreements/ExtendRentalSalesOrderDialog";
import { formatRentalDay } from "../../lib/format";
import { rentalsCan } from "../../permissions";
import { EnterPoDetailsDialog } from "./EnterPoDetailsDialog";
import { ExtendPoDialog } from "./ExtendPoDialog";
import { PoDecisionDialog, type PoDecision } from "./PoDecisionDialog";
import { PoRow } from "./PoRow";
import { RecordPoDialog } from "./RecordPoDialog";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const C = S.card;

/** Where the order's PO stands: its badge, end and invoicing — or why
 *  there is nothing here yet. */
function PoSummary({ data }: { data: RentalOrderPurchaseOrders }) {
  if (!data.po_required) {
    return (
      <Typography variant="body" tone="muted">
        {C.notRequired}
      </Typography>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {data.po_state ? (
        <StatusBadge variant={PO_STATE_VARIANT[data.po_state]}>
          {PO_STATE_LABELS[data.po_state]}
        </StatusBadge>
      ) : null}
      {data.po_end_date ? (
        <Typography variant="body">
          {C.endsOn(formatRentalDay(data.po_end_date))}
        </Typography>
      ) : null}
      <Typography variant="helper" tone="muted">
        {C.invoicing(PO_INVOICING_LABELS[data.po_invoicing])}
      </Typography>
    </div>
  );
}

type OpenDialog =
  | { kind: "record" }
  | { kind: "extend" }
  | { kind: "extend_period" }
  | { kind: "details"; po: RentalPurchaseOrder }
  | { kind: "decide"; po: RentalPurchaseOrder; decision: PoDecision };

/** A PO Required order moves on with Extend PO or Extend period only — held
 *  back while an extension waits for approval or an awaited PO waits for its
 *  details. Any other order records POs for reference: Record PO, again for
 *  each new one (2026-11-16); the server refuses a second while one is
 *  awaited. */
function PoHeaderActions({
  data,
  canManage,
  canExtendPeriod,
  onOpen,
}: {
  data: RentalOrderPurchaseOrders;
  canManage: boolean;
  canExtendPeriod: boolean;
  onOpen: (dialog: OpenDialog) => void;
}) {
  const awaited = data.items.some((po) => po.status === "awaiting");
  if (!data.po_required) {
    return canManage ? (
      <Button size="sm" variant="outline" disabled={awaited} onClick={() => onOpen({ kind: "record" })}>
        <FilePlus2 className="size-4" />
        {C.record}
      </Button>
    ) : null;
  }
  const blocked = awaited || data.items.some((po) => po.status === "pending_approval");
  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-2">
      {canExtendPeriod ? (
        <Button size="sm" variant="outline" onClick={() => onOpen({ kind: "extend_period" })}>
          <CalendarPlus className="size-4" />
          {C.extendPeriod}
        </Button>
      ) : null}
      {canManage ? (
        <Button size="sm" variant="outline" disabled={blocked} onClick={() => onOpen({ kind: "extend" })}>
          <CalendarPlus className="size-4" />
          {C.extend}
        </Button>
      ) : null}
    </div>
  );
}

/** Whichever PO dialog is open, if any. */
function PoCardDialog({
  salesOrderId,
  dialog,
  onClose,
}: {
  salesOrderId: string;
  dialog: OpenDialog | null;
  onClose: () => void;
}) {
  const onOpenChange = (next: boolean) => !next && onClose();
  switch (dialog?.kind) {
    case "record":
      return <RecordPoDialog salesOrderId={salesOrderId} open onOpenChange={onOpenChange} />;
    case "extend":
      return <ExtendPoDialog salesOrderId={salesOrderId} open onOpenChange={onOpenChange} />;
    case "extend_period":
      return <ExtendRentalSalesOrderDialog salesOrderId={salesOrderId} open onOpenChange={onOpenChange} />;
    case "details":
      return <EnterPoDetailsDialog purchaseOrder={dialog.po} onClose={onClose} />;
    case "decide":
      return <PoDecisionDialog purchaseOrder={dialog.po} decision={dialog.decision} onClose={onClose} />;
    default:
      return null;
  }
}

/** An order's customer POs: the one in force, every extension, the paper
 *  for each, and the Record / Extend PO / Enter PO details actions
 *  (legacy-parity spec §3). */
export function PurchaseOrdersCard({ salesOrderId }: { salesOrderId: string }) {
  const query = useOrderPurchaseOrders(salesOrderId);
  const { canAny } = usePermission();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const canManage = canAny(rentalsCan.managePurchaseOrders);
  const canExtendPeriod = canAny(rentalsCan.extend);
  const canApprove = canAny(rentalsCan.approvePurchaseOrders);
  const data = query.data;
  const items = data?.items ?? [];

  return (
    <Card size="sm">
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <CardTitle>{C.title}</CardTitle>
          <CardDescription>{C.description}</CardDescription>
        </div>
        {data ? (
          <PoHeaderActions
            data={data}
            canManage={canManage}
            canExtendPeriod={canExtendPeriod}
            onOpen={setDialog}
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : query.isError || !data ? (
          <LoadErrorState error={query.error} fallback={C.loadError} compact />
        ) : (
          <>
            <PoSummary data={data} />
            {items.length > 0 ? (
              <ul className="divide-y">
                {items.map((po) => (
                  <PoRow
                    key={po.id}
                    po={po}
                    canManage={canManage}
                    // The requester may decide their own (2026-11-14).
                    canDecide={canApprove && po.status === "pending_approval"}
                    onDecide={(row, decision) => setDialog({ kind: "decide", po: row, decision })}
                    onEnterDetails={(row) => setDialog({ kind: "details", po: row })}
                  />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
      <PoCardDialog salesOrderId={salesOrderId} dialog={dialog} onClose={() => setDialog(null)} />
    </Card>
  );
}
