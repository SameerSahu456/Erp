export { crmPermissions, crmCan, crmCanAll } from "./permissions";

// Sales Orders — public surface (CRUD + calculate preview + per-line
// approval surface used by /procurement/pm-approvals "Sales Orders" tab).
export {
  useSalesOrders,
  useSalesOrdersInfinite,
  useSalesOrder,
  useSalesOrderCalculate,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useDeleteSalesOrder,
  useSubmitSalesOrder,
  useMyPendingSalesOrders,
  useSalesOrderApprovalDetail,
  useApproveSalesOrderLine,
  useRejectSalesOrderLine,
  useReassignSalesOrderLine,
} from "./hooks/sales-orders/useSalesOrders";

export { SalesOrderApprovalRow } from "./components/sales-orders/SalesOrderApprovalRow";
export { SO_STATUS_LABELS, SO_STATUS_VARIANT } from "./constants/so-status";
export { QUOTE_STATUS_LABELS, QUOTE_STATUS_VARIANT } from "./constants/quote-status";
export { SalesOrderApprovalDetailPanel } from "./components/sales-orders/SalesOrderApprovalDetailPanel";
// The sales order detail layout, reusable outside the CRM route — the rentals
// agreement page renders it with its own header actions and tabs.
export {
  SalesOrderDetailView,
  type SalesOrderDetailViewProps,
} from "./components/sales-orders/detail/SalesOrderDetailView";
export type { SoAttachmentGroup } from "./components/sales-orders/detail/SoAttachmentSections";
export type { SoDetailHeaderOverrides } from "./components/sales-orders/detail/SoDetailHeader";
// Audit-diff value renderer: resolves FK ids (owner, category, oem, …) to human
// names and hides raw UUIDs. Reused by the Settings User Activity Log so its
// diff reads exactly like the CRM leads/deals audit trail.
export { DiffValue } from "./components/shared/AuditResolvedName";
export { isUnresolvableReference } from "./components/shared/auditTrailHelpers";
// Reusable part-line UI (variant picker + free-text name/description) — also
// consumed by procurement PO create so both build line items identically.
export { PartLineFields, PartCombobox } from "./components/shared/PartLineFields";
export type { PickedPart, PartLineFieldsValue } from "./components/shared/PartLineFields";
export {
  ApproveLineDialog,
  RejectLineDialog,
  ReassignLineDialog,
} from "./components/sales-orders/SalesOrderApprovalDialogs";

export type {
  SOStatus,
  SOLineStatus,
  SOSellableType,
  SOConfigAction,
  SORentalPeriod,
  SOOrderableType,
  SalesOrderItemWire,
  SalesOrderViewerContext,
  SalesOrderWire,
  SalesOrderListItemWire,
  SalesOrdersListResponse,
  FetchSalesOrdersParams,
  SalesOrderAddressData,
  SalesOrderItemCreatePayload,
  SalesOrderItemUpsertPayload,
  SalesOrderCreatePayload,
  SalesOrderUpdatePayload,
  SalesOrderCalculateLinePayload,
  SalesOrderCalculateRequest,
  SalesOrderCalculateLineResponseWire,
  SalesOrderCalculateResponseWire,
  LineApproveBody,
  LineRejectBody,
  LineReassignBody,
} from "./api";

export {
  SO_LINE_NOTES_MAX,
  SO_REASSIGN_REASON_MAX,
} from "./api";

export {
  useDemoRequests,
  useDemoRequestsInfinite,
  usePendingDemoRequestsForPM,
  useDemoRequest,
  useCreateDemoRequest,
  useApproveDemoRequestItems,
  useRejectDemoRequestItems,
  useConvertDemoRequestToOrder,
} from "./hooks/demo-requests/useDemoRequests";

// Activities — public surface (Tier-2 user log + Tier-1 system feed).
// Backend allow-list currently covers lead/deal only; account/contact will
// 400 until the backend opens up.
export { useActivities, useLogActivity } from "./hooks/shared/useActivities"

