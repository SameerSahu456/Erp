import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

import { isForbidden, isNotFound } from "@shared/api/envelope";

import type {
  DeliveryDetails as ApiDeliveryDetails,
  DispatchLineItem,
  DispatchRequest,
} from "../../api/dispatch";
import {
  DISPATCH_REQUEST_STATUS_LABELS,
  DISPATCH_REQUEST_STATUS_VARIANT,
  DISPATCH_TYPE_API_LABELS,
} from "../../constants/dispatch-request";
import { DISPATCH_MODES, FREIGHT_PAID_BY } from "./dispatch-detail.strings";

// Picked from the generated schema to keep enum types. `delivery_date` is YYYY-MM-DD.
export type DeliveryDetails = Pick<
  ApiDeliveryDetails,
  | "courier_tracking_number"
  | "courier"
  | "docket_number"
  | "mode"
  | "number_of_packages"
  | "freight_charges"
  | "freight_paid_by"
  | "delivery_date"
>;

export const MODE_LABEL: Record<string, string> = Object.fromEntries(
  DISPATCH_MODES.map((m) => [m.value, m.label]),
);
export const FREIGHT_LABEL: Record<string, string> = Object.fromEntries(
  FREIGHT_PAID_BY.map((f) => [f.value, f.label]),
);

export const LINE_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  pending: "warning",
  dispatched: "info",
  cancelled: "error",
  returned: "neutral",
  sold: "success",
};

// A DRI's display name — the resolved part variant, falling back to the raw
// serial when the brief isn't embedded.
export function unitName(line: DispatchLineItem): string {
  const pv = line.part_variant;
  return pv?.name ?? pv?.part_name ?? line.serial_number;
}

// Each dispatch `source_entity_type` that has a detail page → its route.
// `staff_requests` has no detail page and is intentionally absent, so such a
// source resolves to null and renders inert.
const SOURCE_DOCUMENT_ROUTE: Record<string, (id: string) => string> = {
  sales_orders: (id) => `/crm/sales-orders/${id}`,
  replacement_requests: (id) => `/wms/replacements/${id}`,
  purchase_returns: (id) => `/wms/purchase-returns/${id}`,
  warehouse_transfers: (id) => `/wms/transfers/${id}`,
  demo_requests: (id) => `/crm/demo-requests/${id}`,
};

/** Detail-page href for a dispatch's source document, or null when its type
 *  has no detail page — then the reference stays plain text. */
export function sourceDocumentHref(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): string | null {
  if (!entityType || !entityId) return null;
  return SOURCE_DOCUMENT_ROUTE[entityType]?.(entityId) ?? null;
}

/** The slice of a dispatch's free-form `metadata` the detail page reads. */
export interface DispatchDetailMeta {
  delivery_details?: DeliveryDetails;
  billing_details?: { invoice_amount?: string | number | null };
}

// Cancel stamps "[cancelled] <reason>" into notes; split it out for display.
export function splitCancellationNotes(
  status: string,
  notes: string | null | undefined,
): { cancellationReason: string | null; displayNotes: string | null } {
  const cancellationReason =
    status === "cancelled"
      ? (notes?.match(/\[cancelled\]\s*([\s\S]+)$/)?.[1]?.trim() ?? null)
      : null;
  const displayNotes =
    (cancellationReason
      ? notes?.replace(/\n?\[cancelled\][\s\S]*$/, "")
      : notes
    )?.trim() || null;
  return { cancellationReason, displayNotes };
}

/** Header subtitle + status badge for a dispatch, falling back to the raw enum. */
export function dispatchHeaderMeta(dr: Pick<DispatchRequest, "dispatch_type" | "status">) {
  return {
    subtitle: DISPATCH_TYPE_API_LABELS[dr.dispatch_type] ?? dr.dispatch_type,
    status: {
      label: DISPATCH_REQUEST_STATUS_LABELS[dr.status] ?? dr.status,
      variant: DISPATCH_REQUEST_STATUS_VARIANT[dr.status] ?? ("neutral" as StatusBadgeVariant),
    },
  };
}

/** Loading, forbidden or a non-404 error → the fallback renders instead of the body. */
export function isDetailUnavailable(q: { isLoading: boolean; isError: boolean; error: unknown }) {
  return q.isLoading || isForbidden(q.error) || (q.isError && !isNotFound(q.error));
}
