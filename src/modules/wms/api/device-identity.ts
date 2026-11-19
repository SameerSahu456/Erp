import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

// ─── Device identity corrections ───────────────────────────────────────────
//
// Three narrow actions that fix what inward recorded wrongly: a missing or
// mistyped OEM serial, the wrong part, and the wrong PO line.
//
// They are named POSTs rather than a PATCH because each carries side effects a
// PATCH body cannot express — serial uniqueness, a variant_transition stock
// movement, two stock-summary recomputes, PO re-booking, and a checklist
// re-resolution. Spec: comprint-erp-docs/modules/wms/device-identity/spec.md

export type RecordManufacturerSerialRequest =
  components["schemas"]["RecordManufacturerSerialRequest"];
export type ReidentifyDeviceRequest =
  components["schemas"]["ReidentifyDeviceRequest"];
export type RelinkPoItemRequest = components["schemas"]["RelinkPoItemRequest"];
export type DeviceIdentityResponse =
  components["schemas"]["DeviceIdentityResponse"];

/** Fill a blank OEM serial, or correct one recorded wrongly at inward.
 *  `reason` is required by the backend ONLY when a serial is already set —
 *  and correcting one additionally requires store/warehouse manager. */
export async function recordManufacturerSerial(
  id: string,
  body: RecordManufacturerSerialRequest,
): Promise<DeviceIdentityResponse> {
  return apiClient.post<DeviceIdentityResponse>(
    endpoints.wms.deviceManufacturerSerial(id),
    body,
  );
}

/** Re-identify the device onto the part it actually is. Leaves the PO booking
 *  alone — use `relinkPoItem` when the LINE was the thing that was wrong. */
export async function reidentifyDevice(
  id: string,
  body: ReidentifyDeviceRequest,
): Promise<DeviceIdentityResponse> {
  return apiClient.post<DeviceIdentityResponse>(
    endpoints.wms.deviceReidentify(id),
    body,
  );
}

/** Re-point the device at the correct PO line. This MOVES received_quantity
 *  between the two lines and recomputes the PO header status. */
export async function relinkPoItem(
  id: string,
  body: RelinkPoItemRequest,
): Promise<DeviceIdentityResponse> {
  return apiClient.post<DeviceIdentityResponse>(
    endpoints.wms.deviceRelinkPoItem(id),
    body,
  );
}
