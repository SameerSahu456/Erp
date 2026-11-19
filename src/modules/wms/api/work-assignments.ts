/**
 * Work assignments — inward workforce allocation.
 *
 * Spec: comprint-erp-docs/modules/wms/work-assignment/spec.md
 *
 * Every type here comes from `schema.gen.ts`. None is hand-written: the backend
 * owns the contract, and a hand-typed shape is a copy that drifts (§6.7).
 */
import type { components } from "@shared/api/schema.gen";
import {
  apiClient,
  compactParams,
  type BlobResponse,
} from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

type Schemas = components["schemas"];

export type WorkAssignment = Schemas["WorkAssignmentResponse"];
export type WorkAssignmentLine = Schemas["WorkAssignmentLineResponse"];
export type WorkAssignmentProgress = Schemas["WorkAssignmentProgress"];
export type WorkAssignmentListResponse = Schemas["PaginatedResponse_WorkAssignmentResponse_"];
export type EligibleDevice = Schemas["EligibleDeviceResponse"];
export type EligibleDeviceListResponse = Schemas["PaginatedResponse_EligibleDeviceResponse_"];
export type EligibleEngineer = Schemas["EligibleEngineerResponse"];
export type EligibleGrnGroup = Schemas["EligibleGrnGroupResponse"];
export type EligibleLine = Schemas["EligibleLineResponse"];
export type WorkAssignmentCreateRequest =
  Schemas["WorkAssignmentCreateRequest"];
export type WorkAssignmentReassignRequest =
  Schemas["WorkAssignmentReassignRequest"];
export type WorkAssignmentWithdrawRequest =
  Schemas["WorkAssignmentWithdrawRequest"];
export type WorkAssignmentCloseRequest = Schemas["WorkAssignmentCloseRequest"];
export type WorkAssignmentCancelRequest =
  Schemas["WorkAssignmentCancelRequest"];

/** The stages a lot can be drawn from.
 *
 * Still a union rather than `string`, because `Record<WorkAssignmentStage, …>`
 * maps elsewhere rely on exhaustiveness. The LIST the picker renders is fetched
 * (see `listWorkAssignmentStages`) so a new backend stage needs no edit here —
 * only a stage that gains its own UI treatment does.
 */
export type WorkAssignmentStage = "inspection" | "repair" | "qc";

export type WorkAssignmentStageOption = Schemas["StageOption"];

/** Derived from the operation, never stored (spec D2, §5.3). */
export type WorkAssignmentLineState =
  "outstanding" | "reassigned" | "completed" | "withdrawn";