// User Activity Log — aggregated per-user feed (Settings › Users consumes this).
export {
  useUserActivityLogInfinite,
  useUserActivityLogPage,
  USER_ACTIVITY_PAGE_SIZE,
} from "./hooks/shared/useUserActivityLog"
export type {
  UserActivityLogItem,
  UserActivityLogPage,
  ActivityLogTab,
  ActivityLogSource,
  ActivityLogEntityType,
} from "./api/activity-log"
export {
  resolveActivityLogHref,
  ENTITY_NAV as ACTIVITY_LOG_ENTITY_NAV,
  ACTIVITY_LOG_HASH_PREFIX,
} from "./components/shared/activityLogNavigation"

export {
  ACTIVITY_LOG_TYPES,
  ACTIVITY_OUTCOMES,
} from "./api"

export type {
  ActivityEntityType,
  ActivityLogType,
  ActivityTier,
  ActivityDirection,
  ActivityWire,
  ActivityListWire,
  FetchActivitiesParams,
  LogActivityInput,
} from "./api"

export type {
  DemoRequestSource,
  DemoRequestStatusWire,
  DemoRequestItemPMStatus,
  DemoRequestReturnCondition,
  DemoRequestItemCreatePayload,
  DemoRequestItemUpdatePayload,
  DemoRequestCreatePayload,
  DemoRequestItemWire,
  DemoRequestListItemWire,
  DemoRequestWire,
  DemoRequestsListResponse,
  FetchDemoRequestsParams,
  DemoRequestItemApproveBody,
  DemoRequestItemRejectBody,
} from "./api";

// Account option picker — consumed by WMS list filters (e.g. the Sales Return
// customer filter) through this barrel, the sanctioned cross-module path.
export { useAccountOptions, useAccountNames } from "./hooks/accounts/useAccounts";

export {
  useReplacementRequests,
  useReplacementRequestsPendingPM,
  useReplacementRequestCounts,
  useReplacementRequestsInfinite,
  useReplacementRequest,
  useReplacementEligibleSourcesInfinite,
  useReplacementSourceOrdersInfinite,
  useReplacementEligibleItems,
  useReplacementEligibleUnits,
  useReplacementEligibleUnitComponents,
  useSalesOrderReplacementRollup,
  useCreateReplacementRequest,
  useApproveReplacementItem,
  useApproveReplacementItems,
  useRejectReplacementItem,
  useReassignReplacementItem,
  usePatchReplacementRequest,
  useReplacementApproverCandidates,
  useWaiveReplacementReturn,
  useMarkReplacementItemNotNeeded,
  useChangeReplacementItemOutcome,
  useCancelReplacementRequest,
} from "./hooks/replacement-requests/useReplacementRequests";

export {
  useSalesReturnRequests,
  useSalesReturnRequestsPendingPM,
  useSalesReturnRequest,
  useSalesReturnRequestCounts,
  useSalesReturnEligibleSourcesInfinite,
  useSalesReturnSourceOrdersInfinite,
  useSalesReturnEligibleUnits,
  useCreateSalesReturnRequest,
  useDecideSalesReturnRequestItems,
  useCancelSalesReturnRequest,
  usePatchSalesReturnRequest,
  useReassignSalesReturnRequestPM,
} from "./hooks/sales-return-requests/useSalesReturnRequests";

export {
  useRentalReturnRequests,
  useRentalReturnRequestsPendingPM,
  useRentalReturnRequest,
  useRentalReturnRequestCounts,
  useRentalReturnEligibleSourcesInfinite,
  useRentalReturnEligibleUnits,
  useRentalReturnEligibleVariants,
  useCreateRentalReturnRequest,
  useCloseShortRentalReturnRequest,
  useDecideRentalReturnRequestItems,
  useCancelRentalReturnRequest,
  usePatchRentalReturnRequest,
  useReassignRentalReturnRequestPM,
} from "./hooks/rental-return-requests/useRentalReturnRequests";
// The return form's customer picker (2026-11-16).
export { useRentalReturnEligibleAccountOptions } from "./hooks/rental-return-requests/useRentalReturnEligibleAccounts";

export type {
  SalesReturnRequestWire,
  SalesReturnRequestItemWire,
  SalesReturnEligibleUnitWire,
  SalesReturnEligibleSourceWire,
  SalesReturnSourceOrderWire,
} from "./api/sales-return-requests";

