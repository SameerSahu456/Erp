import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import type { PageResponse } from "@/shared/api/pagination"
import { PAGINATION } from "@/shared/constants"
import type { components } from "@/shared/api/schema.gen"

// Rental Return Requests (RRET) — the customer-return authorization. The WMS
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
//   * 409 RRET_UNIT_ALREADY_CLAIMED — a live replacement OR return request
//     already holds that unit. Refetch the eligible units; do not retry.
//   * 403 RRET_NOT_ITEM_APPROVER — the line belongs to another product
//     manager.
//   * 409 RRET_ALREADY_RECEIVED — units are physically back; cancel is
//     no longer possible.

export type RentalReturnRequestWire =
  components["schemas"]["RentalReturnRequestResponse"]
export type RentalReturnRequestItemWire =
  components["schemas"]["RentalReturnRequestItemResponse"]
export type RentalReturnRequestCreateWire =
  components["schemas"]["RentalReturnRequestCreate"]
export type RentalReturnRequestUpdateWire =
  components["schemas"]["RentalReturnRequestUpdate"]
export type RentalReturnRequestBatchApproveWire =
  components["schemas"]["RentalReturnRequestBatchApprove"]
export type RentalReturnRequestItemDecisionWire =
  components["schemas"]["RentalReturnRequestItemDecision"]
export type RentalReturnRequestCancelWire =
  components["schemas"]["RentalReturnRequestCancel"]
export type RentalReturnRequestReassignPMWire =
  components["schemas"]["RentalReturnRequestReassignPM"]
export type RentalReturnEligibleUnitWire =
  components["schemas"]["RentalReturnEligibleUnit"]
export type RentalReturnEligibleSourceWire =
  components["schemas"]["RentalReturnEligibleSource"]
export type RentalReturnEligibleVariantWire =
  components["schemas"]["RentalReturnEligibleVariant"]
export type RentalReturnVariantOrderWire =
  components["schemas"]["RentalReturnVariantOrder"]

// openapi-typescript flattens the generic aliases to their underlying
// shapes, same as the replacement-request list.
export type RentalReturnRequestsListResponse =
  components["schemas"]["PaginatedResponse_RentalReturnRequestResponse_"]
export type RentalReturnEligibleSourcesResponse =
  components["schemas"]["PaginatedResponse_RentalReturnEligibleSource_"]

// ── Reads ──────────────────────────────────────────────────────────

export interface FetchRentalReturnRequestsParams {
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
}

export async function fetchRentalReturnRequests(
  params: FetchRentalReturnRequestsParams = {},
): Promise<RentalReturnRequestsListResponse> {
  return apiClient.get<RentalReturnRequestsListResponse>(
    endpoints.crm.rentalReturnRequests,
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
        account_id: params.account_id,
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
export async function fetchRentalReturnRequestsPendingPM(
  params: { page?: number; page_size?: number } = {},
): Promise<RentalReturnRequestsListResponse> {
  return apiClient.get<RentalReturnRequestsListResponse>(
    endpoints.crm.rentalReturnRequestsPendingPM,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      },
    },
  )
}

export async function fetchRentalReturnRequest(
  id: string,
): Promise<RentalReturnRequestWire> {
  return apiClient.get<RentalReturnRequestWire>(
    endpoints.crm.rentalReturnRequest(id),
  )
}

// ── Pickers ────────────────────────────────────────────────────────

export interface FetchRentalReturnEligibleSourcesParams {
  page?: number
  page_size?: number
  q?: string
}

export type RentalReturnEligibleAccountWire =
  components["schemas"]["RentalReturnEligibleAccount"]

/**
 * Customers the return form may pick: a rental order and at least one unit
 * still free to return. A page may hold fewer rows than its size (customers
 * with nothing left are dropped after paging), so follow `has_next`, never
 * a loaded-rows count.
 */
export async function fetchRentalReturnEligibleAccounts(
  params: FetchRentalReturnEligibleSourcesParams = {},
): Promise<PageResponse<RentalReturnEligibleAccountWire>> {
  return apiClient.get<PageResponse<RentalReturnEligibleAccountWire>>(
    endpoints.crm.rentalReturnEligibleAccounts,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        q: params.q?.trim() || undefined,
      },
    },
  )
}

