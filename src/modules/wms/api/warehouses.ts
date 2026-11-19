import { DEFAULT_FETCH_LIMIT } from "../constants/list";
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

// ─── Domain types — sourced from the generated OpenAPI schema ────────────────

export type Warehouse = components["schemas"]["WarehouseResponse"];
export type WarehouseCreate = components["schemas"]["WarehouseCreate"];
export type WarehouseUpdate = components["schemas"]["WarehouseUpdate"];

export type WarehouseLocation =
  components["schemas"]["WarehouseLocationResponse"];
export type WarehouseLocationCreate =
  components["schemas"]["WarehouseLocationCreate"];
export type WarehouseLocationUpdate =
  components["schemas"]["WarehouseLocationUpdate"];
export type WarehouseLocationTreeNode =
  components["schemas"]["WarehouseLocationTreeNode"];
export type WarehouseLocationWithOccupancy =
  components["schemas"]["WarehouseLocationWithOccupancy"];
export type LocationContentsRow = components["schemas"]["LocationContentsRow"];
export type WarehouseStorageSummary =
  components["schemas"]["WarehouseStorageSummaryResponse"];

// Paginated wrapper for the warehouse list endpoint — the exact shape the
// backend returns (`PaginatedResponse[WarehouseResponse]`): page/page_size, NOT
// offset/limit. The endpoint only reads `page`/`page_size`; sending
// offset/limit was silently ignored (every page returned page 1).
export type WarehousePage =
  components["schemas"]["PaginatedResponse_WarehouseResponse_"];

// ─── Warehouse query params ──────────────────────────────────────────────────

export interface WarehouseListParams {
  q?: string;
  is_active?: boolean;
  category_id?: string;
  condition?: string;
  sort?: string;
  page?: number;
  page_size?: number;
  // Transfer-destination picker mode: return EVERY active warehouse, bypassing
  // the caller's assigned-warehouse scope. A transfer may go to any warehouse,
  // so a scoped manager must still see the others to send to them (CP-375 #2).
  as_transfer_target?: boolean;
}

// ─── Warehouse CRUD ──────────────────────────────────────────────────────────

export async function fetchWarehousesPage(
  params: WarehouseListParams,
): Promise<WarehousePage> {
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? DEFAULT_FETCH_LIMIT;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", String(pageSize));
  if (params.q) qs.set("q", params.q);
  if (params.is_active != null) qs.set("is_active", String(params.is_active));
  if (params.category_id) qs.set("category_id", params.category_id);
  if (params.condition) qs.set("condition", params.condition);
  if (params.sort) qs.set("sort", params.sort);
  if (params.as_transfer_target) qs.set("as_transfer_target", "true");

  return apiClient.get<WarehousePage>(
    `${endpoints.wms.warehouses}?${qs.toString()}`,
  );
}

export async function fetchWarehouse(id: string): Promise<Warehouse> {
  return apiClient.get<Warehouse>(endpoints.wms.warehouse(id));
}

export async function createWarehouse(
  body: WarehouseCreate,
): Promise<Warehouse> {
  return apiClient.post<Warehouse>(endpoints.wms.warehouses, body);
}

export async function updateWarehouse(
  id: string,
  body: WarehouseUpdate,
): Promise<Warehouse> {
  return apiClient.patch<Warehouse>(endpoints.wms.warehouse(id), body);
}

export async function activateWarehouse(id: string): Promise<Warehouse> {
  return apiClient.post<Warehouse>(endpoints.wms.warehouseActivate(id), {});
}

export async function deactivateWarehouse(id: string): Promise<Warehouse> {
  return apiClient.post<Warehouse>(endpoints.wms.warehouseDeactivate(id), {});
}

// Soft-delete. The backend guards the row: 409 ``WAREHOUSE_HAS_REFERENCES``
// when it still has live stock items or locations — the caller must empty or
// deactivate it first. Returns no body (``ApiResponse[None]``).
export async function deleteWarehouse(id: string): Promise<void> {
  await apiClient.delete<null>(endpoints.wms.warehouse(id));
}

// ─── Warehouse Locations (B2.3) ──────────────────────────────────────────────

export async function fetchLocationsTree(
  warehouseId: string,
): Promise<WarehouseLocationTreeNode[]> {
  return apiClient.get<WarehouseLocationTreeNode[]>(
    endpoints.wms.warehouseLocationsTree(warehouseId),
  );
}

export type RackSummary = components["schemas"]["RackSummaryResponse"];

export type RackKind = "direct" | "with-bins";

export interface WarehouseRacksParams {
  page: number;
  page_size: number;
  /** Case-insensitive; also matches a rack by the name of a bin inside it. */
  search?: string;
  kind?: RackKind;
  is_active?: boolean;
  sort?: string;
}

/** One page of the warehouse's rack table, with bins rolled up. A rack's own
 *  bins load lazily on expand via {@link fetchRackChildren}. */
