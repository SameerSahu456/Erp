import type { components } from "@/shared/api/schema.gen";

import { apiClient, compactParams } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { PAGINATION } from "@/shared/constants";

// Tracked rental units.

export type RentalDevice = components["schemas"]["RentalDeviceResponse"];

/** Stored status of one physical unit. */
export type DeviceStatus = RentalDevice["status"];

/** What a unit reads as today — the stored set plus the two derived ones. */
export type DeviceDisplayStatus = DeviceStatus | "Alert" | "Overdue";

export type ReplacementStatus = "pending" | "confirmed" | "cancelled";

export interface RentalDevicesPage {
  items: RentalDevice[];
  total: number;
  page: number;
  page_size: number;
}

export type DeviceStatusSummary = components["schemas"]["DeviceStatusSummary"];

export interface FetchDevicesParams {
  page?: number;
  page_size?: number;
  account_id?: string;
  sales_order_id?: string;
  /** ONE sales-order line's units — by id, since two lines may share a name. */
  /** Scopes to these sales-order lines' units — one, or several when a
   *  merged row on the order hands off every line behind it (sent as a
   *  repeated param). The lines' ids, never their names: two lines on an
   *  order may share an `item_name`. */
  sales_order_item_id?: string | string[];
  /** Exact account NAME — what the list's dropdown offers. */
  account?: string;
  /** Return date (the unit's last rental day), `YYYY-MM-DD`. Both ends
   *  INCLUSIVE; a unit with no return date falls outside any range. */
  return_from?: string;
  return_to?: string;
  /** `-` prefix for descending; unknown keys fall back to serial-ascending. */
  sort?: string;
  /** Filters the DERIVED status, so `Alert` / `Overdue` are selectable.
   *  Several are sent as a repeated param and match ANY of them. */
  status?: DeviceDisplayStatus | DeviceDisplayStatus[];
  q?: string;
}

// GET /api/v1/rentals/devices
export async function fetchRentalDevices(
  params: FetchDevicesParams = {},
): Promise<RentalDevicesPage> {
  return apiClient.get<RentalDevicesPage>(endpoints.rentals.devices, {
    params: compactParams({
      ...params,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      q: params.q?.trim(),
    }),
  });
}

/** One thing that happened to a unit — a flat chronological list. */
export type DeviceHistoryEntry = components["schemas"]["DeviceHistoryEntry"];
export type DeviceHistory = components["schemas"]["DeviceHistoryResponse"];

export async function fetchDeviceHistory(
  deviceId: string,
): Promise<DeviceHistory> {
  return apiClient.get<DeviceHistory>(
    endpoints.rentals.deviceHistory(deviceId),
  );
}

export async function fetchRentalDevice(
  deviceId: string,
): Promise<RentalDevice> {
  return apiClient.get<RentalDevice>(endpoints.rentals.device(deviceId));
}

/** The list's own filters minus status (that is what the summary counts by),
 *  so the tab counts and cards follow what the list shows. */
export type DeviceSummaryParams = Omit<FetchDevicesParams, "page" | "page_size" | "sort" | "status">;

// GET /api/v1/rentals/devices/summary
export async function fetchDeviceSummary(
  params: DeviceSummaryParams = {},
): Promise<DeviceStatusSummary> {
  return apiClient.get<DeviceStatusSummary>(endpoints.rentals.deviceSummary, {
    params: compactParams({ ...params, q: params.q?.trim() }),
  });
}

export interface HoldDevicePayload {
  from_date: string;
  until?: string | null;
  reason?: string | null;
}

export async function holdDevice(
  deviceId: string,
  payload: HoldDevicePayload,
): Promise<RentalDevice> {
  return apiClient.post<RentalDevice>(
    endpoints.rentals.deviceHold(deviceId),
    payload,
  );
}

export async function unholdDevice(
  deviceId: string,
  payload: { unhold_day?: string | null } = {},
): Promise<RentalDevice> {
  return apiClient.post<RentalDevice>(
    endpoints.rentals.deviceUnhold(deviceId),
    payload,
  );
}

export interface ExtendDevicePayload {
  new_end_date: string;
  /** Required with `monthly_rate`: rates never change mid-tenure. */
  rate_effective_date?: string | null;
  monthly_rate?: string | null;
  reason?: string | null;
}

/** Extend one unit, and through it its order. */
export async function extendDevice(
  deviceId: string,
  payload: ExtendDevicePayload,
): Promise<RentalDevice> {
  return apiClient.post<RentalDevice>(
    endpoints.rentals.deviceExtend(deviceId),
    payload,
  );
}

export async function markDeviceDelivered(
  deviceId: string,
  payload: { delivered_on: string },
): Promise<RentalDevice> {
  return apiClient.post<RentalDevice>(
    endpoints.rentals.deviceDelivered(deviceId),
    payload,
  );
}

/** The dates an extend may use, from the same validators the write runs.
 *  A null bound means unbounded. Shared by the unit and order extends. */
export type ExtendBounds = components["schemas"]["ExtendBoundsResponse"];

// GET /api/v1/rentals/devices/{id}/extend-bounds
export async function fetchExtendBounds(
  deviceId: string,
): Promise<ExtendBounds> {
  return apiClient.get<ExtendBounds>(endpoints.rentals.extendBounds(deviceId));
}

export type DeviceIdentityReconcile =
  components["schemas"]["DeviceIdentityReconcileResponse"];

export async function fetchDeviceIdentityReconcile(): Promise<DeviceIdentityReconcile> {
  return apiClient.get<DeviceIdentityReconcile>(
    endpoints.rentals.deviceIdentityReconcile,
  );
}