/**
 * Sales orders with at least one dispatched unit nothing else has claimed.
 *
 * Orders whose every unit is already spoken for are omitted server-side, so
 * an empty result means "nothing returnable", never "zero of something".
 */
export async function fetchRentalReturnEligibleSources(
  params: FetchRentalReturnEligibleSourcesParams = {},
): Promise<RentalReturnEligibleSourcesResponse> {
  return apiClient.get<RentalReturnEligibleSourcesResponse>(
    endpoints.crm.rentalReturnEligibleSources,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        q: params.q?.trim() || undefined,
      },
    },
  )
}

/**
 * The individual returnable units of one sales order, serial by serial.
 *
 * Never offers more per model than the create guard will accept — the count
 * already subtracts every live replacement and return claim — so a unit shown
 * here is a unit the API will take.
 */
export async function fetchRentalReturnEligibleUnits(
  salesOrderId: string,
): Promise<RentalReturnEligibleUnitWire[]> {
  return apiClient.get<RentalReturnEligibleUnitWire[]>(
    endpoints.crm.rentalReturnEligibleUnits,
    { params: { sales_order_id: salesOrderId } },
  )
}

/**
 * Every model an account has on rent, with how many can still be asked for.
 *
 * Return by count: the customer names a model and a quantity, not a serial,
 * and may hold that model on several orders. `available` runs the create
 * guard's own arithmetic, so a quantity the form accepts is one the API will.
 * Bounded by the account's distinct models — not paginated.
 */
export async function fetchRentalReturnEligibleVariants(
  accountId: string,
): Promise<RentalReturnEligibleVariantWire[]> {
  return apiClient.get<RentalReturnEligibleVariantWire[]>(
    endpoints.crm.rentalReturnEligibleVariants,
    { params: { account_id: accountId } },
  )
}

// ── Mutations ──────────────────────────────────────────────────────

export async function createRentalReturnRequest(
  body: RentalReturnRequestCreateWire,
): Promise<RentalReturnRequestWire> {
  return apiClient.post<RentalReturnRequestWire>(
    endpoints.crm.rentalReturnRequests,
    body,
  )
}

/**
 * Approve / reject several lines atomically.
 *
 * One call, not N: the header status is a rollup of the line decisions, and a
 * half-applied batch would roll it up against decisions that never landed.
 */
export async function decideRentalReturnRequestItems(
  id: string,
  body: RentalReturnRequestBatchApproveWire,
): Promise<RentalReturnRequestWire> {
  return apiClient.patch<RentalReturnRequestWire>(
    endpoints.crm.rentalReturnRequestItemsApprove(id),
    body,
  )
}

/** Repoint an undecidable line at a different product manager. */
export async function reassignRentalReturnRequestPM(
  id: string,
  itemId: string,
  body: RentalReturnRequestReassignPMWire,
): Promise<RentalReturnRequestWire> {
  return apiClient.patch<RentalReturnRequestWire>(
    endpoints.crm.rentalReturnRequestItemReassign(id, itemId),
    body,
  )
}

/** Withdraw a request, releasing every unit it had claimed. */
export async function cancelRentalReturnRequest(
  id: string,
  body: RentalReturnRequestCancelWire,
): Promise<RentalReturnRequestWire> {
  return apiClient.post<RentalReturnRequestWire>(
    endpoints.crm.rentalReturnRequestCancel(id),
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
export async function patchRentalReturnRequest(
  id: string,
  body: RentalReturnRequestUpdateWire,
): Promise<RentalReturnRequestWire> {
  return apiClient.patch<RentalReturnRequestWire>(
    endpoints.crm.rentalReturnRequest(id),
    body,
  )
}

/**
 * Stop expecting the rest of every open line. Receipts already booked stay;
 * the request settles as `closed_short`.
 */
export async function closeShortRentalReturnRequest(
  id: string,
  reason: string,
): Promise<RentalReturnRequestWire> {
  return apiClient.post<RentalReturnRequestWire>(
    endpoints.crm.rentalReturnRequestCloseShort(id),
    { reason },
  )
}

/** Stop expecting the rest of ONE line. */
export async function closeShortRentalReturnRequestItem(
  id: string,
  itemId: string,
  reason: string,
): Promise<RentalReturnRequestWire> {
  return apiClient.post<RentalReturnRequestWire>(
    endpoints.crm.rentalReturnRequestItemCloseShort(id, itemId),
    { reason },
  )
}