export async function fetchWarehouseRacks(
  warehouseId: string,
  params: WarehouseRacksParams,
): Promise<RackOptionsPage> {
  const qs = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  });
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.kind) qs.set("kind", params.kind);
  if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));
  if (params.sort) qs.set("sort", params.sort);
  return apiClient.get<RackOptionsPage>(
    `${endpoints.wms.warehouseRacks(warehouseId)}?${qs.toString()}`,
  );
}

/** Rack, bin and slot counts behind the warehouse's storage summary. */
export async function fetchStorageSummary(
  warehouseId: string,
): Promise<WarehouseStorageSummary> {
  return apiClient.get<WarehouseStorageSummary>(
    endpoints.wms.warehouseStorageSummary(warehouseId),
  );
}

/** One rack or bin in full — the edit form needs what the table row leaves out. */
export async function fetchLocation(locationId: string): Promise<WarehouseLocation> {
  return apiClient.get<WarehouseLocation>(endpoints.wms.warehouseLocation(locationId));
}

/** The bins under one rack — fetched lazily when the rack is expanded. */
export async function fetchRackChildren(
  rackId: string,
): Promise<WarehouseLocationTreeNode[]> {
  return apiClient.get<WarehouseLocationTreeNode[]>(
    endpoints.wms.warehouseRackChildren(rackId),
  );
}

export type RackOptionsPage =
  components["schemas"]["PaginatedResponse_RackSummaryResponse_"];
export type BinOptionsPage =
  components["schemas"]["PaginatedResponse_WarehouseLocationTreeNode_"];
export type RackOption = RackOptionsPage["items"][number];
export type BinOption = BinOptionsPage["items"][number];

/** Searchable + paged racks for the assignment pickers (§16.11). `search` is a
 *  case-insensitive rack-name substring; the server pages so the dropdown loads
 *  more on scroll instead of pulling every rack. */
export async function fetchRackOptions(
  warehouseId: string,
  params: { page: number; page_size: number; search?: string },
): Promise<RackOptionsPage> {
  const qs = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  });
  if (params.search?.trim()) qs.set("search", params.search.trim());
  return apiClient.get<RackOptionsPage>(
    `${endpoints.wms.warehouseRackOptions(warehouseId)}?${qs.toString()}`,
  );
}

/** Searchable + paged bins under one rack for the assignment pickers (§16.11). */
export async function fetchBinOptions(
  rackId: string,
  params: { page: number; page_size: number; search?: string },
): Promise<BinOptionsPage> {
  const qs = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  });
  if (params.search?.trim()) qs.set("search", params.search.trim());
  return apiClient.get<BinOptionsPage>(
    `${endpoints.wms.warehouseBinOptions(rackId)}?${qs.toString()}`,
  );
}

/** Locations a fresh stock unit can land in right now — already filtered by the
 *  backend to can_store_stock + is_active + room-left, excluding rack-with-bins.
 *  Drives the Assign-to-Rack picker. */
export async function fetchAssignableLocations(
  warehouseId: string,
): Promise<WarehouseLocationWithOccupancy[]> {
  return apiClient.get<WarehouseLocationWithOccupancy[]>(
    endpoints.wms.warehouseAssignableLocations(warehouseId),
  );
}

// A single location can hold tens of thousands of stock units, so contents
// are paged (backend returns `PaginatedResponse[LocationContentsRow]`: page /
// page_size / total). Callers page through via ``useLocationContents``.
export type LocationContentsPage =
  components["schemas"]["PaginatedResponse_LocationContentsRow_"];

export interface LocationContentsParams {
  page: number;
  page_size: number;
  search?: string;
  /** Serial, part or variant name; `-` prefix for descending. */
  sort?: string;
  condition?: string;
  /** A stock_items.status value. */
  status?: string;
}

export async function fetchLocationContentsPage(
  locationId: string,
  params: LocationContentsParams,
): Promise<LocationContentsPage> {
  const qs = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  });
  if (params.search?.trim()) qs.set("q", params.search.trim());
  if (params.sort) qs.set("sort", params.sort);
  if (params.condition) qs.set("condition", params.condition);
  if (params.status) qs.set("status", params.status);
  return apiClient.get<LocationContentsPage>(
    `${endpoints.wms.warehouseLocationContents(locationId)}?${qs.toString()}`,
  );
}

export async function createLocation(
  warehouseId: string,
  body: WarehouseLocationCreate,
): Promise<WarehouseLocation> {
  return apiClient.post<WarehouseLocation>(
    endpoints.wms.warehouseLocations(warehouseId),
    body,
  );
}

export async function updateLocation(
  locationId: string,
  body: WarehouseLocationUpdate,
): Promise<WarehouseLocation> {
  return apiClient.patch<WarehouseLocation>(
    endpoints.wms.warehouseLocation(locationId),
    body,
  );
}

// Soft-delete a rack or bin. The backend guards the row: 409
// ``LOCATION_HAS_REFERENCES`` when it's occupied or (for a rack-with-bins)
// still has live child bins — the caller must empty/remove those first.
// Returns no body (``ApiResponse[None]``).
export async function deleteLocation(locationId: string): Promise<void> {
  await apiClient.delete<null>(endpoints.wms.warehouseLocation(locationId));
}
