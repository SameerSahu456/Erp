import type { InspectionStartRequest, InspectionCompleteRequest } from './devices'
import type { DeviceOperation } from './devices'
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

import { ApiError } from "@shared/api/envelope";

/** Cancelling a stage requires a reason (generated `StageCancelRequest`). */
export type StageCancelRequest = components["schemas"]["StageCancelRequest"];

// ── Inspection stage ──
// A stage's "get active op" endpoint returns 404 OPERATION_NOT_FOUND when the
// device has no active op for that stage — a legitimate empty state (e.g. right
// after the op is completed/cancelled), NOT an error. Map it to `null` so the
// query resolves cleanly instead of surfacing a 404 when the post-completion
// invalidation refetches. Any other error still propagates.
export async function fetchActiveOpOrNull(path: string): Promise<DeviceOperation | null> {
  try {
    return await apiClient.get<DeviceOperation>(path);
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.businessCode === "OPERATION_NOT_FOUND" || err.statusCode === 404)
    ) {
      return null;
    }
    throw err;
  }
}

export async function fetchDeviceInspection(
  id: string,
): Promise<DeviceOperation | null> {
  return fetchActiveOpOrNull(endpoints.wms.deviceInspection(id));
}

export async function startDeviceInspection(
  id: string,
  body: InspectionStartRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceInspectionStart(id),
    body,
  );
}

export async function completeDeviceInspection(
  id: string,
  body: InspectionCompleteRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceInspectionComplete(id),
    body,
  );
}

export async function cancelDeviceInspection(
  id: string,
  body: StageCancelRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceInspectionCancel(id),
    body,
  );
}

// ─── Repair / QC / Scrap / Spares stages ─────────────────────────────────────

export type RepairStartRequest = components["schemas"]["RepairStartRequest"];
export type RepairDoneRequest = components["schemas"]["RepairDoneRequest"];
export type QcStartRequest = components["schemas"]["QcStartRequest"];
export type QcCompleteRequest = components["schemas"]["QcCompleteRequest"];
export type ScrapRequest = components["schemas"]["ScrapRequest"];
export type DisposeRequest = components["schemas"]["DisposeRequest"];
export type ScrapPlaceRequest = components["schemas"]["ScrapPlaceRequest"];
export type UnscrapRequest = components["schemas"]["UnscrapRequest"];
export type ScrapPendingPlacementItem =
  components["schemas"]["ScrapPendingPlacementItem"];
export type ScrapPendingPlacementListResponse =
  components["schemas"]["ScrapPendingPlacementListResponse"];
/** The three legal un-scrap destinations. Which are OFFERED depends on the
 *  unit's `scrap_prior_status`, which DeviceSummary now carries. Keep the
 *  dialog's RESTORE_TARGETS in step with SCRAP_RESTORE_TARGETS in the
 *  backend's wms/enums.py. */
export type UnscrapTarget = UnscrapRequest["target"];
export type SpareRequestBulkCreateRequest =
  components["schemas"]["SpareRequestBulkCreateRequest"];
// `return_reason` (the latest return's reason) was added to the backend list
// item; declared locally here until schema.gen.ts is regenerated, so the FE
// types it without pulling in the rest of the stale-schema drift.
export type SpareRequestListResponse = Omit<
  components["schemas"]["SpareRequestListResponse"],
  "items"
> & {
  items: (components["schemas"]["SpareRequestListItem"] & {
    return_reason?: string | null;
    warehouse_id?: string | null;
  })[];
};
export type SpareRequest = components["schemas"]["SpareRequestResponse"];
export type SpareRequestFulfillRequest =
  components["schemas"]["SpareRequestFulfillRequest"];
export type SpareRequestCancelRequest =
  components["schemas"]["SpareRequestCancelRequest"];
export type SpareRequestReturnRequest =
  components["schemas"]["SpareRequestReturnRequest"];
/** One movement against a spare request — a pick (`spare_request`) or a return
 *  (`spare_return`). Read `event_type` to tell them apart. */
export type SpareMovementRow = components["schemas"]["FulfillmentHistoryRow"];
export type SpareRequestFitRequest = components["schemas"]["SpareRequestFitRequest"];
export type SpareReturnDestination = components["schemas"]["SpareRequestReturnLine"]["send_to"];
export type SpareInventoryRow = components["schemas"]["SpareInventoryRow"];

// Checklist template (IMS-owned) resolved onto a device operation at stage
// start. Fetched read-only here so the stage Complete dialogs can render the
// items as a pass/fail/na list.
export type ChecklistTemplate =
  components["schemas"]["ChecklistTemplateResponse"];
export type ChecklistItem = components["schemas"]["ChecklistItem"];
// `photos` (attachment ids) added via local override — a failed Pass/Fail item
// carries its evidence photos on the line. Kept here rather than regenerating
// schema.gen.ts (which drifts); the backend schema already has the field.
export type ChecklistResponseLine =
  components["schemas"]["ChecklistResponseLine"] & {
    photos?: string[] | null;
  };

/** GET /ims/checklists/{id} — a specific template + its items. */
export async function fetchChecklistTemplate(
  templateId: string,
): Promise<ChecklistTemplate> {
  return apiClient.get<ChecklistTemplate>(
    endpoints.ims.imsChecklist(templateId),
  );
}

/** GET /ims/checklists/resolve — the template that applies to a part/category for
 *  a given type_code, walking part → category → parent. Returns null when none
 *  resolves (the endpoint 404s), so the caller can fall back to "no checklist". */
export async function resolveChecklistTemplate(
  targetType: "part" | "category",
  targetId: string,
  typeCode: string,
): Promise<ChecklistTemplate | null> {
  const qs = new URLSearchParams({
    target_type: targetType,
    target_id: targetId,
    type_code: typeCode,
  });
  try {
    return await apiClient.get<ChecklistTemplate>(
      `${endpoints.ims.imsChecklistResolve}?${qs.toString()}`,
    );
  } catch (err) {
    // Only 404 means "no checklist"; other errors must surface so a required checklist isn't skipped.
    if (err instanceof ApiError && err.statusCode === 404) return null;
    throw err;
  }
}

// ── Repair ──
export async function fetchDeviceRepair(id: string): Promise<DeviceOperation | null> {
  return fetchActiveOpOrNull(endpoints.wms.deviceRepair(id));
}
export async function startRepair(
  id: string,
  body: RepairStartRequest = {},
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceRepairStart(id),
    body,
  );
}
export async function completeRepair(
  id: string,
  body: RepairDoneRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceRepairDone(id),
    body,
  );
}
export async function cancelRepair(
  id: string,
  body: StageCancelRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceRepairCancel(id),
    body,
  );
}

// ── QC ──
export async function fetchDeviceQc(id: string): Promise<DeviceOperation | null> {
  return fetchActiveOpOrNull(endpoints.wms.deviceQc(id));
}
export async function startQc(
  id: string,
  body: QcStartRequest = {},
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(endpoints.wms.deviceQcStart(id), body);
}
export async function completeQc(
  id: string,
  body: QcCompleteRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceQcComplete(id),
    body,
  );
}
export async function cancelQc(
  id: string,
  body: StageCancelRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(
    endpoints.wms.deviceQcCancel(id),
    body,
  );
}

