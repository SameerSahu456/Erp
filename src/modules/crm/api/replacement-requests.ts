import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import type { components } from "@/shared/api/schema.gen"

// Replacement Requests — the whole surface: the WMS pages, the outward
// pipeline's source picker, and the SO Replacement tab all read and write
// through here, so WMS never reaches into CRM internals.
//
// Two shapes the callers must respect, both enforced server-side:
//   * `quantity` is always 1. N units means N line items, not `quantity: N`.
//   * a group approve uses the BATCH endpoint, not N parallel single-item
//     calls — one transaction, one header rollup, one notification.

export type ReplacementRequestListItemWire =
  components["schemas"]["ReplacementRequestListItem"]
export type ReplacementRequestWire =
  components["schemas"]["ReplacementRequestResponse"]
export type ReplacementRequestItemWire =
  components["schemas"]["ReplacementRequestItemResponse"]
export type ReplacementRequestPatchWire =
  components["schemas"]["ReplacementRequestPatchBody"]
export type ReplacementApproverCandidateWire =
  components["schemas"]["ReplacementApproverCandidate"]
export type ReplacementRequestCreateWire =
  components["schemas"]["ReplacementRequestCreate"]
export type ReplacementEligibleItemWire =
  components["schemas"]["ReplacementEligibleItem"]
/** One replaceable unit of an order. A `no_dispatch_record` unit — migrated
 *  from the old rentals system — has no dispatch line, stock item or variant;
 *  it is named by `rental_device_id`. */
export type DispatchedUnitWire = components["schemas"]["ReplacementEligibleUnit"]
/** One component recorded inside a dispatched unit (component replacement). */
export type DispatchedUnitComponentWire =
  components["schemas"]["DispatchedUnitComponentRow"]
export type SalesOrderForReplacementRowWire =
  components["schemas"]["SalesOrderForReplacementRow"]
// The backend names this EligibleSourcesResponse; openapi-typescript
// flattens the alias to its underlying paginated shape.
export type EligibleSourcesResponse =
  components["schemas"]["PaginatedResponse_SalesOrderForReplacementRow_"]
export type SalesOrderWithReplacementRowWire =
  components["schemas"]["SalesOrderWithReplacementRow"]
export type ReplacementSourceOrdersResponse =
  components["schemas"]["PaginatedResponse_SalesOrderWithReplacementRow_"]
export type SalesOrderReplacementRollupRowWire =
  components["schemas"]["SalesOrderReplacementRollupRow"]
/** One approved unit replacement on an SO line — appended under the line. */
export type SalesOrderLineReplacementWire =
  components["schemas"]["SalesOrderLineReplacement"]

export type ReplacementRequestsListResponse =
  components["schemas"]["PaginatedResponse_ReplacementRequestListItem_"]

export interface FetchReplacementRequestsParams {
  page?: number
  page_size?: number
  q?: string
  status?: string[]
  priority?: string
  replacement_mode?: string
  sort?: string
  entity_type?: string
  entity_id?: string
  account_id?: string
  /** Raised-date window, inclusive IST days (YYYY-MM-DD). */
  date_from?: string
  date_to?: string
}

export async function fetchReplacementRequests(
  params: FetchReplacementRequestsParams = {},
): Promise<ReplacementRequestsListResponse> {
  return apiClient.get<ReplacementRequestsListResponse>(
    endpoints.crm.replacementRequests,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        q: params.q?.trim() || undefined,
        status: params.status,
        priority: params.priority || undefined,
        replacement_mode: params.replacement_mode || undefined,
        sort: params.sort || undefined,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        account_id: params.account_id,
        date_from: params.date_from,
        date_to: params.date_to,
      },
    },
  )
}

/**
 * The product manager's queue: requests carrying a line THIS user may decide.
 *
 * Scoped server-side by the same rule the approve call enforces, so a row
 * here is always actionable.
 */
export async function fetchReplacementRequestsPendingPM(
  params: {
    page?: number
    page_size?: number
    search?: string
    /** Requests created by these users. */
    user_id?: string[]
    /** created_at, inclusive IST days (YYYY-MM-DD). */
    date_from?: string
    date_to?: string
    /** Server sort, `field` or `-field` (desc). */
    sort?: string
  } = {},
): Promise<components["schemas"]["PaginatedResponse_ReplacementRequestResponse_"]> {
  return apiClient.get<
    components["schemas"]["PaginatedResponse_ReplacementRequestResponse_"]
  >(endpoints.crm.replacementRequestsPendingPM, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      // PM Approvals toolbar: request number, creator, created date.
      search: params.search || undefined,
      user_id: params.user_id?.length ? params.user_id : undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      // Server sort: `field` / `-field` (allow-listed by the endpoint).
      sort: params.sort || undefined,
    },
  })
}

