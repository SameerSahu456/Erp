import { DEFAULT_FETCH_LIMIT } from "../constants/list";
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { FIRST_PAGE } from "@shared/api/pagination";
import { endpoints } from "@shared/api/endpoints";
import { appendQuery } from "./query-string";

// ─── Material Issue (outward pipeline slice A) ───────────────────────────────
//
// The outward counterpart to GRN: material handed out against a demand document
// (sale / demo / replacement). A draft holds no stock; scanned serials are only
// `pending` unit rows. `/issue` is the single atomic material-moving call.

export type MaterialIssueListRow =
  components["schemas"]["MaterialIssueListRow"];
export type MaterialIssueListResponse =
  components["schemas"]["PaginatedResponse_MaterialIssueListRow_"];
export type MaterialIssueResponse =
  components["schemas"]["MaterialIssueResponse"];
export type MaterialIssueLineResponse =
  components["schemas"]["MaterialIssueLineResponse"];
export type MaterialIssueCreateRequest =
  components["schemas"]["MaterialIssueCreateRequest"];
export type MaterialIssueHeaderPatchRequest =
  components["schemas"]["MaterialIssueHeaderPatchRequest"];
export type MaterialIssueLineInput =
  components["schemas"]["MaterialIssueLineInput"];
export type MaterialIssueLineUpdateRequest =
  components["schemas"]["MaterialIssueLineUpdateRequest"];
export type MaterialIssueReturnRequest =
  components["schemas"]["MaterialIssueReturnRequest"];
export type MaterialIssueReturnEntry =
  components["schemas"]["MaterialIssueReturnEntry"];
export type IssuedLineResponse = components["schemas"]["IssuedLineResponse"];

export type MaterialIssueLineRow =
  components["schemas"]["MaterialIssueLineRow"];
export type MaterialIssueLineListResponse =
  components["schemas"]["PaginatedResponse_MaterialIssueLineRow_"];
export type MaterialIssueQcStartRequest =
  components["schemas"]["MaterialIssueQcStartRequest"];
export type MaterialIssueQcCompleteRequest =
  components["schemas"]["MaterialIssueQcCompleteRequest"];

// The DERIVED per-line stage (backend spec D17). Kept as a domain union
// so the tab list + badge map are exhaustive over it.
export type MaterialIssueStage =
  | "draft"
  | "issued"
  | "qc_failed"
  | "ready_for_dispatch"
  | "dispatched"
  | "returned"
  | "cancelled";

export type OperationResponse = components["schemas"]["OperationResponse"];

// Header state machine (spec §3.4) — draft/issued/cancelled are all terminal
// except draft, which fans out to the other two.
export type MaterialIssueStatus = "draft" | "issued" | "cancelled";
export type MaterialIssueItemRole = "primary" | "component";

// All five canonical issue types live in the DB CHECK from day one; only three
// are wired to a live demand document in v1 (the other two 422 on create).
export type MaterialIssueType =
  | "sale_issue"
  | "demo_issue"
  | "replacement_issue"
  | "internal_transfer_issue"
  | "rental_issue";
export type WiredIssueType = "sale_issue" | "demo_issue" | "replacement_issue";

export interface MaterialIssueListParams {
  status?: MaterialIssueStatus;
  issue_type?: MaterialIssueType;
  warehouse_id?: string;
  /** Navbar multi-warehouse scope. Empty/omitted = all accessible warehouses. */
  warehouse_ids?: string[];
  source_entity_type?: string;
  source_entity_id?: string;
  // Show only the MIs that issued these specific units (DRIs). A demo-converted
  // SO passes its lines' source_dispatch_request_item_id so its tab shows only
  // ITS units' MIs, not the whole demo's.
  dispatch_request_item_ids?: string[];
  issued_to_user_id?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export async function fetchMaterialIssuesPage(
  params: MaterialIssueListParams,
): Promise<MaterialIssueListResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? FIRST_PAGE));
  qs.set("page_size", String(params.page_size ?? DEFAULT_FETCH_LIMIT));
  appendQuery(qs, params, [
    "status",
    "issue_type",
    "warehouse_id",
    "warehouse_ids",
    "source_entity_type",
    "source_entity_id",
    "dispatch_request_item_ids",
    "issued_to_user_id",
    "q",
  ]);
  return apiClient.get<MaterialIssueListResponse>(
    `${endpoints.wms.materialIssues}?${qs.toString()}`,
  );
}

export async function fetchMaterialIssue(
  id: string,
): Promise<MaterialIssueResponse> {
  return apiClient.get<MaterialIssueResponse>(endpoints.wms.materialIssue(id));
}

