import { DEFAULT_FETCH_LIMIT } from "../constants/list";
import type {
  MaterialIssueResponse,
  MaterialIssueStage,
  MaterialIssueLineInput,
  MaterialIssueReturnRequest,
  OperationResponse,
  MaterialIssueLineListResponse,
  MaterialIssueQcCompleteRequest,
} from "./material-issue";
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { FIRST_PAGE } from "@shared/api/pagination";
import { endpoints } from "@shared/api/endpoints";

export async function returnMaterialIssueUnits(
  id: string,
  body: MaterialIssueReturnRequest,
): Promise<MaterialIssueResponse> {
  return apiClient.post<MaterialIssueResponse>(
    endpoints.wms.materialIssueReturns(id),
    body,
  );
}

export type MaterialIssuePullOutRequest =
  components["schemas"]["MaterialIssuePullOutRequest"];
export type MaterialIssuePullOutResponse =
  components["schemas"]["MaterialIssuePullOutResponse"];

// Register a part stripped out of an issued unit back into inventory (D26) —
// a NEW stock unit, not a line change on the MI.
export async function pullOutMaterialIssuePart(
  id: string,
  body: MaterialIssuePullOutRequest,
): Promise<MaterialIssuePullOutResponse> {
  return apiClient.post<MaterialIssuePullOutResponse>(
    endpoints.wms.materialIssuePullOut(id),
    body,
  );
}

export type MaterialIssuePullOutUnit =
  components["schemas"]["MaterialIssuePullOutUnitResponse"];
export type MaterialIssuePullOutUnitList =
  components["schemas"]["MaterialIssuePullOutUnitListResponse"];

// Parts pulled out of this MI's units — the detail page's trace-back panel.
export async function fetchMaterialIssuePullOuts(
  id: string,
): Promise<MaterialIssuePullOutUnitList> {
  return apiClient.get<MaterialIssuePullOutUnitList>(
    endpoints.wms.materialIssuePullOuts(id),
  );
}

export type MachineComponentRow = components["schemas"]["MachineComponentRow"];
export type MachineComponentList =
  components["schemas"]["PaginatedResponse_MachineComponentRow_"];
export type MachineComponentKind = "added" | "removed" | "returned";

export interface MachineComponentsQuery {
  miId: string;
  machineLineId: string;
  kind: MachineComponentKind;
  q?: string;
  page: number;
  page_size: number;
}

// One machine's components (added / removed / returned), server-paginated + searchable.
export async function fetchMachineComponents(
  p: MachineComponentsQuery,
): Promise<MachineComponentList> {
  const qs = new URLSearchParams();
  qs.set("kind", p.kind);
  if (p.q) qs.set("q", p.q);
  qs.set("page", String(p.page));
  qs.set("page_size", String(p.page_size));
  return apiClient.get<MachineComponentList>(
    `${endpoints.wms.materialIssueMachineComponents(p.miId, p.machineLineId)}?${qs.toString()}`,
  );
}

export interface MaterialIssueLinesQuery {
  stage?: MaterialIssueStage;
  /** "primary" for the flat one-row-per-machine listing (each row then
   *  carries `component_count`); omit to list every unit. */
  role?: "primary" | "component";
  warehouseId?: string;
  /** Navbar multi-select warehouse scope — union of these warehouses. */
  warehouseIds?: string[];
  issueType?: string;
  issuedToUserId?: string;
  q?: string;
  /** Server-side sort: a column key, optionally prefixed "-" for descending
   *  (mi_number, issue_type, internal_serial, variant_name, created_at). */
  sort?: string;
  /** Inclusive IST day-range on the line's created_at (yyyy-MM-dd). */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  page_size?: number;
}

export async function topUpMaterialIssue(
  id: string,
  lines: MaterialIssueLineInput[],
): Promise<MaterialIssueResponse> {
  return apiClient.post<MaterialIssueResponse>(
    endpoints.wms.materialIssueTopUp(id),
    lines,
  );
}

export async function startOutwardQc(
  id: string,
  lineId: string,
): Promise<OperationResponse> {
  return apiClient.post<OperationResponse>(
    endpoints.wms.materialIssueLineOutwardQcStart(id, lineId),
    {},
  );
}

export async function completeOutwardQc(
  id: string,
  lineId: string,
  body: MaterialIssueQcCompleteRequest,
): Promise<OperationResponse> {
  return apiClient.post<OperationResponse>(
    endpoints.wms.materialIssueLineOutwardQcComplete(id, lineId),
    body,
  );
}

export async function fetchMaterialIssueLines(
  params: MaterialIssueLinesQuery,
): Promise<MaterialIssueLineListResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? FIRST_PAGE));
  qs.set("page_size", String(params.page_size ?? DEFAULT_FETCH_LIMIT));
  if (params.stage) qs.set("stage", params.stage);
  if (params.role) qs.set("role", params.role);
  if (params.warehouseId) qs.set("warehouse_id", params.warehouseId);
  for (const id of params.warehouseIds ?? []) qs.append("warehouse_ids", id);
  if (params.issueType) qs.set("issue_type", params.issueType);
  if (params.issuedToUserId) qs.set("issued_to_user_id", params.issuedToUserId);
  if (params.q) qs.set("q", params.q);
  if (params.sort) qs.set("sort", params.sort);
  if (params.dateFrom) qs.set("date_from", params.dateFrom);
  if (params.dateTo) qs.set("date_to", params.dateTo);
  return apiClient.get<MaterialIssueLineListResponse>(
    `${endpoints.wms.materialIssueLines}?${qs.toString()}`,
  );
}
