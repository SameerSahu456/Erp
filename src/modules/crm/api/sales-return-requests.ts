import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import type { components } from "@/shared/api/schema.gen"

// Sales Return Requests (SRET) — the customer-return authorization. The WMS
// pages, the inward source picker and the SO Returns tab all read and write
// through here, so WMS never reaches into CRM internals.
//
// Three shapes the callers must respect, all enforced server-side:
//   * one line per physical unit. N units means N items, never `quantity: N`.
//   * a group decision uses the BATCH endpoint, not N parallel calls — one
//     transaction, one header rollup, one audit row.
//   * `pinned_dispatch_request_item_id` is ADVISORY. It records which unit
//     sales had in mind; the warehouse may legitimately return a different
//     unit of the same variant, and that is not an error.
//
// Failures worth surfacing verbatim rather than retrying:
//   * 409 SRET_UNIT_ALREADY_CLAIMED — a live replacement OR return request
//     already holds that unit. Refetch the eligible units; do not retry.
//   * 403 SRET_NOT_ITEM_APPROVER — the line belongs to another product
//     manager.
//   * 409 SRET_ALREADY_RECEIVED — units are physically back; cancel is
//     no longer possible.

export type SalesReturnRequestWire =
  components["schemas"]["SalesReturnRequestResponse"]
export type SalesReturnRequestItemWire =
  components["schemas"]["SalesReturnRequestItemResponse"]
export type SalesReturnRequestCreateWire =
  components["schemas"]["SalesReturnRequestCreate"]
export type SalesReturnRequestUpdateWire =
  components["schemas"]["SalesReturnRequestUpdate"]
export type SalesReturnRequestBatchApproveWire =
  components["schemas"]["SalesReturnRequestBatchApprove"]
export type SalesReturnRequestItemDecisionWire =
  components["schemas"]["SalesReturnRequestItemDecision"]
export type SalesReturnRequestCancelWire =
  components["schemas"]["SalesReturnRequestCancel"]
export type SalesReturnRequestReassignPMWire =
  components["schemas"]["SalesReturnRequestReassignPM"]
export type SalesReturnEligibleUnitWire =
  components["schemas"]["SalesReturnEligibleUnit"]
export type SalesReturnEligibleSourceWire =
  components["schemas"]["SalesReturnEligibleSource"]

// openapi-typescript flattens the generic aliases to their underlying
// shapes, same as the replacement-request list.
export type SalesReturnRequestsListResponse =
  components["schemas"]["PaginatedResponse_SalesReturnRequestResponse_"]
export type SalesReturnEligibleSourcesResponse =
  components["schemas"]["PaginatedResponse_SalesReturnEligibleSource_"]
export type SalesReturnSourceOrderWire = components["schemas"]["SalesReturnSourceOrder"]
export type SalesReturnSourceOrdersResponse =
  components["schemas"]["PaginatedResponse_SalesReturnSourceOrder_"]

// ── Reads ──────────────────────────────────────────────────────────

export interface FetchSalesReturnRequestsParams {
  page?: number
  page_size?: number
  q?: string
  status?: string[]
  /** Navbar WMS warehouse scope — filters on return_to_warehouse_id. Empty /
   *  omitted = all accessible warehouses. */
  warehouse_ids?: string[]
  reason?: string
  entity_type?: string
  entity_id?: string
  account_id?: string
  /** Created-date (IST) inclusive bounds, `YYYY-MM-DD`. */
  date_from?: string
  date_to?: string
  /** `created_at` | `request_number`, optionally `-` prefixed. Default
   *  `-created_at` (newest first). */
  sort?: string
}

export async function fetchSalesReturnRequests(
  params: FetchSalesReturnRequestsParams = {},
): Promise<SalesReturnRequestsListResponse> {
  return apiClient.get<SalesReturnRequestsListResponse>(
    endpoints.crm.salesReturnRequests,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        q: params.q?.trim() || undefined,
        status: params.status,
        warehouse_ids: params.warehouse_ids,
        reason: params.reason || undefined,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        account_id: params.account_id || undefined,
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
        sort: params.sort || undefined,
      },
    },
  )
}

/**
 * The product manager's queue: requests carrying a line THIS user may decide.
 *
 * Scoped server-side by the same rule the approve endpoint enforces, so a row
 * here is always actionable — never one that would come back 403.
 */
