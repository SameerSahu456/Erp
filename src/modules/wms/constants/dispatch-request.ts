import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

import type {
  DispatchRequestListItem,
} from "../api/dispatch";

// Domain label maps for the REAL dispatch-request API (Coding-guideline §16.12
// bucket 2). The sibling `dispatch-status.ts` describes the older mock status
// vocabulary (Draft / Assembly Pending / …) still used by the legacy /edit
// form; these maps describe the backend's canonical wire values
// (draft / dispatched / delivered / closed / cancelled) used by the real
// listing + detail pages. Types are read straight off the generated schema so
// they can never drift from the backend enum.

type DispatchStatus = DispatchRequestListItem["status"];
type DispatchTypeApi = DispatchRequestListItem["dispatch_type"];
type SourceEntityType = NonNullable<DispatchRequestListItem["source_entity_type"]>;

export const DISPATCH_REQUEST_STATUS_LABELS: Record<DispatchStatus, string> = {
  draft: "Draft",
  dispatched: "Dispatched",
  delivered: "Delivered",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const DISPATCH_REQUEST_STATUS_VARIANT: Record<DispatchStatus, StatusBadgeVariant> = {
  draft: "neutral",
  dispatched: "info",
  delivered: "success",
  closed: "neutral",
  cancelled: "error",
};

export const DISPATCH_TYPE_API_LABELS: Record<DispatchTypeApi, string> = {
  demo_dispatch: "Demo",
  sale_dispatch: "Sales Order",
  staff_issuance: "Staff Issuance",
  replacement_dispatch: "Replacement",
  purchase_return_dispatch: "Purchase Return",
};

export const SOURCE_ENTITY_TYPE_LABELS: Record<SourceEntityType, string> = {
  demo_requests: "Demo Request",
  sales_orders: "Sales Order",
  staff_requests: "Staff Request",
  warehouse_transfers: "Warehouse Transfer",
  replacement_requests: "Replacement Request",
  purchase_returns: "Purchase Return",
};

// The type filter's option list — one entry per backend dispatch_type.
export const DISPATCH_TYPE_OPTIONS = (
  Object.keys(DISPATCH_TYPE_API_LABELS) as DispatchTypeApi[]
).map((value) => ({ value, label: DISPATCH_TYPE_API_LABELS[value] }));

// The status tabs — "all" carries no status filter; the rest map 1:1 to the
// backend `status` query param.
export const DISPATCH_STATUS_TABS: { id: string; status?: DispatchStatus }[] = [
  { id: "all" },
  { id: "draft", status: "draft" },
  { id: "dispatched", status: "dispatched" },
  { id: "delivered", status: "delivered" },
  { id: "closed", status: "closed" },
  { id: "cancelled", status: "cancelled" },
];
