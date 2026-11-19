import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";
import { appendLists, appendQuery } from "./query-string";

// ─── Devices + operations (inspection / repair / qc / scrap) ────────────────
//
// The device record is lean (serial, status, workflow_status, warehouse_id,
// part_variant_id, dates). Part labels (brand/model/category) are resolved
// from `part_variant_id` by the page via the IMS variant lookup; the workflow
// stage lives in `active_operation` / the per-stage operation endpoints.

export type DeviceSummary = components["schemas"]["DeviceSummary"];
export type DeviceListResponse = components["schemas"]["DeviceListResponse"];
export type DeviceDossier = components["schemas"]["DeviceDossier"];
export type DeviceStatsResponse = components["schemas"]["DeviceStatsResponse"];
export type DeviceOperation = components["schemas"]["OperationResponse"];
export type WorkflowHistoryEntry =
  components["schemas"]["WorkflowHistoryEntry"];
export type DeviceTimeLog = components["schemas"]["DeviceTimeLog"];
export type DeviceTimeLogRow = components["schemas"]["DeviceTimeLogRow"];
export type ChecklistRunView = components["schemas"]["ChecklistRunView"];
export type ChecklistRunAnswer = components["schemas"]["ChecklistRunAnswer"];
export type ChecklistRunPhoto = components["schemas"]["ChecklistRunPhoto"];
export type DeviceAssignableUser = components["schemas"]["AssignableUser"];
export type MyWarehouse = components["schemas"]["MyWarehouse"];
export type InspectionStartRequest =
  components["schemas"]["InspectionStartRequest"];
export type InspectionCompleteRequest =
  components["schemas"]["InspectionCompleteRequest"];
export type DeviceAssignmentRequest =
  components["schemas"]["DeviceAssignmentRequest"];
export type RackAssignRequest = components["schemas"]["RackAssignRequest"];

// Operation lifecycle stage shown on a device (the picker on the assignable-
// users endpoint).
export type OperationStage =
  "inspection" | "repair" | "qc" | "vendor_service" | "rack_assign";

export interface DeviceListParams {
  // Multi-value filters — accept a single value or an array; each is sent as a
  // repeated query param (FastAPI list style).
  workflow_status?: string | string[];
  device_status?: string | string[];
  /** QC grade (A/B) from the device's newest completed QC op. */
  qc_grade?: string | string[];
  /** Only devices with a component still waiting to be checked (Status filter's
   *  "Unchecked components"). */
  components_unchecked?: boolean;
  operation_type?: string | string[];
  operation_status?: string | string[];
  assignee_id?: string;
  warehouse_id?: string;
  /** Navbar multi-select — the union of these warehouses. */
  warehouse_ids?: string[];
  batch_id?: string;
  /** Devices inwarded on any GRN against this PO (PO detail → Devices tab). */
  purchase_order_id?: string;
  category_id?: string;
  variant_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  sort?: string;
  page?: number;
  page_size?: number;
  /** GET /devices/stats only: also return this stage's "Completed" tab count
   *  (`completed_count`) in the same call. Ignored by the list. */
  completed_op_type?: string;
}

// Shared by the list and the stats call, in the order the URL is built.
const DEVICE_FACET_KEYS = [
  "search",
  "warehouse_id",
  "warehouse_ids",
  "assignee_id",
  "batch_id",
  "purchase_order_id",
  "category_id",
  "variant_id",
  "from_date",
  "to_date",
  // Was missing, so the "Unchecked components" pick was silently dropped.
  "components_unchecked",
] as const satisfies readonly (keyof DeviceListParams)[];
const DEVICE_LIST_KEYS = [
  "workflow_status",
  "device_status",
  "qc_grade",
  "operation_type",
  "operation_status",
] as const satisfies readonly (keyof DeviceListParams)[];

export async function fetchDevicesPage(
  params: DeviceListParams = {},
): Promise<DeviceListResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? 25));
  appendQuery(qs, params, ["sort", ...DEVICE_FACET_KEYS]);
  appendLists(qs, params, DEVICE_LIST_KEYS);
  return apiClient.get<DeviceListResponse>(
    `${endpoints.wms.devices}?${qs.toString()}`,
  );
}

export async function fetchDeviceStats(
  params: DeviceListParams = {},
): Promise<DeviceStatsResponse> {
  const qs = new URLSearchParams();
  // The stats counts must honour EVERY list facet (and the operation facets,
  // CP-193 #9) or the badge counts stop matching the list.
  appendQuery(qs, params, [...DEVICE_FACET_KEYS, "completed_op_type"]);
  appendLists(qs, params, DEVICE_LIST_KEYS);
  const q = qs.toString();
  return apiClient.get<DeviceStatsResponse>(
    `${endpoints.wms.deviceStats}${q ? `?${q}` : ""}`,
  );
}

