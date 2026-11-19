import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";
import type { GrnBatchStatus, InwardType } from "../api";

// ─── Inward / GRN display maps (single source for list + detail + wizard) ─────
// Backend stores these as snake_case DB-CHECK codes; the UI title-cases them.

export const INWARD_TYPE_LABELS: Record<InwardType, string> = {
  purchase_order: "Purchase Order",
  sale_return: "Sale Return",
  rental_return: "Rental Return",
  demo_return: "Demo Return",
  staff_return: "Staff Return",
  replacement_return: "Replacement Return",
  warehouse_transfer_inward: "Warehouse Transfer",
};

export const INWARD_TYPE_VARIANT: Record<InwardType, StatusBadgeVariant> = {
  purchase_order: "info",
  sale_return: "success",
  rental_return: "success",
  demo_return: "neutral",
  staff_return: "warning",
  replacement_return: "warning",
  warehouse_transfer_inward: "success",
};

// `open` is the in-progress state, shown to the operator as "Draft";
// `closed` is the finished state → "Completed".
export const GRN_STATUS_LABELS: Record<GrnBatchStatus, string> = {
  open: "Draft",
  closed: "Completed",
  cancelled: "Cancelled",
};

export const GRN_STATUS_VARIANT: Record<GrnBatchStatus, StatusBadgeVariant> = {
  open: "neutral",
  closed: "success",
  cancelled: "error",
};

// grn_line_items.status — received | accepted | hold | rejected
export const GRN_LINE_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  received: "info",
  accepted: "success",
  hold: "warning",
  rejected: "error",
};

// Operator-facing labels for the received-line status (the raw code is
// lowercase; never render it directly).
export const GRN_LINE_STATUS_LABELS: Record<string, string> = {
  received: "Received",
  accepted: "Accepted",
  hold: "On Hold",
  rejected: "Rejected",
};