export interface IssuedLinesParams {
  source_entity_type: string;
  source_entity_id: string;
}

export async function fetchIssuedLines(
  params: IssuedLinesParams,
): Promise<IssuedLineResponse[]> {
  const qs = new URLSearchParams({
    source_entity_type: params.source_entity_type,
    source_entity_id: params.source_entity_id,
  });
  const res = await apiClient.get<IssuedLineResponse[]>(
    `${endpoints.wms.materialIssueIssuedLines}?${qs.toString()}`,
  );
  return res ?? [];
}

// One issuable demand line of a New-Issue source doc, resolved server-side by
// the WMS endpoint (gated on an outward-read perm, not crm:so_read) so every
// outward role can load the form. `item_name` / `description` are populated
// only for sales-order lines; demo/replacement lines resolve their label from
// `original_variant_id` client-side. Hand-typed (not regenerated) to avoid the
// known schema.gen drift.
export interface MaterialIssueDemandLineRow {
  source_line_id: string;
  original_variant_id: string | null;
  ordered_qty: number;
  item_name: string | null;
  description: string | null;
  /** Replacement lines only: the unit to issue (see MaterialIssueSuggestedUnit). */
  suggested_unit?: MaterialIssueSuggestedUnit | null;
}

/** The unit a replacement line should issue. `must_issue`: the customer's own
 *  device or repaired part — the only unit the line accepts. Otherwise the
 *  returned unit of a same-part line, offered first while it is available. */
export interface MaterialIssueSuggestedUnit {
  stock_item_id: string;
  internal_serial: string;
  manufacturer_serial?: string | null;
  /** Its current variant — may differ from the line's after a re-grade. */
  part_variant_id: string;
  warehouse_id: string | null;
  must_issue: boolean;
}

export interface MaterialIssueDemandParams {
  issue_type: WiredIssueType;
  source_entity_id: string;
}

export async function fetchMaterialIssueDemand(
  params: MaterialIssueDemandParams,
): Promise<MaterialIssueDemandLineRow[]> {
  const qs = new URLSearchParams({
    issue_type: params.issue_type,
    source_entity_id: params.source_entity_id,
  });
  const res = await apiClient.get<MaterialIssueDemandLineRow[]>(
    `${endpoints.wms.materialIssueDemand}?${qs.toString()}`,
  );
  return res ?? [];
}

export async function createMaterialIssue(
  body: MaterialIssueCreateRequest,
): Promise<MaterialIssueResponse> {
  return apiClient.post<MaterialIssueResponse>(
    endpoints.wms.materialIssues,
    body,
  );
}

export async function patchMaterialIssueHeader(
  id: string,
  body: MaterialIssueHeaderPatchRequest,
): Promise<MaterialIssueResponse> {
  return apiClient.patch<MaterialIssueResponse>(
    endpoints.wms.materialIssue(id),
    body,
  );
}

export async function addMaterialIssueLines(
  id: string,
  lines: MaterialIssueLineInput[],
): Promise<MaterialIssueResponse> {
  return apiClient.post<MaterialIssueResponse>(
    endpoints.wms.materialIssueLineItems(id),
    lines,
  );
}

export async function updateMaterialIssueLine(
  id: string,
  lineId: string,
  body: MaterialIssueLineUpdateRequest,
): Promise<MaterialIssueResponse> {
  return apiClient.patch<MaterialIssueResponse>(
    endpoints.wms.materialIssueLine(id, lineId),
    body,
  );
}

export async function deleteMaterialIssueLine(
  id: string,
  lineId: string,
): Promise<MaterialIssueResponse> {
  return apiClient.delete<MaterialIssueResponse>(
    endpoints.wms.materialIssueLine(id, lineId),
  );
}

// Remove several draft lines in one call. A DELETE with a body is awkward, so
// the backend takes a POST carrying the ids. This collapses the edit-save
// "rebuild" delete loop (one request per removed line) into a single request.
export async function deleteMaterialIssueLines(
  id: string,
  lineIds: string[],
): Promise<MaterialIssueResponse> {
  return apiClient.post<MaterialIssueResponse>(
    endpoints.wms.materialIssueLinesBulkDelete(id),
    { line_ids: lineIds },
  );
}

export async function issueMaterialIssue(
  id: string,
): Promise<MaterialIssueResponse> {
  return apiClient.post<MaterialIssueResponse>(
    endpoints.wms.materialIssueIssue(id),
    {},
  );
}

export async function cancelMaterialIssue(
  id: string,
): Promise<MaterialIssueResponse> {
  return apiClient.post<MaterialIssueResponse>(
    endpoints.wms.materialIssueCancel(id),
    {},
  );
}
