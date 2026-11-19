import { StatusBadge } from "@/components/common/display/StatusBadge";

import {
  WAREHOUSE_TRANSFER_STATUS_LABEL,
  WAREHOUSE_TRANSFER_STATUS_VARIANT,
} from "../../constants/warehouse-transfer-status";
import { TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";

/** Transfer status badge plus an "Overdue" flag when the ETA has passed. */
export function WarehouseTransferStatusCell({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <StatusBadge variant={WAREHOUSE_TRANSFER_STATUS_VARIANT[status] ?? "neutral"}>
        {WAREHOUSE_TRANSFER_STATUS_LABEL[status] ?? status}
      </StatusBadge>
      {isOverdue ? <StatusBadge variant="error">{S.overdueBadge}</StatusBadge> : null}
    </div>
  );
}
