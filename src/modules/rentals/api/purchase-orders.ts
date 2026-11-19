import type { components } from "@/shared/api/schema.gen";

import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { PAGINATION } from "@/shared/constants";

// ─── Customer purchase orders on a rental ────────────────────────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/rentals/schemas/
// rental_purchase_order.py` (legacy-parity spec §3). Some customers will
// not pay an invoice that quotes no PO of theirs; an order flagged "PO
// needed?" runs on one, the PO's end is the order's end date, and Extend
// PO moves the order onto the next one.

export type PoInvoicing =
  components["schemas"]["RentalAgreementResponse"]["po_invoicing"];

/** Today's PO standing of an order, most urgent first: past the end with
 *  units still out, a PO whose number and date are not in yet (not billed),
 *  or inside the 30-day window. Null — nothing to chase. */
export type PoState = NonNullable<
  components["schemas"]["RentalOrderPurchaseOrders"]["po_state"]
>;

export type RentalPurchaseOrder =
  components["schemas"]["RentalPurchaseOrderResponse"];

export type RentalOrderPurchaseOrders =
  components["schemas"]["RentalOrderPurchaseOrders"];

export type RecordPurchaseOrderPayload =
  components["schemas"]["RentalPurchaseOrderCreate"];

export type ExtendPurchaseOrderPayload =
  components["schemas"]["RentalPurchaseOrderExtend"];

export type PurchaseOrderDetailsPayload =
  components["schemas"]["RentalPurchaseOrderDetails"];

export type PoExtensionResult = components["schemas"]["PoExtensionResult"];

export interface PendingPurchaseOrdersPage {
  items: RentalPurchaseOrder[];
  total: number;
  page: number;
  page_size: number;
}

// GET /api/v1/rentals/sales-orders/{id}/purchase-orders
export async function fetchOrderPurchaseOrders(
  salesOrderId: string,
): Promise<RentalOrderPurchaseOrders> {
  return apiClient.get<RentalOrderPurchaseOrders>(
    endpoints.rentals.salesOrderPurchaseOrders(salesOrderId),
  );
}

export type RentalPurchaseOrderDocument =
  components["schemas"]["RentalPurchaseOrderDocument"];

// GET /api/v1/rentals/sales-orders/{id}/purchase-orders/documents
// Each PO's paper is filed against its PO row, not the order — this lists
// them all for the order's Attachments section. Empty with no agreement.
export async function fetchOrderPurchaseOrderDocuments(
  salesOrderId: string,
): Promise<RentalPurchaseOrderDocument[]> {
  return apiClient.get<RentalPurchaseOrderDocument[]>(
    endpoints.rentals.salesOrderPurchaseOrderDocuments(salesOrderId),
  );
}

// POST /api/v1/rentals/purchase-orders/{id}/details
// The awaited PO has arrived: it becomes active and the held-back periods are
// invoiced at once.
export async function recordPurchaseOrderDetails(
  purchaseOrderId: string,
  payload: PurchaseOrderDetailsPayload,
): Promise<PoExtensionResult> {
  return apiClient.post<PoExtensionResult>(
    endpoints.rentals.purchaseOrderDetails(purchaseOrderId),
    payload,
  );
}

// POST /api/v1/rentals/sales-orders/{id}/purchase-orders
// The PO the order runs on; its end becomes the order's end date. With
// `po_available: false` the PO is awaited and the order is not billed.
export async function recordPurchaseOrder(
  salesOrderId: string,
  payload: RecordPurchaseOrderPayload,
): Promise<RentalPurchaseOrder> {
  return apiClient.post<RentalPurchaseOrder>(
    endpoints.rentals.salesOrderPurchaseOrders(salesOrderId),
    payload,
  );
}

// POST /api/v1/rentals/sales-orders/{id}/purchase-orders/extend
// Applied at once and the catch-up invoiced — unless it carries new rates or
// the old PO had already lapsed, in which case it waits for approval
// (`pending_approval: true`).
export async function extendPurchaseOrder(
  salesOrderId: string,
  payload: ExtendPurchaseOrderPayload,
): Promise<PoExtensionResult> {
  return apiClient.post<PoExtensionResult>(
    endpoints.rentals.salesOrderPurchaseOrderExtend(salesOrderId),
    payload,
  );
}

// GET /api/v1/rentals/purchase-orders/pending-approval
export async function fetchPendingPurchaseOrders(
  params: { page?: number; page_size?: number } = {},
): Promise<PendingPurchaseOrdersPage> {
  return apiClient.get<PendingPurchaseOrdersPage>(
    endpoints.rentals.purchaseOrdersPending,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      },
    },
  );
}

// POST /api/v1/rentals/purchase-orders/{id}/approve — never the requester.
export async function approvePurchaseOrder(
  purchaseOrderId: string,
  notes: string | null,
): Promise<PoExtensionResult> {
  return apiClient.post<PoExtensionResult>(
    endpoints.rentals.purchaseOrderApprove(purchaseOrderId),
    { notes },
  );
}

// POST /api/v1/rentals/purchase-orders/{id}/reject — a reason is required.
export async function rejectPurchaseOrder(
  purchaseOrderId: string,
  notes: string,
): Promise<RentalPurchaseOrder> {
  return apiClient.post<RentalPurchaseOrder>(
    endpoints.rentals.purchaseOrderReject(purchaseOrderId),
    { notes },
  );
}
