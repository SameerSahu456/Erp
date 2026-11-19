import { WarehouseTransferDetailBody } from "../../components/stock-transfer/WarehouseTransferDetailBody";

// Thin route wrapper — layout in WarehouseTransferDetailBody, receive-panel
// state in useTransferReceive (thin-controller pattern).
export function WarehouseTransferDetailPage() {
  return <WarehouseTransferDetailBody />;
}

export default WarehouseTransferDetailPage;
