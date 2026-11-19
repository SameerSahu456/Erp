export { WmsRoutes } from "./routes";
// Consumed by procurement's PO form (cross-module via the public barrel).
export { useWarehousesPaged } from "./hooks/warehouses/useWarehouses";
// Consumed by procurement's PO-form warehouse AsyncSelect (useWarehouseOptions).
export { fetchWarehousesPage } from "./api";
// Consumed by the app Sidebar to gate WMS tabs by warehouse capability.
export { useWmsStageAccess } from "./hooks/operations/useStageAccess";
// Consumed by the Sidebar (nav gating) and HomeRedirect (landing pick) —
// the real fine-grained WMS codes; the umbrella wms:read/manage are dead.
export { wmsPermissions, wmsCan } from "./permissions";
// Global warehouse scope — the navbar switcher + the "one warehouse in view"
// state consumed by every WMS list page.
export { WarehouseScopeProvider, useWarehouseScope } from "./context/warehouse-scope";
export { WarehouseScopePicker } from "./components/WarehouseScopePicker";
// Device-dossier origins (`?from=`) → the screen Back returns to. The Sidebar
// reads the same table to keep the originating tab highlighted.
export { DEVICE_ORIGINS, originBackHref } from "./components/devices/device-detail/helpers";

// Consumed by the CRM Sales Order detail document tabs (read-only lists of a
// SO's Material Issues / Dispatch Requests, filtered by source).
export { useMaterialIssues, useMaterialIssue } from "./hooks/material-issue/useMaterialIssues";
export type { MaterialIssueListRow, MaterialIssueLineResponse } from "./api";
export { useDispatchRequestsList } from "./hooks/dispatches/useDispatchRequests";
export { useDispatchLineItems } from "./hooks/dispatches/useDispatchRequest";
export type { DispatchRequestListItem, DispatchLineItem } from "./api/dispatch";

// Stock relocation + warehouse transfer. Consumed by IMS (part detail) through
// this barrel — never via a deep path (CLAUDE.md §7).
export { MoveStockDialog } from "./components/stock-transfer/MoveStockDialog";
export type { MovableUnit, MoveStockDialogProps } from "./components/stock-transfer/move-stock-helpers";
export { isMovableStatus, MOVABLE_STATUSES } from "./components/stock-transfer/move-stock-helpers";
export {
  useWarehouseTransfers,
  useWarehouseTransfer,
  useStockTransferMutations,
} from "./hooks/stock-transfer/useStockTransfer";
export type { TransferResponse, TransferDetailResponse, TransferItemResponse } from "./api";
export { STOCK_TRANSFER_STRINGS } from "./components/stock-transfer/stock-transfer.strings";
export { useVendorServiceNavItems } from "./hooks/vendor-jobs/useVendorServiceNavItems";
export { useServiceSections, useServiceSection, useApplicableSections } from "./hooks/vendor-jobs/useServiceSections";

// The "Rental" tag on a replacement request — the PM approvals queue shows it
// too, so it goes through this barrel (CLAUDE.md §7).
export { RentalOrderTag } from "./components/replacement-requests/RentalOrderTag";

// Replacement-request display labels/variants. Consumed by the Procurement
// PM-approvals Replacement approval panel through this barrel (CLAUDE.md §7).
export {
  ITEM_APPROVAL_LABEL,
  REPLACEMENT_DECISION_LABEL,
  REPLACEMENT_MODE_LABEL,
  REPLACEMENT_PRIORITY_LABEL,
  REPLACEMENT_PRIORITY_VARIANT,
  REPLACEMENT_STATUS_LABEL,
  REPLACEMENT_STATUS_VARIANT,
} from "./constants/replacement-request-status";
export type {
  ItemApprovalStatus,
  ReplacementDecision,
  ReplacementMode,
  ReplacementPriority,
  ReplacementRequestStatus,
} from "./constants/replacement-request-status";

// Sales-return display labels/variants — same consumer (PM-approvals Sales
// Return approval panel), same barrel rule.
export {
  SALES_RETURN_APPROVAL_LABEL,
  SALES_RETURN_REASON_LABEL,
  SALES_RETURN_STATUS_LABEL,
  SALES_RETURN_STATUS_VARIANT,
} from "./constants/sales-return-status";
export type {
  SalesReturnLineApproval,
  SalesReturnReason,
  SalesReturnStatus,
} from "./constants/sales-return-status";

// Consumed by the Procurement PO detail tabs (GRNs / Devices received against
// one PO), through this barrel (CLAUDE.md §7).
export { useGrnBatches } from "./hooks/inwards/useInwards";
export { useDevices, useDeviceStats } from "./hooks/devices/useDevices";
export { useEngineersAcrossWarehousesOptions } from "./hooks/warehouses/useWarehouseTeam";
export type { GrnBatchListItem, DeviceSummary } from "./api";
export { GRN_STATUS_LABELS, GRN_STATUS_VARIANT } from "./constants/inward";
export {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  WORKFLOW_LABELS,
  workflowStageBadge,
} from "./components/devices/deviceLabels";

// Domain types used by CRM and Procurement, exported via the barrel (CLAUDE.md §7).
export type { VariantCondition, PurchaseType, StockVariant, BOMItem } from "./types";

// Consumed by IMS stock adjustments (warehouse picker, rack→bin cascade,
// label PDF preview) through this barrel (CLAUDE.md §7).
export { useWarehouseFilterOptions } from "./hooks/warehouses/useWarehouses";
export { RackBinLocationPicker } from "./components/shared/RackBinLocationPicker";
// The numbered step card + fact cells every detail/form page shares; IMS reuses them.
export { DetailFact, FactGrid, SectionCard, SectionHeader } from "./components/shared/section-primitives";
export { LabelPreviewDialog } from "./components/work-assignments/LabelPreviewDialog";
export { toPrintResult, type LabelPrintResult } from "./api/work-assignments";