export async function fetchReplacementRequest(
  id: string,
): Promise<ReplacementRequestWire> {
  return apiClient.get<ReplacementRequestWire>(
    endpoints.crm.replacementRequest(id),
  )
}

// ── Pickers ────────────────────────────────────────────────────────

export interface FetchReplacementEligibleSourcesParams {
  page?: number
  page_size?: number
  q?: string
  account_id?: string
}

export async function fetchReplacementEligibleSources(
  params: FetchReplacementEligibleSourcesParams = {},
): Promise<EligibleSourcesResponse> {
  return apiClient.get<EligibleSourcesResponse>(
    endpoints.crm.replacementRequestEligibleSources,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        q: params.q?.trim() || undefined,
        account_id: params.account_id,
      },
    },
  )
}

export interface FetchReplacementSourceOrdersParams {
  page?: number
  page_size?: number
  q?: string
}

/** SOs that already have a replacement request — backs the listing's SO
 *  FILTER (only orders with a request, so every option yields rows; CP-220). */
export async function fetchReplacementSourceOrders(
  params: FetchReplacementSourceOrdersParams = {},
): Promise<ReplacementSourceOrdersResponse> {
  return apiClient.get<ReplacementSourceOrdersResponse>(
    endpoints.crm.replacementRequestSourceOrders,
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
 * Replaceable units on one sales order, grouped by
 * `(sales_order_item, variant, generation)`.
 *
 * Rows tagged `generation: "replacement"` are units an earlier replacement
 * shipped — themselves replaceable, and counted separately so an open
 * request on the original never makes its replacement look claimed.
 */
export async function fetchReplacementEligibleItems(
  salesOrderId: string,
): Promise<ReplacementEligibleItemWire[]> {
  return apiClient.get<ReplacementEligibleItemWire[]>(
    endpoints.crm.replacementRequestEligibleItems,
    { params: { entity_type: "sales_orders", entity_id: salesOrderId } },
  )
}

/**
 * The individual dispatched units of a sales order, serial by serial.
 *
 * `fetchReplacementEligibleItems` answers "how many of this model are free";
 * this answers "which ones", so an operator who knows the failing serial can
 * name it on the line. The pin is advisory — intake still accepts any unit of
 * the same model back.
 */
export async function fetchReplacementEligibleUnits(
  salesOrderId: string,
): Promise<DispatchedUnitWire[]> {
  return apiClient.get<DispatchedUnitWire[]>(
    endpoints.crm.replacementRequestEligibleUnits,
    { params: { sales_order_id: salesOrderId } },
  )
}

/**
 * The components recorded inside one dispatched unit of an order — what a
 * component replacement line can name. Components already being replaced
 * come back flagged (`already_under_replacement`), not hidden.
 */
export async function fetchReplacementEligibleUnitComponents(
  salesOrderId: string,
  dispatchRequestItemId: string,
): Promise<DispatchedUnitComponentWire[]> {
  return apiClient.get<DispatchedUnitComponentWire[]>(
    endpoints.crm.replacementRequestEligibleUnitComponents,
    {
      params: {
        sales_order_id: salesOrderId,
        dispatch_request_item_id: dispatchRequestItemId,
      },
    },
  )
}

/** Per-SO-line replacement activity for the SO Replacement tab. */
export async function fetchSalesOrderReplacementRollup(
  salesOrderId: string,
): Promise<SalesOrderReplacementRollupRowWire[]> {
  return apiClient.get<SalesOrderReplacementRollupRowWire[]>(
    endpoints.crm.replacementRequestSoRollup,
    { params: { sales_order_id: salesOrderId } },
  )
}

// ── Mutations ──────────────────────────────────────────────────────

export async function createReplacementRequest(
  body: ReplacementRequestCreateWire,
): Promise<ReplacementRequestWire> {
  return apiClient.post<ReplacementRequestWire>(
    endpoints.crm.replacementRequests,
    body,
  )
}

export async function approveReplacementItem(
  rrId: string,
  itemId: string,
  body: { notes?: string | null } = {},
): Promise<ReplacementRequestWire> {
  return apiClient.patch<ReplacementRequestWire>(
    endpoints.crm.replacementRequestItemApprove(rrId, itemId),
    body,
  )
}

/**
 * Approve several lines at once.
 *
 * Use this for any group action. N parallel single-item calls would each
 * roll the header up separately; this is one transaction, one rollup and one
 * notification, and it is atomic — a bad line rejects the whole batch.
 */
export async function approveReplacementItems(
  rrId: string,
  body: { item_ids: string[]; notes?: string | null },
): Promise<ReplacementRequestWire> {
  return apiClient.patch<ReplacementRequestWire>(
    endpoints.crm.replacementRequestItemsApprove(rrId),
    body,
  )
}

export async function rejectReplacementItem(
  rrId: string,
  itemId: string,
  body: { reason: string },
): Promise<ReplacementRequestWire> {
  return apiClient.patch<ReplacementRequestWire>(
    endpoints.crm.replacementRequestItemReject(rrId, itemId),
    body,
  )
}

/** Edit a pending request's header (priority, ticket, notes…). */
export async function patchReplacementRequest(
  rrId: string,
  body: ReplacementRequestPatchWire,
): Promise<ReplacementRequestWire> {
  return apiClient.patch<ReplacementRequestWire>(endpoints.crm.replacementRequest(rrId), body)
}

/** Who a pending line may be reassigned to — computed by the server (category
 *  PMs, plus rental managers on a rental order), so the picker never offers a
 *  reassign the caller could not make. */
export async function fetchReplacementApproverCandidates(
  rrId: string,
  itemId: string,
): Promise<ReplacementApproverCandidateWire[]> {
  return apiClient.get<ReplacementApproverCandidateWire[]>(
    endpoints.crm.replacementRequestItemApproverCandidates(rrId, itemId),
  )
}

export async function reassignReplacementItem(
  rrId: string,
  itemId: string,
  body: { product_manager_id: string; reason: string },
): Promise<ReplacementRequestWire> {
  return apiClient.patch<ReplacementRequestWire>(
    endpoints.crm.replacementRequestItemReassign(rrId, itemId),
    body,
  )
}

/**
 * Write off the outstanding return on one line.
 *
 * For the advance-mode case where the customer keeps the faulty unit: the
 * replacement shipped first and the original never came back. Closes the
 * obligation so the request can complete — it does NOT unlock normal-mode
 * dispatch, which still needs the old unit in hand.
 */
export async function waiveReplacementReturn(
  rrId: string,
  itemId: string,
  body: { reason: string },
): Promise<ReplacementRequestWire> {
  return apiClient.patch<ReplacementRequestWire>(
    endpoints.crm.replacementRequestItemWaiveReturn(rrId, itemId),
    body,
  )
}

export type ReplacementNotNeededWire =
  components["schemas"]["ReplacementRequestNotNeededBody"]

/**
 * Close an approved component line without a swap: the part turned out fine,
 * or the swap is no longer wanted. Releases its reserved part; on site no
 * faulty part is owed back either.
 */
export async function markReplacementItemNotNeeded(
  rrId: string,
  itemId: string,
  body: ReplacementNotNeededWire,
): Promise<ReplacementRequestWire> {
  return apiClient.patch<ReplacementRequestWire>(
    endpoints.crm.replacementRequestItemNotNeeded(rrId, itemId),
    body,
  )
}

export type ReplacementOutcomeChangeWire =
  components["schemas"]["ReplacementRequestOutcomeChangeBody"]

/**
 * Repair or replace an in-house part after inspecting it (spec D15). Naming a
 * new part sends the line back to its PM; repair releases the reserved part.
 */
export async function changeReplacementItemOutcome(
  rrId: string,
  itemId: string,
  body: ReplacementOutcomeChangeWire,
): Promise<ReplacementRequestWire> {
  return apiClient.patch<ReplacementRequestWire>(
    endpoints.crm.replacementRequestItemOutcome(rrId, itemId),
    body,
  )
}

/** Abandon a request. Refused once any line has shipped or been received. */
export async function cancelReplacementRequest(
  rrId: string,
  body: { reason?: string | null } = {},
): Promise<ReplacementRequestWire> {
  return apiClient.post<ReplacementRequestWire>(
    endpoints.crm.replacementRequestCancel(rrId),
    body,
  )
}