export async function fetchDevice(id: string): Promise<DeviceDossier> {
  return apiClient.get<DeviceDossier>(endpoints.wms.device(id));
}

/** The WMS pages that have stat cards — the backend `scope` enum (generated;
 *  a hand-kept union had drifted to "vendor_service", which the API 422s). */
export type WmsStatsScope = components["schemas"]["WmsStatsScope"];

/** GET /wms/stats/{scope} — a flat {card_key: count} map for one page's cards.
 *  Filter-independent; scoped only to the given warehouse. */
export type WmsStatsResponse = components["schemas"]["WmsStatsResponse"];

export async function fetchWmsStats(
  scope: WmsStatsScope,
  warehouseIds?: string[],
  assigneeId?: string,
): Promise<WmsStatsResponse> {
  const qs = new URLSearchParams();
  // Navbar multi-select — repeat the param (union of these warehouses).
  for (const id of warehouseIds ?? []) qs.append("warehouse_ids", id);
  if (assigneeId) qs.set("assignee_id", assigneeId);
  const q = qs.toString();
  return apiClient.get<WmsStatsResponse>(
    `${endpoints.wms.wmsStats(scope)}${q ? `?${q}` : ""}`,
  );
}

/** The device's whole workflow history, newest first (not paged). */
export async function fetchDeviceWorkflowHistory(
  id: string,
): Promise<WorkflowHistoryEntry[]> {
  return apiClient.get<WorkflowHistoryEntry[]>(
    endpoints.wms.deviceWorkflowHistory(id),
  );
}

export async function fetchDeviceTimeLog(id: string): Promise<DeviceTimeLog> {
  return apiClient.get<DeviceTimeLog>(endpoints.wms.deviceTimeLog(id));
}

export async function fetchDeviceChecklistRuns(
  id: string,
): Promise<ChecklistRunView[]> {
  return apiClient.get<ChecklistRunView[]>(
    endpoints.wms.deviceChecklistRuns(id),
  );
}

export async function fetchDeviceAssignableUsers(
  id: string,
  stage: OperationStage,
  includeInactive = false,
): Promise<DeviceAssignableUser[]> {
  const qs = new URLSearchParams({ stage });
  if (includeInactive) qs.set("include_inactive", "true");
  return apiClient.get<DeviceAssignableUser[]>(
    `${endpoints.wms.deviceAssignableUsers(id)}?${qs.toString()}`,
  );
}

export async function fetchMyWarehouses(): Promise<MyWarehouse[]> {
  return apiClient.get<MyWarehouse[]>(endpoints.wms.myWarehouses);
}

export async function assignDevice(
  id: string,
  body: DeviceAssignmentRequest,
): Promise<DeviceOperation> {
  return apiClient.patch<DeviceOperation>(
    endpoints.wms.deviceAssignment(id),
    body,
  );
}

export async function rackAssignDevice(
  id: string,
  body: RackAssignRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceRackAssign(id),
    body,
  );
}

// ── Composition (BOM Lite) ───────────────────────────────────────────────
//
// Since component-tracking D1 every recorded component is backed by a real
// `stock_items` row at `status='installed'`, so these are inventory
// mutations, not annotations.

export type SiComponentAddItem = components["schemas"]["SiComponentAddItem"];
export type SiComponentsActionAdd =
  components["schemas"]["SiComponentsActionAdd"];
export type SiComponentsActionPull =
  components["schemas"]["SiComponentsActionPull"];

/** Record component(s) as fitted inside a parent unit.
 *
 *  `quantity: 4` mints FOUR tracked units, each with its own serial — there is
 *  no quantity column on stock_items (D2). That is what makes any one of them
 *  individually pullable and traceable. */
export async function addStockItemComponents(
  stockItemId: string,
  components: SiComponentAddItem[],
): Promise<unknown> {
  const body: SiComponentsActionAdd = { action: "add", components };
  return apiClient.post<unknown>(
    endpoints.wms.stockItemComponentsMutate(stockItemId),
    body,
  );
}

/** Pull one component out of a parent and return it to stock.
 *
 *  `result_status: 'available'` does NOT make it sellable: D6 routes it to
 *  inward QC first, because it was only ever tested inside the parent.
 *  `'repair'` opens a repair op; `'scrap'` writes it off with `notes` as the
 *  required reason. */
export async function pullStockItemComponent(
  stockItemId: string,
  body: Omit<SiComponentsActionPull, "action">,
): Promise<unknown> {
  return apiClient.post<unknown>(
    endpoints.wms.stockItemComponentsMutate(stockItemId),
    { action: "pull", ...body },
  );
}
