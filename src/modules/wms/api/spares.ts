import type { SpareMovementRow, SpareRequestCancelRequest, SpareRequestFitRequest } from './stages'
import type { DeviceOperation } from './devices'
import type { DisposeRequest, ScrapPendingPlacementListResponse, ScrapPlaceRequest, ScrapRequest, UnscrapRequest, SpareRequestBulkCreateRequest, SpareRequestListResponse, SpareRequest, SpareRequestFulfillRequest, SpareRequestReturnRequest } from './stages'
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";
import { appendQuery } from "./query-string";
import { WMS_PAGE_SIZE } from "../constants";

// ── Scrap ──
// Condemn (engineer) → place / reverse (store manager) → dispose (the only
// irreversible step). See comprint-erp-docs/modules/wms/device-scrap/spec.md.
export async function scrapDevice(
  id: string,
  body: ScrapRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(endpoints.wms.deviceScrap(id), body);
}

/** Shelve a condemned unit. Manager-only; enforces the location's capacity. */
export async function placeScrappedDevice(
  id: string,
  body: ScrapPlaceRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(endpoints.wms.deviceScrapPlace(id), body);
}

/** Overrule a condemnation. The server validates `target` against the unit's
 *  `scrap_prior_status` — a device condemned mid-pipeline never passed QC, so
 *  `available` is refused for it. */
export async function unscrapDevice(
  id: string,
  body: UnscrapRequest,
): Promise<DeviceOperation> {
  return apiClient.post<DeviceOperation>(endpoints.wms.deviceUnscrap(id), body);
}

/** Condemned units with no recorded location — the store manager's queue.
 *  Scrap never places a unit, so this is how a dead box gets onto a shelf. */
export async function fetchScrapPendingPlacement(
  warehouseIds?: readonly string[],
  page = 1,
  pageSize = WMS_PAGE_SIZE,
): Promise<ScrapPendingPlacementListResponse> {
  // Repeated `warehouse_ids`, the navbar multi-select shape every other WMS
  // list honours. Omitting it returns every warehouse the caller is assigned
  // to — the server scopes by assignment — and that is also the only way a
  // unit with a NULL warehouse_id is ever surfaced.
  const params = new URLSearchParams();
  for (const id of warehouseIds ?? []) params.append("warehouse_ids", id);
  // Server-paginated (§16.7). The queue only shrinks when a manager shelves a
  // unit, so a bulk write-off would otherwise return every row at once.
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  return apiClient.get<ScrapPendingPlacementListResponse>(
    `${endpoints.wms.scrapPendingPlacement}?${params.toString()}`,
  );
}

/**
 * Write a unit off the books — the one irreversible step (device-scrap D2).
 * Frees the slot and permanently burns the manufacturer serial against
 * re-inward. Lives here beside scrap/place/unscrap because the four verbs
 * read as one flow on every device-scrap surface, even though the endpoint
 * itself belongs to IMS (`StockService.dispose_stock_item`) — there is no
 * `endpoints.wms` entry for it, only `endpoints.ims.stockItemDispose`.
 * A reason is mandatory (CP-550 #4); the envelope's `data` is `None` on success.
 */
export async function disposeDevice(id: string, body: DisposeRequest): Promise<void> {
  await apiClient.post<null>(endpoints.ims.stockItemDispose(id), body);
}

