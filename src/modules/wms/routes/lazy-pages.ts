import { lazy } from "react"

// Lazy page chunks in a .ts file so route files declare no components (react-refresh).

export const WmsDashboard = lazy(() => import("../pages/dashboard/WmsDashboard"))
export const StageChecklistReportPage = lazy(
  () => import("../pages/reports/StageChecklistReportPage"),
)
export const WarehouseTransfersPage = lazy(
  () => import("../pages/stock-transfer/WarehouseTransfersPage"),
)
export const MoveStockPage = lazy(() => import("../pages/stock-transfer/MoveStockPage"));
export const WarehouseTransferDetailPage = lazy(
  () => import("../pages/stock-transfer/WarehouseTransferDetailPage"),
)
export const InwardPage = lazy(() => import("../pages/inwards/InwardPage"))
export const InwardFormPage = lazy(() => import("../pages/inwards/InwardFormPage"))
export const RentalScanPage = lazy(() => import("../pages/inwards/RentalScanPage"))
export const InwardExceptionsPage = lazy(() => import("../pages/inward-exceptions/InwardExceptionsPage"))
export const InwardExceptionDetailPage = lazy(
  () => import("../pages/inward-exceptions/InwardExceptionDetailPage"),
)
export const BatchDevicesPage = lazy(() => import("../pages/inwards/BatchDevicesPage"))
export const InspectionPage = lazy(() => import("../pages/inspection/InspectionPage"))
export const ScrapPlacementQueuePage = lazy(
  () => import("../pages/scrap/ScrapPlacementQueuePage"),
)
export const RepairPage = lazy(() => import("../pages/repair/RepairPage"))
export const VendorJobsPage = lazy(() => import("../pages/vendor-jobs/VendorJobsPage"))
export const ServiceVendorsPage = lazy(() => import("../pages/vendor-jobs/ServiceVendorsPage"))
export const ServiceSectionsPage = lazy(() => import("../pages/vendor-jobs/ServiceSectionsPage"))
export const WorkAssignmentsPage = lazy(
  () => import("../pages/work-assignments/WorkAssignmentsPage"),
)
export const WorkAssignmentIssuePage = lazy(
  () => import("../pages/work-assignments/WorkAssignmentIssuePage"),
)
export const WorkAssignmentDetailPage = lazy(
  () => import("../pages/work-assignments/WorkAssignmentDetailPage"),
)
export const QCPage = lazy(() => import("../pages/qc/QCPage"))
export const InventoryPage = lazy(() => import("../pages/inventory/InventoryPage"))
export const DispatchListPage = lazy(() => import("../pages/dispatches/DispatchListPage"))
export const DispatchDetailPage = lazy(() => import("../pages/dispatches/DispatchDetailPage"))
export const DispatchCreatePage = lazy(() => import("../pages/dispatches/DispatchCreatePage"))
export const ChecklistTemplatesPage = lazy(
  () => import("../pages/checklist-templates/ChecklistTemplatesPage"),
)
export const ChecklistTemplateFormPage = lazy(
  () => import("../pages/checklist-templates/ChecklistTemplateFormPage"),
)
export const ChecklistTemplatePreviewPage = lazy(
  () => import("../pages/checklist-templates/ChecklistTemplatePreviewPage"),
)
export const WarehouseLocationsPage = lazy(
  () => import("../pages/warehouses/WarehouseLocationsPage"),
)
export const WarehousesPage = lazy(() => import("../pages/warehouses/WarehousesPage"))
export const WarehouseFormPage = lazy(() => import("../pages/warehouses/WarehouseFormPage"))
export const WarehouseTeamPage = lazy(() => import("../pages/warehouses/WarehouseTeamPage"))
export const BOMListPage = lazy(() => import("../pages/bom/BOMListPage"))
export const BOMDetailPage = lazy(() => import("../pages/bom/BOMDetailPage"))
export const RelatedPartsPage = lazy(() => import("../pages/bom/RelatedPartsPage"))
export const WorkOrderListPage = lazy(() => import("../pages/work-orders/WorkOrderListPage"))
export const WorkOrderDetailPage = lazy(() => import("../pages/work-orders/WorkOrderDetailPage"))
export const ComponentMovementHistoryPage = lazy(
  () => import("../pages/work-orders/ComponentMovementHistoryPage"),
)
export const SparesPage = lazy(() => import("../pages/spares/SparesPage"))
export const AssignToRackPage = lazy(() => import("../pages/devices/AssignToRackPage"))
export const DeviceDetailPage = lazy(() => import("../pages/devices/DeviceDetailPage"))
export const DevicesAssignmentPage = lazy(
  () => import("../pages/devices/DevicesAssignmentPage"),
)
export const ReplacementRequestsPage = lazy(
  () => import("../pages/replacement-requests/ReplacementRequestsPage"),
)
export const ReplacementRequestFormPage = lazy(
  () => import("../pages/replacement-requests/ReplacementRequestFormPage"),
)
export const ReplacementRequestDetailPage = lazy(
  () => import("../pages/replacement-requests/ReplacementRequestDetailPage"),
)
export const SalesReturnRequestsPage = lazy(
  () => import("../pages/sales-return-requests/SalesReturnRequestsPage"),
)
export const SalesReturnRequestFormPage = lazy(
  () => import("../pages/sales-return-requests/SalesReturnRequestFormPage"),
)
export const SalesReturnRequestDetailPage = lazy(
  () => import("../pages/sales-return-requests/SalesReturnRequestDetailPage"),
)
export const RentalReturnRequestsPage = lazy(
  () => import("../pages/rental-return-requests/RentalReturnRequestsPage"),
)
export const RentalReturnRequestFormPage = lazy(
  () => import("../pages/rental-return-requests/RentalReturnRequestFormPage"),
)
export const RentalReturnRequestDetailPage = lazy(
  () => import("../pages/rental-return-requests/RentalReturnRequestDetailPage"),
)
export const PurchaseReturnsPage = lazy(
  () => import("../pages/purchase-returns/PurchaseReturnsPage"),
)
export const PurchaseReturnFormPage = lazy(
  () => import("../pages/purchase-returns/PurchaseReturnFormPage"),
)
export const PurchaseReturnDetailPage = lazy(
  () => import("../pages/purchase-returns/PurchaseReturnDetailPage"),
)
export const MaterialIssueFormPage = lazy(
  () => import("../pages/material-issue/MaterialIssueFormPage"),
)
export const MaterialIssueDetailPage = lazy(
  () => import("../pages/material-issue/MaterialIssueDetailPage"),
)
export const MaterialIssueLinesPage = lazy(
  () => import("../pages/material-issue/MaterialIssueLinesPage"),
)
