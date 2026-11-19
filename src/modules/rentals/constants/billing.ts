import type {
  BillingMode,
  BillingType,
  InvoicingMode,
  RentalDisplayStatus,
} from "../api/agreements";
import type { DeviceDisplayStatus, ReplacementStatus } from "../api/devices";
import type {
  PoInvoicing,
  PoState,
  RentalPurchaseOrder,
} from "../api/purchase-orders";

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

// Domain label maps (Coding-guideline §16.12 bucket 2): the single source
// for how a rentals wire value is shown. The wire values are lowercase and
// hyphenated because they mirror the DB CHECK constraints; nothing but
// these maps should decide what the user reads.

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-yearly": "Half-yearly",
  yearly: "Yearly",
  custom: "Custom (days)",
};

export const BILLING_TYPES: readonly BillingType[] = [
  "monthly",
  "quarterly",
  "half-yearly",
  "yearly",
  "custom",
] as const;

export const BILLING_MODE_LABELS: Record<BillingMode, string> = {
  post: "Post (arrears)",
  pre: "Pre (advance)",
};

export const BILLING_MODES: readonly BillingMode[] = ["post", "pre"] as const;

/** The same two values as a SENTENCE fragment, for one-line readings of a
 *  cadence ("monthly, billed in arrears"). `BILLING_MODE_LABELS` is the
 *  field label — "Post (arrears)" / "Pre (advance)", rental-billing's own
 *  wording — which is right in a dropdown and clumsy in prose. */
export const BILLING_MODE_PHRASES: Record<BillingMode, string> = {
  post: "billed in arrears",
  pre: "billed in advance",
};

export const INVOICING_MODE_LABELS: Record<InvoicingMode, string> = {
  "per-so": "Per Sales Order",
  consolidated: "Consolidated",
};

export const PO_INVOICING_LABELS: Record<PoInvoicing, string> = {
  multiple: "Multiple Invoice",
  single: "Single Invoice",
};

export const PO_INVOICING_MODES: readonly PoInvoicing[] = ["multiple", "single"] as const;

/** The customer's PO document: one paper per PO row, so each extension keeps
 *  its own. The accept list is the backend policy's document bucket. */
export const PO_DOCUMENT = {
  entityType: "rental_purchase_orders",
  documentType: "customer_po",
  accept: "application/pdf,image/jpeg,image/png",
} as const;

/** PO statuses that mean an order is already on a PO — in force, awaited, or
 *  an extension waiting for approval. Record PO no longer applies, and PO
 *  Required cannot be cleared (the server refuses it). */
export const PO_OPEN_STATUSES: ReadonlySet<RentalPurchaseOrder["status"]> = new Set([
  "active",
  "awaiting",
  "pending_approval",
]);

/** Every PO standing, in the order the filter offers them. The "PO renewals
 *  due" tab sends all of them: each one needs someone to act on the PO. */
export const PO_STATES: readonly PoState[] = ["po_required", "po_awaiting", "po_overdue"] as const;

/** The order's PO standing — the badge on the agreements list and page. */
export const PO_STATE_LABELS: Record<PoState, string> = {
  po_required: "PO Required",
  po_awaiting: "Awaiting PO",
  po_overdue: "PO Overdue",
};

export const PO_STATE_VARIANT: Record<PoState, StatusBadgeVariant> = {
  po_required: "warning",
  po_awaiting: "warning",
  po_overdue: "error",
};

export const PO_STATUS_LABELS: Record<RentalPurchaseOrder["status"], string> = {
  active: "Active",
  pending_approval: "Pending approval",
  rejected: "Rejected",
  awaiting: "Awaiting PO",
};

export const PO_STATUS_VARIANT: Record<RentalPurchaseOrder["status"], StatusBadgeVariant> = {
  active: "success",
  pending_approval: "warning",
  rejected: "neutral",
  awaiting: "warning",
};

export const PO_KIND_LABELS: Record<RentalPurchaseOrder["kind"], string> = {
  initial: "First PO",
  extension: "Extension",
};

export const INVOICING_MODES: readonly InvoicingMode[] = [
  "per-so",
  "consolidated",
] as const;