export interface WorkAssignmentListParams {
  stage?: WorkAssignmentStage;
  status?: string;
  issued_to_user_id?: string;
  warehouse_id?: string;
  /** Navbar multi-warehouse scope — repeated as `warehouse_ids`. Empty = all. */
  warehouse_ids?: string[];
  grn_batch_id?: string;
  issued_from?: string;
  issued_to?: string;
  /** Contains-search on WA number or engineer name (server-side). */
  q?: string;
  /** Sort key ('issued_at' / 'wa_number'); prefix '-' for descending. */
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface EligibleDeviceParams {
  stage: WorkAssignmentStage;
  warehouse_id: string;
  grn_batch_id?: string;
  /** Narrows by WHAT the device is, independently of which receipt it came in
   *  on — the filter that makes the picker usable past inward. */
  category_id?: string;
  /** Repeated as `part_variant_id` — the backend accepts a list. */
  part_variant_ids?: string[];
  /** Contains-search on serial, part, variant, OEM, category or GRN (server-side). */
  q?: string;
  page?: number;
  page_size?: number;
}

export async function fetchWorkAssignments(
  params: WorkAssignmentListParams = {},
): Promise<WorkAssignmentListResponse> {
  return apiClient.get<WorkAssignmentListResponse>(
    endpoints.wms.workAssignments,
    { params: compactParams(params) },
  );
}

export async function fetchWorkAssignment(id: string): Promise<WorkAssignment> {
  return apiClient.get<WorkAssignment>(endpoints.wms.workAssignment(id));
}

/** The assignable stages, from the backend's stage registry.
 *
 * Replaces three hardcoded copies of this list (the picker's STAGES array, the
 * label map, and EngineerAssignSelect's AssignStage union). A stage added
 * backend-side now reaches the picker with no frontend change.
 */
export async function listWorkAssignmentStages(): Promise<
  WorkAssignmentStageOption[]
> {
  return apiClient.get<WorkAssignmentStageOption[]>(
    endpoints.wms.workAssignmentStages,
  );
}

/** One page of a lot's line items — the detail table's server-side source. */
export type WorkAssignmentLineListResponse =
  Schemas["PaginatedResponse_WorkAssignmentLineResponse_"];

export interface WorkAssignmentLineListParams {
  /** Contains-search on serial, part or engineer (server-side). */
  q?: string;
  /** Filter by derived line state: outstanding / reassigned / completed / withdrawn. */
  state?: string;
  /** Sort key ('internal_serial' / 'manufacturer_serial' / 'part_number'); prefix '-' desc. */
  sort?: string;
  page?: number;
  page_size?: number;
}

export async function fetchWorkAssignmentLines(
  id: string,
  params: WorkAssignmentLineListParams = {},
): Promise<WorkAssignmentLineListResponse> {
  return apiClient.get<WorkAssignmentLineListResponse>(
    endpoints.wms.workAssignmentLines(id),
    { params: compactParams(params) },
  );
}

export async function fetchEligibleSummary(params: {
  stage: WorkAssignmentStage;
  warehouse_id: string;
  category_id?: string;
}): Promise<EligibleGrnGroup[]> {
  return apiClient.get<EligibleGrnGroup[]>(
    endpoints.wms.workAssignmentEligibleSummary,
    { params: compactParams(params) },
  );
}

export async function fetchEligibleDevices(
  params: EligibleDeviceParams,
): Promise<EligibleDeviceListResponse> {
  const { part_variant_ids, ...rest } = params;
  return apiClient.get<EligibleDeviceListResponse>(
    endpoints.wms.workAssignmentEligibleDevices,
    // `part_variant_id` repeats (the backend takes a list).
    { params: compactParams({ ...rest, part_variant_id: part_variant_ids }) },
  );
}

export async function fetchEligibleEngineers(params: {
  stage: WorkAssignmentStage;
  warehouse_id: string;
}): Promise<EligibleEngineer[]> {
  return apiClient.get<EligibleEngineer[]>(
    endpoints.wms.workAssignmentEligibleEngineers,
    { params: compactParams(params) },
  );
}

export async function createWorkAssignment(
  body: WorkAssignmentCreateRequest,
): Promise<WorkAssignment> {
  return apiClient.post<WorkAssignment>(endpoints.wms.workAssignments, body);
}

export async function closeWorkAssignment(
  id: string,
  body: WorkAssignmentCloseRequest,
): Promise<WorkAssignment> {
  return apiClient.post<WorkAssignment>(
    endpoints.wms.workAssignmentClose(id),
    body,
  );
}

export async function cancelWorkAssignment(
  id: string,
  body: WorkAssignmentCancelRequest,
): Promise<WorkAssignment> {
  return apiClient.post<WorkAssignment>(
    endpoints.wms.workAssignmentCancel(id),
    body,
  );
}

export async function withdrawWorkAssignmentLines(
  id: string,
  body: WorkAssignmentWithdrawRequest,
): Promise<WorkAssignment> {
  return apiClient.post<WorkAssignment>(
    endpoints.wms.workAssignmentWithdraw(id),
    body,
  );
}

export async function reassignWorkAssignmentLines(
  id: string,
  body: WorkAssignmentReassignRequest,
): Promise<WorkAssignment> {
  return apiClient.post<WorkAssignment>(
    endpoints.wms.workAssignmentReassign(id),
    body,
  );
}

/** What a label print produced — the skipped count MUST reach the operator. */
export interface LabelPrintResult {
  blob: Blob;
  printed: number;
  skipped: number;
  skippedSerials: string[];
}

/** An empty reportlab PDF is ~900 bytes; a single label is comfortably more. */
const EMPTY_PDF_MAX_BYTES = 1200;

export function toPrintResult({
  blob,
  headers,
}: BlobResponse): LabelPrintResult {
  const serials = headers["x-labels-skipped-serials"] ?? "";
  const printedHeader = headers["x-labels-printed"];
  // The BLOB is the source of truth about whether there is anything to show.
  //
  // The counts ride in custom headers, and a cross-origin response only exposes
  // headers the server names in Access-Control-Expose-Headers. When that list
  // was missing these, `printed` read as 0 and a perfectly good 20-page PDF was
  // discarded as "nothing printed" — the header is fixed, but the client should
  // never again be one CORS setting away from throwing away a real document.
  const printedFromHeader =
    printedHeader === undefined ? null : Number(printedHeader);
  const looksEmpty = blob.size <= EMPTY_PDF_MAX_BYTES;
  return {
    blob,
    printed: printedFromHeader ?? (looksEmpty ? 0 : 1),
    skipped: Number(headers["x-labels-skipped"] ?? 0),
    skippedSerials: serials ? serials.split(",").filter(Boolean) : [],
  };
}

export async function printAssignmentLabels(
  id: string,
  opts: { includeLabelled?: boolean; lineIds?: string[] } = {},
): Promise<LabelPrintResult> {
  // A BODY, not query params: this POST mutates, and a repeated ?line_id= on a
  // 200-device lot builds a URL long enough for a proxy to truncate — which
  // would silently print a subset.
  return toPrintResult(
    await apiClient.postBlob(endpoints.wms.workAssignmentLabels(id), {
      line_ids: opts.lineIds ?? null,
      include_labelled: opts.includeLabelled ?? false,
    }),
  );
}