export async function fetchSalesReturnRequestsPendingPM(
  params: {
    page?: number
    page_size?: number
    search?: string
    account_id?: string[]
    /** Requests created by these users. */
    user_id?: string[]
    /** created_at, inclusive IST days (YYYY-MM-DD). */
    date_from?: string
    date_to?: string
    /** Server sort, `field` or `-field` (desc). */
    sort?: string
  } = {},
): Promise<SalesReturnRequestsListResponse> {
  return apiClient.get<SalesReturnRequestsListResponse>(
    endpoints.crm.salesReturnRequestsPendingPM,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        // PM Approvals toolbar: request number or its SO number; accounts.
        search: params.search || undefined,
        account_id: params.account_id?.length ? params.account_id : undefined,
        user_id: params.user_id?.length ? params.user_id : undefined,
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
        // Server sort: `field` / `-field` (allow-listed by the endpoint).
        sort: params.sort || undefined,
      },
    },
  )
}

export async function fetchSalesReturnRequest(
  id: string,
): Promise<SalesReturnRequestWire> {
  return apiClient.get<SalesReturnRequestWire>(
    endpoints.crm.salesReturnRequest(id),
  )
}

// ── Pickers ────────────────────────────────────────────────────────

export interface FetchSalesReturnEligibleSourcesParams {
  page?: number
  page_size?: number
  q?: string
}

/**
 * Sales orders with at least one dispatched unit nothing else has claimed.
 *
 * Orders whose every unit is already spoken for are omitted server-side, so
 * an empty result means "nothing returnable", never "zero of something".
 */
export async function fetchSalesReturnEligibleSources(
  params: FetchSalesReturnEligibleSourcesParams = {},
): Promise<SalesReturnEligibleSourcesResponse> {
  return apiClient.get<SalesReturnEligibleSourcesResponse>(
    endpoints.crm.salesReturnEligibleSources,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        q: params.q?.trim() || undefined,
      },
    },
  )
}

/** Sales orders that already have a sales return — the listing's Sales Order filter. */
export async function fetchSalesReturnSourceOrders(
  params: FetchSalesReturnEligibleSourcesParams = {},
): Promise<SalesReturnSourceOrdersResponse> {
  return apiClient.get<SalesReturnSourceOrdersResponse>(endpoints.crm.salesReturnSourceOrders, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      q: params.q?.trim() || undefined,
    },
  })
}

/**
 * The individual returnable units of one sales order, serial by serial.
 *
 * Never offers more per model than the create guard will accept — the count
 * already subtracts every live replacement and return claim — so a unit shown
 * here is a unit the API will take.
 */
export async function fetchSalesReturnEligibleUnits(
  salesOrderId: string,
): Promise<SalesReturnEligibleUnitWire[]> {
  return apiClient.get<SalesReturnEligibleUnitWire[]>(
    endpoints.crm.salesReturnEligibleUnits,
    { params: { sales_order_id: salesOrderId } },
  )
}

// ── Mutations ──────────────────────────────────────────────────────

export async function createSalesReturnRequest(
  body: SalesReturnRequestCreateWire,
): Promise<SalesReturnRequestWire> {
  return apiClient.post<SalesReturnRequestWire>(
    endpoints.crm.salesReturnRequests,
    body,
  )
}

/**
 * Approve / reject several lines atomically.
 *
 * One call, not N: the header status is a rollup of the line decisions, and a
 * half-applied batch would roll it up against decisions that never landed.
 */
export async function decideSalesReturnRequestItems(
  id: string,
  body: SalesReturnRequestBatchApproveWire,
): Promise<SalesReturnRequestWire> {
  return apiClient.patch<SalesReturnRequestWire>(
    endpoints.crm.salesReturnRequestItemsApprove(id),
    body,
  )
}

/** Repoint an undecidable line at a different product manager. */
export async function reassignSalesReturnRequestPM(
  id: string,
  itemId: string,
  body: SalesReturnRequestReassignPMWire,
): Promise<SalesReturnRequestWire> {
  return apiClient.patch<SalesReturnRequestWire>(
    endpoints.crm.salesReturnRequestItemReassign(id, itemId),
    body,
  )
}

/** Withdraw a request, releasing every unit it had claimed. */
export async function cancelSalesReturnRequest(
  id: string,
  body: SalesReturnRequestCancelWire,
): Promise<SalesReturnRequestWire> {
  return apiClient.post<SalesReturnRequestWire>(
    endpoints.crm.salesReturnRequestCancel(id),
    body,
  )
}

/**
 * Header edit — logistics and free text only.
 *
 * `status` is deliberately absent from the payload type: it is a rollup of
 * the per-line decisions, and a caller setting it would create a second
 * source of truth.
 */
export async function patchSalesReturnRequest(
  id: string,
  body: SalesReturnRequestUpdateWire,
): Promise<SalesReturnRequestWire> {
  return apiClient.patch<SalesReturnRequestWire>(
    endpoints.crm.salesReturnRequest(id),
    body,
  )
}