/** Inbound transit days not charged. 0 = settle at warehouse arrival,
 *  which is the backend default and keeps the previous behaviour. */
export const RETURN_GRACE_DEFAULT = 0;

export const RENTAL_STATUS_LABELS: Record<RentalDisplayStatus, string> = {
  Draft: "Draft",
  PendingSignature: "Awaiting approval",
  Active: "Ready to dispatch",
  PartiallyDispatched: "Partially dispatched",
  Dispatched: "Dispatched",
  "On Rent": "On rent",
  Hold: "On hold",
  PartiallyReturned: "Partially returned",
  Returned: "Returned",
  Closed: "Closed",
  Terminated: "Terminated",
  Alert: "Alert",
  Overdue: "Overdue",
};

export const RENTAL_STATUS_VARIANT: Record<
  RentalDisplayStatus,
  StatusBadgeVariant
> = {
  // Nothing has shipped, so nothing is earning. Draft reads as inactive;
  // PendingSignature is a WARNING because it is the state that BLOCKS
  // dispatch — someone has to approve it before goods can go out, and a
  // neutral badge would hide that from the person who can unblock it.
  Draft: "neutral",
  PendingSignature: "warning",
  Active: "info",
  // Goods are moving but rent has not started.
  PartiallyDispatched: "info",
  Dispatched: "info",
  "On Rent": "success",
  Hold: "warning",
  PartiallyReturned: "warning",
  Returned: "neutral",
  Closed: "neutral",
  Terminated: "neutral",
  Alert: "warning",
  Overdue: "error",
};

/** Tone per replacement status. A swap in progress is INFO, not a
 *  warning — nothing is wrong with it, it is simply unfinished. */
export const REPLACEMENT_STATUS_VARIANT: Record<
  ReplacementStatus,
  StatusBadgeVariant
> = {
  pending: "info",
  confirmed: "success",
  cancelled: "neutral",
};

export const DEVICE_STATUS_LABELS: Record<DeviceDisplayStatus, string> = {
  "On Rent": "On rent",
  Hold: "On hold",
  Replacement: "Replacement",
  Returned: "Returned",
  Billed: "Settled",
  Lost: "Lost",
  Sold: "Sold to customer",
  Alert: "Alert",
  Overdue: "Overdue",
};

export const DEVICE_STATUS_VARIANT: Record<
  DeviceDisplayStatus,
  StatusBadgeVariant
> = {
  "On Rent": "success",
  Hold: "warning",
  Replacement: "info",
  Returned: "neutral",
  Billed: "neutral",
  Lost: "error",
  Sold: "neutral",
  Alert: "warning",
  Overdue: "error",
};

/** A unit Terminate settled while the box is still at the customer's
 *  (`awaiting_pickup`). Overrides the stored Returned / Settled, which
 *  would otherwise read as if the machine were already back. */
export const DEVICE_AWAITING_PICKUP = {
  label: "Awaiting pickup",
  variant: "warning",
} as const satisfies { label: string; variant: StatusBadgeVariant };

/** The badge a unit shows: its display status, or "Awaiting pickup". */
export function deviceStatusBadge(
  status: DeviceDisplayStatus,
  awaitingPickup: boolean | undefined,
): { label: string; variant: StatusBadgeVariant } {
  if (awaitingPickup) return DEVICE_AWAITING_PICKUP;
  return { label: DEVICE_STATUS_LABELS[status], variant: DEVICE_STATUS_VARIANT[status] };
}

/** Day-of-month bounds. 29–31 are legal and clamped per month by the
 *  billing grid, never stored pre-clamped. */
export const DAY_OF_MONTH_MIN = 1;
export const DAY_OF_MONTH_MAX = 31;

/** Billing-grace bounds, mirroring the API's `ge=0, le=365`. */
export const BILLING_GRACE_MIN = 0;
export const BILLING_GRACE_MAX = 365;
/** What a newly configured order starts from — the backend's
 *  `DEFAULT_BILLING_GRACE_DAYS`. */
export const BILLING_GRACE_DEFAULT = 7;
