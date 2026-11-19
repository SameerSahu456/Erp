export {
  procurementPermissions,
  procurementCan,
  procurementCanAll,
  procurementCanAnyRead,
} from "./permissions";

// ── Vendors (procurement master) ─────────────────────────────────
export {
  useVendors,
  useVendor,
  useVendorOptions,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from "./hooks/vendors/useVendors";
export type {
  Vendor,
  VendorListItem,
  VendorStatus,
  VendorCreatePayload,
  VendorUpdatePayload,
  FetchVendorsParams,
} from "./api";

// ── Material-Inquiry vendor responses (procurement-side) ─────────
export {
  useMIResponsesForItem,
  useMIResponse,
  useAddMIResponse,
  useDeleteMIResponse,
  useMyPMQueue,
  useMIProcurementDetail,
  useApproveMIResponse,
  useRejectMIResponse,
} from "./hooks/pm-approvals/useMIResponses";
export type {
  MIResponseFullViewWire,
  MIResponseAddPayload,
  MIResponsePMStatus as ProcMIResponsePMStatus,
  VendorEmbedOnResponseWire,
  PMQueueInquiryWire,
  MIProcurementDetailWire,
  ItemProcurementViewWire,
  LeadEmbedOnInquiryWire,
  ResponseSummaryWire,
  MIResponsePMApprovePayload,
  MIResponsePMRejectPayload,
  OpportunityType,
} from "./api";

// ── Purchase Orders (picker hook consumed by WMS purchase-return form) ──
export {
  usePurchaseOrderOptions,
  useReturnablePurchaseOrderOptions,
  usePurchaseOrder,
  purchaseOrderKeys,
} from "./hooks/purchase-orders/usePurchaseOrders";
export type { PurchaseOrderListItem } from "./api";

export { ProcurementRoutes } from "./routes";