export type {
  RentalReturnRequestWire,
  RentalReturnRequestItemWire,
  RentalReturnEligibleUnitWire,
  RentalReturnEligibleSourceWire,
  RentalReturnEligibleVariantWire,
  RentalReturnVariantOrderWire,
} from "./api/rental-return-requests";

export type {
  ReplacementRequestListItemWire,
  ReplacementRequestWire,
  ReplacementRequestItemWire,
  ReplacementApproverCandidateWire,
  ReplacementRequestPatchWire,
  ReplacementRequestCreateWire,
  ReplacementEligibleItemWire,
  DispatchedUnitWire,
  DispatchedUnitComponentWire,
  SalesOrderForReplacementRowWire,
  SalesOrderWithReplacementRowWire,
  SalesOrderReplacementRollupRowWire,
  ReplacementRequestsListResponse,
  FetchReplacementRequestsParams,
} from "./api";
// Accounts list surface. Exported because the Rentals module renders the
// SAME list, filtered to accounts with rental involvement — one table, one
// controller, so the two pages cannot drift in columns, filters or
// permissions. Cross-module consumers import from here, never from
// `crm/components/...` (Coding-guideline §7).
export { AccountsTable } from "./components/accounts/AccountsTable";
// The CRM-owned data table. Every rentals list page renders THIS, so
// dropdowns, filters, sorting, the pager and the empty/error states are
// one implementation across both modules rather than two that drift.
export { CrmDataTable } from "./components/shared/CrmDataTable";
export type {
  CellFormatter,
  ColumnDef,
  SortDirection,
  TabConfig,
} from "./components/shared/crm-data-table/types";
export { CrmListState } from "./components/shared/CrmListState";
export { useAccountsList } from "./hooks/accounts/useAccountsList";
// One account by id — used by rentals to name the customer on the sales
// order's Configure page. Read for DISPLAY only, so callers pass
// `bypassAccess: true`: an operator who may configure the order's billing
// should see whose order it is even without per-record account access.
export { useAccount } from "./hooks/accounts/useAccounts";
// Paginated, debounced account options for an AsyncSelect picker.
export type { UseAccountsListOptions } from "./hooks/accounts/useAccountsList";

// Paginated, debounced, ACCOUNT-SCOPED contact options for a picker.
// Rentals needs it to name the customer-side signatory on a rental
// agreement: the signature stores a `signatory_contact_id`, and the only
// contacts that make sense are the agreement's own account's.
export { useContactOptions } from "./hooks/contacts/useContacts";

export { CrmRoutes } from "./routes";

// Category approvers (approval.md T3) — consumed by the IMS Category
// detail page, kept in CRM because the approver concept is scoped to
// CRM/procurement flows.
export {
  CategoryApproversTab,
  CATEGORY_APPROVERS_SCOPE,
} from "./components/category-approvers/CategoryApproversTab";
export { useCategoryApproversCount } from "./hooks/category-approvers/useCategoryApprovers";
export { CATEGORY_APPROVERS_STRINGS } from "./components/category-approvers/category-approvers.strings";
export type {
  ApprovalScope,
  CategoryApproverWire,
  EligibleApproverWire,
} from "./api/category-approvers";

// Quote approvals inbox (approval.md T6/T8) — consumed by the
// Procurement PM Approvals page as a new "Quotes" tab.
export { QuoteApprovalRow } from "./components/quote-approvals/QuoteApprovalRow";
export { QuoteApprovalDetailPanel } from "./components/quote-approvals/QuoteApprovalDetailPanel";
export { QUOTE_APPROVALS_STRINGS } from "./components/quote-approvals/quote-approvals.strings";
export { useQuote } from "./hooks/quotes/useQuotes";
export {
  useMyPendingQuotes,
  useApproveQuoteItem,
  useRejectQuoteItem,
} from "./hooks/quote-approvals/useQuoteApprovals";
export type {
  QuoteApprovalPendingQuoteWire,
  QuoteApprovalPendingItemWire,
} from "./api/quote-approvals";

// Query-key roots other modules invalidate after their own writes (§16.9.1).
export { deficiencyKeys } from "./hooks/deficiencies/useDeficiencies"
export { rentalReturnRequestKeys } from "./hooks/rental-return-requests/useRentalReturnRequests"
