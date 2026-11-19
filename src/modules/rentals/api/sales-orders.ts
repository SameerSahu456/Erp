import type { components } from "@/shared/api/schema.gen";

import { apiClient, compactParams } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { PAGINATION } from "@/shared/constants";

import type { ActionRequest } from "./action-requests";
import type { RentalAgreement } from "./agreements";
import type { ExtendBounds } from "./devices";
import type { PoState } from "./purchase-orders";

// Rental sales orders: the Billings payload, the list, and lifecycle actions.
// Only orders with `sellable_type = 'rental_sales'` have any of this.

/** Everything the SO billings card and agreement page read, in ONE payload so
 *  the two cannot disagree. Generated — a hand-written copy went stale. */
export type RentalSalesOrderBillingDetail =
  components["schemas"]["RentalAgreementDetail"];

// GET /api/v1/rentals/sales-orders/{id}/billing
export async function fetchRentalSalesOrderBilling(
  salesOrderId: string,
): Promise<RentalSalesOrderBillingDetail> {
  return apiClient.get<RentalSalesOrderBillingDetail>(
    endpoints.rentals.salesOrderBilling(salesOrderId),
  );
}

// ─── The rentals sales-order list ────────────────────────────────────

export type RentalSalesOrderRow = components["schemas"]["RentalSalesOrderRow"];

export interface RentalSalesOrdersPage {
  items: RentalSalesOrderRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface FetchRentalSalesOrdersParams {
  page?: number;
  page_size?: number;
  account_id?: string;
  /** Exact account NAME — what the list's dropdown offers. */
  account?: string;
  q?: string;
  /** Repeatable — filters the SALES ORDER's own status. */
  so_status?: string[];
  /** Repeatable — filters the RENTAL contract's status. */
  rental_status?: string[];
  /** Sales-order creation date, `YYYY-MM-DD`. Both ends INCLUSIVE. */
  created_from?: string;
  created_to?: string;
  /** Field name, `-` prefix for descending. Rejected with 422 if unknown. */
  sort?: string;
  /** Repeatable — "PO needed?" orders whose PO is due, awaited or overdue. */
  po_state?: PoState[];
  /** Live orders not on a PO ending today or within 30 days, units out. */
  expiring?: boolean;
  /** Live orders (PO or not) past their end date with units out — Overdue. */
  expired?: boolean;
}

/** Filter choices for the list — a server-paged table cannot derive them. */
export type RentalSalesOrderFacets = components["schemas"]["RentalSalesOrderFacets"];

export async function fetchRentalSalesOrderFacets(): Promise<RentalSalesOrderFacets> {
  return apiClient.get<RentalSalesOrderFacets>(
    endpoints.rentals.salesOrderFacets,
  );
}

// GET /api/v1/rentals/sales-orders — server-paginated; arrays go out as
// repeated keys and `compactParams` drops cleared filters.
export async function fetchRentalSalesOrders(
  params: FetchRentalSalesOrdersParams = {},
): Promise<RentalSalesOrdersPage> {
  return apiClient.get<RentalSalesOrdersPage>(endpoints.rentals.salesOrders, {
    params: compactParams({
      ...params,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      q: params.q?.trim(),
      // `false` means "no filter", not "not expiring" / "not expired".
      expiring: params.expiring || undefined,
      expired: params.expired || undefined,
    }),
  });
}

// ─── Order lifecycle actions ─────────────────────────────────────────

/** `line_rates` lists only repriced lines; `device_ids` narrows a line's rate
 *  to chosen units (never send it empty). */
export type RentalSalesOrderExtendPayload = components["schemas"]["ExtendRequest"];

export type UnitsAtRate = components["schemas"]["UnitsAtRate"];

/** One unit a new rate could land on — a checkbox row in the extend dialog. */
export type TargetUnit = components["schemas"]["TargetUnit"];

/** What one line's new rate would land on; 2+ `unit_rates` means a flatten. */
export type LineRateTarget = components["schemas"]["LineRateTarget"];

// GET /api/v1/rentals/sales-orders/{id}/line-rate-targets — lines with no unit
// on rent are ABSENT, not zero-filled.
export async function fetchLineRateTargets(
  salesOrderId: string,
): Promise<LineRateTarget[]> {
  return apiClient.get<LineRateTarget[]>(
    endpoints.rentals.salesOrderLineRateTargets(salesOrderId),
  );
}

export type RentalSalesOrderTerminatePayload = components["schemas"]["TerminationRequestCreate"];
export type RentalSalesOrderHoldPayload = components["schemas"]["HoldRequest"];
export type RentalSalesOrderUnholdPayload = components["schemas"]["UnholdRequest"];

export async function extendSo(
  id: string,
  payload: RentalSalesOrderExtendPayload,
): Promise<RentalAgreement> {
  return apiClient.post<RentalAgreement>(
    endpoints.rentals.salesOrderExtend(id),
    payload,
  );
}

// Raises a termination REQUEST (2026-11-14); approving it terminates.
export async function terminateSo(
  id: string,
  payload: RentalSalesOrderTerminatePayload,
): Promise<ActionRequest> {
  return apiClient.post<ActionRequest>(
    endpoints.rentals.salesOrderTerminate(id),
    payload,
  );
}

export async function holdSo(
  id: string,
  payload: RentalSalesOrderHoldPayload,
): Promise<RentalAgreement> {
  return apiClient.post<RentalAgreement>(
    endpoints.rentals.salesOrderHold(id),
    payload,
  );
}

export async function unholdSo(
  id: string,
  payload: RentalSalesOrderUnholdPayload,
): Promise<RentalAgreement> {
  return apiClient.post<RentalAgreement>(
    endpoints.rentals.salesOrderUnhold(id),
    payload,
  );
}

/** The invoice a first-invoice call raises; `null` when nothing was billable. */
export type FirstInvoiceResult = components["schemas"]["RentalInvoiceResponse"] | null;

// POST /api/v1/rentals/sales-orders/{id}/first-invoice
export async function generateFirstInvoice(id: string): Promise<FirstInvoiceResult> {
  return apiClient.post<FirstInvoiceResult>(endpoints.rentals.salesOrderFirstInvoice(id));
}

// GET /api/v1/rentals/sales-orders/{id}/extend-bounds — same shape as a unit's.
export async function fetchRentalSalesOrderExtendBounds(
  salesOrderId: string,
): Promise<ExtendBounds> {
  return apiClient.get<ExtendBounds>(
    endpoints.rentals.salesOrderExtendBounds(salesOrderId),
  );
}
