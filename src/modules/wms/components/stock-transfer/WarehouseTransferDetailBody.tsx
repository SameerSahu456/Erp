import { useParams } from "react-router-dom";

import { DetailPageShell } from "@/components/page-shells";
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
import { asUuid } from "@shared/lib/validation";
import { useRecordLabel } from "@shared/routing/record-label";
import {
  WAREHOUSE_TRANSFER_STATUS_LABEL,
  WAREHOUSE_TRANSFER_STATUS_VARIANT,
} from "../../constants/warehouse-transfer-status";
import { useWarehouseTransfer } from "../../hooks/stock-transfer/useStockTransfer";
import {
  useTransferReceive,
  type TransferReceiveState,
} from "../../hooks/stock-transfer/useTransferReceive";
import { TransferDocumentsSection } from "./TransferDocumentsSection";
import { TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";
import { TRANSFERS_BACK_HREF, transferRoute } from "./transfer-detail-helpers";
import { WarehouseTransferDetailFallback } from "./WarehouseTransferDetailFallback";
import { TransferConsignmentCard, TransferOverviewCard } from "./TransferOverviewCards";
import { TransferReceiveCard } from "./TransferReceiveCard";

function LostConfirmDialog({ receive }: { receive: TransferReceiveState }) {
  const { lostTarget } = receive;
  return (
    <ConfirmDialog
      open={lostTarget != null}
      onOpenChange={(open) => !open && receive.cancelLost()}
      title={S.lostConfirmTitle}
      description={lostTarget ? S.lostConfirmBody(lostTarget.label) : ""}
      confirmLabel={S.markLost}
      variant="destructive"
      onConfirm={receive.commitLost}
    />
  );
}

/** Transfer detail: overview, consignment, attachments and the receive card
 *  (Place primary, Inspection secondary — D11). */
export function WarehouseTransferDetailBody() {
  // §11.1: a malformed id becomes "" so the query stays disabled and not-found renders.
  const { transferId: rawTransferId = "" } = useParams<{ transferId: string }>();
  const transferId = asUuid(rawTransferId) ?? "";
  const label = useRecordLabel();
  const query = useWarehouseTransfer(transferId);
  const receive = useTransferReceive();

  const transfer = query.data;
  if (query.isLoading || query.isError || !transfer) {
    return <WarehouseTransferDetailFallback query={query} recordLabel={label} />;
  }

  const items = transfer.items ?? [];
  const route = transferRoute(transfer);
  // Only present once the consignment has actually been sent.
  const logistics = transfer.delivery_details ?? null;

  return (
    <DetailPageShell
      title={transfer.transfer_number}
      subtitle={route}
      backHref={TRANSFERS_BACK_HREF}
      status={{
        label: WAREHOUSE_TRANSFER_STATUS_LABEL[transfer.status] ?? transfer.status,
        variant: WAREHOUSE_TRANSFER_STATUS_VARIANT[transfer.status] ?? "neutral",
      }}
    >
      <div className="space-y-6">
        <TransferOverviewCard transfer={transfer} route={route} />
        {logistics ? <TransferConsignmentCard logistics={logistics} /> : null}
        <TransferDocumentsSection transferId={transferId} />
        <TransferReceiveCard receive={receive} items={items} toWarehouseId={transfer.to_warehouse_id} />
      </div>

      <LostConfirmDialog receive={receive} />
    </DetailPageShell>
  );
}