// ── Spares ──
export interface SpareRequestListParams {
  warehouse_id?: string;
  /** Navbar multi-select — union of these warehouses. Repeated as
   *  `warehouse_ids`. Empty/omitted = all accessible warehouses. */
  warehouse_ids?: string[];
  status?: string;
  /** The two worklist tabs, as a server query ("pending" | "closed"). */
  status_group?: string;
  /** Server-side filters (every filter is an API call). */
  category_id?: string;
  variant_id?: string;
  search?: string;
  /** Requested-on date range (IST calendar days, inclusive). `YYYY-MM-DD`. */
  date_from?: string;
  date_to?: string;
  /** Server-side sort: "part_number" | "variant" | "requested_at", "-" = desc. */
  sort?: string;
  /** One device's requests (the request-spares dialog's existing list). */
  stock_item_id?: string;
  page?: number;
  page_size?: number;
}
export async function fetchSpareRequests(
  params: SpareRequestListParams = {},
): Promise<SpareRequestListResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? 25));
  appendQuery(qs, params, [
    "warehouse_id", "warehouse_ids", "status", "status_group", "category_id",
    "variant_id", "search", "date_from", "date_to", "sort", "stock_item_id",
  ]);
  return apiClient.get<SpareRequestListResponse>(
    `${endpoints.wms.spareRequests}?${qs.toString()}`,
  );
}
// Accurate per-status counts for the spares tabs — the list can only filter by
// one exact status, so "Pending" (a group) gets its count from here.
export type SpareRequestStats =
  components["schemas"]["SpareRequestStatsResponse"];
export async function fetchSpareRequestStats(
  warehouseId?: string,
): Promise<SpareRequestStats> {
  const qs = new URLSearchParams();
  if (warehouseId) qs.set("warehouse_id", warehouseId);
  const suffix = qs.toString();
  return apiClient.get<SpareRequestStats>(
    `${endpoints.wms.spareRequestsStats}${suffix ? `?${suffix}` : ""}`,
  );
}
/** One server-paginated page of spare inventory (§16.7). */
export type SparesInventoryPage = components["schemas"]["SpareInventoryListResponse"];

export interface SparesInventoryParams {
  warehouseIds?: string[];
  page?: number;
  pageSize?: number;
}

export async function fetchSparesInventory(
  params: SparesInventoryParams = {},
): Promise<SparesInventoryPage> {
  const qs = new URLSearchParams();
  // Navbar multi-select — repeat the param (union of these warehouses).
  for (const id of params.warehouseIds ?? []) qs.append("warehouse_ids", id);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  const q = qs.toString();
  return apiClient.get<SparesInventoryPage>(
    `${endpoints.wms.sparesInventory}${q ? `?${q}` : ""}`,
  );
}
export async function createSpareRequests(
  id: string,
  body: SpareRequestBulkCreateRequest,
): Promise<unknown> {
  return apiClient.post<unknown>(endpoints.wms.deviceSpareRequests(id), body);
}
/** Fulfill a spare request by recording the stock units used for it. */
export async function fulfillSpareRequest(
  reqId: string,
  body: SpareRequestFulfillRequest,
): Promise<SpareRequest> {
  return apiClient.post<SpareRequest>(
    endpoints.wms.spareRequestFulfill(reqId),
    body,
  );
}
/** Put fulfilled-but-unneeded spare units back on the rack.
 *
 * Store-manager-only server-side. Never reopens the request: quantity_fulfilled
 * and status are untouched, only quantity_returned moves.
 */
export async function returnSpareRequestUnits(
  reqId: string,
  body: SpareRequestReturnRequest,
): Promise<SpareRequest> {
  return apiClient.post<SpareRequest>(
    endpoints.wms.spareRequestReturn(reqId),
    body,
  );
}
/** Record fulfilled spares as components inside the request's device
 *  (consumed → installed). The request still counts them as fulfilled. */
export async function fitSpareRequestUnits(
  reqId: string,
  body: SpareRequestFitRequest,
): Promise<unknown> {
  return apiClient.post<unknown>(endpoints.wms.spareRequestFit(reqId), body);
}
/** Movements against a spare request — picks, returns and fits, oldest first. */
export async function fetchSpareMovements(
  reqId: string,
): Promise<SpareMovementRow[]> {
  return apiClient.get<SpareMovementRow[]>(
    endpoints.wms.spareRequestFulfillments(reqId),
  );
}
/** Cancel a spare request (reason appended to its notes). */
export async function cancelSpareRequest(
  reqId: string,
  body: SpareRequestCancelRequest,
): Promise<SpareRequest> {
  return apiClient.post<SpareRequest>(
    endpoints.wms.spareRequestCancel(reqId),
    body,
  );
}


