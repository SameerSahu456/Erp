import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

// ── Device contents across return and inspection ─────────────────────────
//
// A returned device's components come back with it, due for checking
// (comprint-erp-docs/modules/wms/component-tracking/dispatch-return-replacement.md
// D3-D5). The list itself is the IMS components view (`useStockItemComponents`);
// these settle each row.

export type DeviceComponentCheckResponse =
  components["schemas"]["DeviceComponentCheckResponse"];
export type DeviceComponentRecordedResponse =
  components["schemas"]["DeviceComponentRecordedResponse"];
export type DeviceComponentMissingRequest =
  components["schemas"]["DeviceComponentMissingRequest"];
export type DeviceComponentFoundRequest =
  components["schemas"]["DeviceComponentFoundRequest"];
export type DeviceComponentIdentifyRequest =
  components["schemas"]["DeviceComponentIdentifyRequest"];
export type DeviceComponentUndoAddRequest =
  components["schemas"]["DeviceComponentUndoAddRequest"];

export type DeviceComponentsConfirmAllResponse =
  components["schemas"]["DeviceComponentsConfirmAllResponse"];

/** Confirm every component waiting to be checked on the device, in one go
 *  (inward-verification D3). */
export async function confirmAllDeviceComponents(
  deviceId: string,
): Promise<DeviceComponentsConfirmAllResponse> {
  return apiClient.post<DeviceComponentsConfirmAllResponse>(
    endpoints.wms.deviceContentsConfirmAll(deviceId),
    {},
  );
}

/** Confirm a component recorded inside the device is really there (inspection). */
export async function confirmDeviceComponent(
  deviceId: string,
  componentId: string,
): Promise<DeviceComponentCheckResponse> {
  return apiClient.post<DeviceComponentCheckResponse>(
    endpoints.wms.deviceContentsConfirm(deviceId, componentId),
    {},
  );
}

/** The component is not inside: its unit stays with the customer. */
export async function markDeviceComponentMissing(
  deviceId: string,
  componentId: string,
  body: DeviceComponentMissingRequest,
): Promise<DeviceComponentCheckResponse> {
  return apiClient.post<DeviceComponentCheckResponse>(
    endpoints.wms.deviceContentsMarkMissing(deviceId, componentId),
    body,
  );
}

/** A component marked missing turned up after all — same unit, no serial needed. */
export async function markDeviceComponentFound(
  deviceId: string,
  componentId: string,
): Promise<DeviceComponentCheckResponse> {
  return apiClient.post<DeviceComponentCheckResponse>(
    endpoints.wms.deviceContentsFound(deviceId, componentId),
    {},
  );
}

/** Add a component that is inside the device but not recorded yet — one row
 *  per unit (several at once for an IMS part with no serial). */
export async function recordFoundDeviceComponent(
  deviceId: string,
  body: DeviceComponentFoundRequest,
): Promise<DeviceComponentRecordedResponse[]> {
  return apiClient.post<DeviceComponentRecordedResponse[]>(
    endpoints.wms.deviceContents(deviceId),
    body,
  );
}

/** Link a described component to its IMS part (store / warehouse manager). */
export async function identifyDeviceComponent(
  deviceId: string,
  componentId: string,
  body: DeviceComponentIdentifyRequest,
): Promise<DeviceComponentRecordedResponse> {
  return apiClient.post<DeviceComponentRecordedResponse>(
    endpoints.wms.deviceContentsIdentify(deviceId, componentId),
    body,
  );
}

/** Undo a pull made by mistake: the same part goes back inside the device. */
export async function putBackPulledComponent(
  deviceId: string,
  componentId: string,
): Promise<DeviceComponentCheckResponse> {
  return apiClient.post<DeviceComponentCheckResponse>(
    endpoints.wms.stockItemComponentPutBack(deviceId, componentId),
    {},
  );
}

/** Undo a hand add made by mistake: the part was never inside this device. */
export async function undoComponentAdd(
  deviceId: string,
  componentId: string,
  body: DeviceComponentUndoAddRequest,
): Promise<void> {
  await apiClient.post<null>(
    endpoints.wms.stockItemComponentUndoAdd(deviceId, componentId),
    body,
  );
}
