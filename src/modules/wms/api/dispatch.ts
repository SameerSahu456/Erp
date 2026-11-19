import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

// ─── Types — sourced from the generated OpenAPI schema ───────────────────────

export type DispatchReadyUnit = components["schemas"]["DispatchReadyUnit"];
export type DispatchReadyUnitsResponse =
  components["schemas"]["DispatchReadyUnitsResponse"];
export type DispatchRequest = components["schemas"]["DispatchRequestResponse"];
export type DispatchRequestItem =
  components["schemas"]["DispatchRequestItemResponse"];
export type DispatchLineItem =
  components["schemas"]["DispatchRequestItemListItem"];
export type DispatchRequestListItem = components["schemas"]["DispatchRequestListItem"];
export type PaginatedDispatchRequests =
  components["schemas"]["PaginatedResponse_DispatchRequestListItem_"];
export type DispatchRequestCreate =
  components["schemas"]["DispatchRequestCreate"];
export type DeliveryDetails = components["schemas"]["DeliveryDetails-Input"];
export type DispatchRequestPatch =
  components["schemas"]["DispatchRequestPatchRequest"];
export type DispatchFinaliseBody =
  components["schemas"]["DispatchRequestFinalDispatchRequest"];
export type DispatchCancelBody =
  components["schemas"]["DispatchRequestCancelRequest"];

// ─── Outward source picker (demand docs eligible to feed a dispatch/MI) ──────

export type OutwardSourceRow = components["schemas"]["OutwardSourceRow"];
export type PaginatedOutwardSources =
  components["schemas"]["PaginatedOutwardSourcesResponse"];

export interface OutwardSourcesListParams {
  /** REQUIRED — drives which demand table is queried (sale_dispatch,
   *  demo_dispatch, replacement_dispatch, …). */
  dispatch_type: string;
  /** Case-insensitive substring over the source's display number. */
  q?: string;
  /** When true, return only sources with >=1 issued + QC-passed unit ready to
   *  dispatch now (each row's `ready_unit_count` > 0), instead of the default
   *  "still has pending pick qty" gate. Powers the dispatch-create dropdown. */
  ready_only?: boolean;
  /** The dispatch's from-warehouse. In `ready_only` (sale_dispatch) mode,
   *  scopes the list to Sales Orders whose material issue was raised in THIS
   *  warehouse — a unit sitting in another warehouse no longer offers its SO
   *  here (CP-432). Omit = all warehouses. */
  warehouse_id?: string;
  /** The New Issue form's picker: a sales order is offered only in a status a
   *  Material Issue accepts (Approved / Partially Dispatched — CP-626). */
  for_issue?: boolean;
  page?: number;
  page_size?: number;
}

// Only sources with pending pick qty > 0 come back — the backend drops
// fully-fulfilled / demo-converted documents, so the picker can't offer a
// source that has nothing left to issue.
export async function fetchOutwardSources(
  params: OutwardSourcesListParams,
): Promise<PaginatedOutwardSources> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  return apiClient.get<PaginatedOutwardSources>(
    `${endpoints.wms.outwardSources}?${qs.toString()}`,
  );
}

// ─── Ready-for-dispatch read (issued MI units for a demand doc) ──────────────

export async function fetchDispatchReadyUnits(params: {
  source_entity_type: string;
  source_entity_id: string;
}): Promise<DispatchReadyUnitsResponse> {
  const qs = new URLSearchParams({
    source_entity_type: params.source_entity_type,
    source_entity_id: params.source_entity_id,
  });
  return apiClient.get<DispatchReadyUnitsResponse>(
    `${endpoints.wms.dispatchReadyUnits}?${qs.toString()}`,
  );
}

// ─── Dispatch request worklist (paginated, filterable) ──────────────────────

export interface DispatchRequestListParams {
  page?: number;
  page_size?: number;
  /** Exact-match filter on dispatch_type. */
  dispatch_type?: string;
  /** Exact-match filter on status. */
  status?: string;
  /** Outbound-from warehouse filter. */
  from_warehouse_id?: string;
  /** Navbar multi-select scope — union of these outbound warehouses. */
  from_warehouse_ids?: string[];
  /** Source document type — pair with source_entity_id to scope to one source
   *  (e.g. a single sales order's dispatch history). */
  source_entity_type?: string;
  source_entity_id?: string;
  /** Show only the dispatches carrying these specific units (DRIs). A demo-
   *  converted SO passes its lines' source_dispatch_request_item_id so its tab
   *  shows only ITS units' dispatches, not the whole demo's. */
  dispatch_request_item_ids?: string[];
  /** Case-insensitive substring match on dispatch_number (backend max 100). */
  q?: string;
  /** Server-side sort: a column key, optionally "-" prefixed for descending
   *  (dispatch_number, dispatch_type, status, source_entity_type,
   *  dispatched_at, created_at). */
  sort?: string;
  /** Inclusive IST day-range on created_at (yyyy-MM-dd). */
  date_from?: string;
  date_to?: string;
}

export async function fetchDispatchRequests(
  params: DispatchRequestListParams,
): Promise<PaginatedDispatchRequests> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      // Repeated query param (e.g. dispatch_request_item_ids) — one entry each.
      for (const v of value) qs.append(key, String(v));
    } else {
      qs.set(key, String(value));
    }
  }
  return apiClient.get<PaginatedDispatchRequests>(
    `${endpoints.wms.dispatchRequests}?${qs.toString()}`,
  );
}

// ─── Dispatch request detail ─────────────────────────────────────────────────

export async function fetchDispatchRequest(id: string): Promise<DispatchRequest> {
  return apiClient.get<DispatchRequest>(endpoints.wms.dispatchRequest(id));
}

export async function fetchDispatchLineItems(
  id: string,
): Promise<DispatchLineItem[]> {
  return apiClient.get<DispatchLineItem[]>(
    endpoints.wms.dispatchRequestLineItems(id),
  );
}

// ─── Dispatch request lifecycle ──────────────────────────────────────────────

export async function createDispatchRequest(
  body: DispatchRequestCreate,
): Promise<DispatchRequest> {
  return apiClient.post<DispatchRequest>(endpoints.wms.dispatchRequests, body);
}

export async function pickFromMaterialIssue(
  dispatchId: string,
  materialIssueItemIds: string[],
): Promise<DispatchRequestItem[]> {
  return apiClient.post<DispatchRequestItem[]>(
    endpoints.wms.dispatchRequestPickFromMi(dispatchId),
    { material_issue_item_ids: materialIssueItemIds },
  );
}

export async function patchDispatchRequest(
  dispatchId: string,
  body: DispatchRequestPatch,
): Promise<DispatchRequest> {
  return apiClient.patch<DispatchRequest>(
    endpoints.wms.dispatchRequest(dispatchId),
    body,
  );
}

export async function finaliseDispatch(
  dispatchId: string,
  body: DispatchFinaliseBody,
): Promise<DispatchRequest> {
  return apiClient.post<DispatchRequest>(
    endpoints.wms.dispatchRequestFinalise(dispatchId),
    body,
  );
}

export async function cancelDispatch(
  dispatchId: string,
  body: DispatchCancelBody,
): Promise<DispatchRequest> {
  return apiClient.post<DispatchRequest>(
    endpoints.wms.dispatchRequestCancel(dispatchId),
    body,
  );
}
