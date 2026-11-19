import { type StatusBadgeVariant } from "@/components/common/display/StatusBadge";

/**
 * Warehouse-transfer status → human label + badge variant.
 *
 * One map, used by BOTH the list and the detail page (RULE ZERO / §7). The
 * label is what the user sees (§0.18 / §18); the raw enum is never shown.
 */
export const WAREHOUSE_TRANSFER_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_transit: "In transit",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

export const WAREHOUSE_TRANSFER_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  draft: "neutral",
  in_transit: "info",
  partially_received: "warning",
  received: "success",
  cancelled: "neutral",
};

/** Per-unit (line) status within a transfer → label + variant. */
export const TRANSFER_LINE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  sent: "In transit",
  received: "Received",
  lost: "Lost",
  returned_to_source: "Returned to source",
};

export const TRANSFER_LINE_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  pending: "neutral",
  sent: "info",
  received: "success",
  lost: "error",
  returned_to_source: "warning",
};

/** Stock condition → human label (units carry the raw enum). */
export const STOCK_CONDITION_LABEL: Record<string, string> = {
  new: "New",
  refurbished: "Refurbished",
  new_pull: "New (pull)",
};
