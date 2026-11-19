import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

import type { PurchaseReturnStatus } from "../api";

// Domain label maps (Coding-guideline §16.12 bucket 2): single source for how
// a purchase-return wire status is shown to the user. Shared by the list page
// (badge + tab strip) and the detail header, so the two can never drift —
// previously each page carried its own copy of both maps.

export const PURCHASE_RETURN_STATUS_LABELS: Record<PurchaseReturnStatus, string> = {
  raised: "Raised",
  partially_dispatched: "Partially dispatched",
  dispatched: "Dispatched",
  closed: "Closed",
  cancelled: "Cancelled",
};

// A `raised` return whose units are all decided (undecided_count === 0) but not
// yet shipped is waiting on the warehouse to dispatch it, so it reads "Pending
// Dispatch". The first consignment flips the wire status to
// `partially_dispatched`, so this only fires while still `raised`. Display-only:
// the wire status is unchanged and the badge keeps `raised`'s
// variant. Kept in sync with the copy in purchase-returns.strings.ts.
export const PURCHASE_RETURN_PENDING_DISPATCH_LABEL = "Pending Dispatch";

export function getPurchaseReturnStatusLabel(
  status: PurchaseReturnStatus,
  undecidedCount: number,
): string {
  if (status === "raised" && undecidedCount === 0) {
    return PURCHASE_RETURN_PENDING_DISPATCH_LABEL;
  }
  return PURCHASE_RETURN_STATUS_LABELS[status];
}

export const PURCHASE_RETURN_STATUS_VARIANT: Record<
  PurchaseReturnStatus,
  StatusBadgeVariant
> = {
  raised: "warning",
  partially_dispatched: "warning",
  dispatched: "info",
  closed: "success",
  cancelled: "neutral",
};
