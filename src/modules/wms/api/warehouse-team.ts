import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";
import { PAGINATION } from "@shared/constants";

// ─── Warehouse team assignments ──────────────────────────────────────────────

export type WarehouseAssignmentListItem =
  components["schemas"]["WarehouseUserAssignmentListItem"];
export type WarehouseAssignmentResponse =
  components["schemas"]["WarehouseUserAssignmentResponse"];
export type WarehouseAssignmentCreate =
  components["schemas"]["WarehouseUserAssignmentCreate"];

// Backend assignment enums, from the generated contract (the hand-kept copy
// still offered the retired "display" level, which the API rejects).
type AssignmentListItem = components["schemas"]["WarehouseUserAssignmentListItem"];
export type AssignmentRole = AssignmentListItem["role"];
export type AssignmentLevel = NonNullable<AssignmentListItem["level"]>;
export type AssignmentCapability = NonNullable<AssignmentListItem["capabilities"]>[number];

// PATCH body — only level / capabilities / notes are mutable (role is
// immutable per BR-5). Mirrors backend ``WarehouseUserAssignmentUpdate``.
export interface WarehouseAssignmentUpdate {
  level?: AssignmentLevel | null;
  capabilities?: AssignmentCapability[] | null;
  notes?: string | null;
}

/** List the FULL active team assigned to a warehouse (spec §9.2).
 *
 *  Pages through every assignment instead of returning only the backend's
 *  first page. Its consumers are client-filtered pickers that must see the
 *  whole roster — the engineer-assign dropdowns (Inspection / Repair / QC /
 *  Devices / device-detail / inward), the Material-Issue "Issued to" picker,
 *  and the team-management page — so a capped first page silently hid
 *  engineers past it (CP-352 scroll/load-more audit). A warehouse roster is
 *  bounded (tens of people), so this is one or two requests in practice; the
 *  page loop + `total` guard keep it correct if a team ever grows large. */
export async function fetchWarehouseTeam(
  warehouseId: string,
): Promise<WarehouseAssignmentListItem[]> {
  const pageSize = PAGINATION.MAX_PAGE_SIZE;
  const all: WarehouseAssignmentListItem[] = [];
  // Hard page cap is a runaway guard only — the real stop is a short/typed-out
  // page below. initialPage is 1 to match `fetchWarehouseAssignmentsPage`.
  for (let page = 1; page <= 50; page += 1) {
    const res = await fetchWarehouseAssignmentsPage(warehouseId, {
      page,
      page_size: pageSize,
    });
    all.push(...res.items);
    if (res.items.length < pageSize || all.length >= res.total) break;
  }
  return all;
}

/** Server-side-filtered page of a warehouse's team. Powers the stage-queue
 *  engineer picker (§16.11: dropdowns are server-driven, not client-filtered
 *  from a fully-loaded list). The `capabilities` filter is Postgres array-
 *  contains — passing `["inspection"]` returns rows whose capabilities array
 *  holds "inspection", including rows with additional capabilities.
 *
 *  Backend supports `role`, `capabilities`, `search`, plus `page`/`page_size`.
 *  When every filter is omitted the response matches `fetchWarehouseTeam`. */
export interface WarehouseAssignmentsPageParams {
  page?: number;
  page_size?: number;
  role?: AssignmentRole;
  /** Engineer level (the Team tab's Level filter). */
  level?: AssignmentLevel;
  capabilities?: AssignmentCapability[];
  /** Array-overlap: rows whose capabilities hold ANY of these (repair OR qc OR
   *  outward_qc). Use when a picker spans several stages; `capabilities`
   *  (array-contains) is the all-of variant. */
  capabilities_any?: AssignmentCapability[];
  search?: string;
  sort?: string;
}
export interface WarehouseAssignmentsPage {
  items: WarehouseAssignmentListItem[];
  total: number;
  /** Local echo — the backend only returns `{items, total}`; the hook stamps
   *  the requested page size on the response so `getNextPageParam` can decide
   *  whether more pages remain without a second round-trip. */
  page_size: number;
}
export async function fetchWarehouseAssignmentsPage(
  warehouseId: string,
  params: WarehouseAssignmentsPageParams = {},
): Promise<WarehouseAssignmentsPage> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  if (params.role) qs.set("role", params.role);
  if (params.level) qs.set("level", params.level);
  if (params.capabilities) {
    // Repeat the param — matches FastAPI's list[str] Query() reader.
    for (const c of params.capabilities) qs.append("capabilities", c);
  }
  if (params.capabilities_any) {
    for (const c of params.capabilities_any) qs.append("capabilities_any", c);
  }
  if (params.search && params.search.trim().length > 0) {
    qs.set("search", params.search.trim());
  }
  if (params.sort) qs.set("sort", params.sort);
  const url = qs.toString()
    ? `${endpoints.wms.warehouseAssignments(warehouseId)}?${qs.toString()}`
    : endpoints.wms.warehouseAssignments(warehouseId);
  const raw = await apiClient.get<{
    items: WarehouseAssignmentListItem[];
    total: number;
  }>(url);
  // Backend envelope is `{items, total}` — stamp the requested page size on
  // the response so useInfiniteQuery can compute hasNextPage locally.
  return {
    items: raw.items,
    total: raw.total,
    page_size: params.page_size ?? raw.items.length,
  };
}

// ── Warehouse-agnostic engineer picker ──────────────────────────────────────
// Distinct engineers ACROSS warehouses (or all). One row per engineer, unlike
// the per-warehouse assignment list. Used by the Material-Issue worklist's
// "Issued to" filter so it honours the navbar's multi-warehouse (or "all") scope.
export type WarehouseEngineerItem =
  components["schemas"]["WarehouseEngineerItem"];
export interface WarehouseEngineersPageParams {
  page?: number;
  page_size?: number;
  /** Scope to these warehouses; empty/omitted = ALL warehouses. */
  warehouse_ids?: string[];
  role?: AssignmentRole;
  capabilities_any?: AssignmentCapability[];
  search?: string;
}
export interface WarehouseEngineersPage {
  items: WarehouseEngineerItem[];
  total: number;
  page_size: number;
}
export async function fetchWarehouseEngineersPage(
  params: WarehouseEngineersPageParams = {},
): Promise<WarehouseEngineersPage> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  for (const id of params.warehouse_ids ?? []) qs.append("warehouse_ids", id);
  if (params.role) qs.set("role", params.role);
  if (params.capabilities_any) {
    for (const c of params.capabilities_any) qs.append("capabilities_any", c);
  }
  if (params.search && params.search.trim().length > 0) {
    qs.set("search", params.search.trim());
  }
  const url = qs.toString()
    ? `${endpoints.wms.warehouseEngineers()}?${qs.toString()}`
    : endpoints.wms.warehouseEngineers();
  const raw = await apiClient.get<{
    items: WarehouseEngineerItem[];
    total: number;
  }>(url);
  return {
    items: raw.items,
    total: raw.total,
    page_size: params.page_size ?? raw.items.length,
  };
}

/** Add a member to a warehouse team. */
export async function createWarehouseAssignment(
  warehouseId: string,
  body: WarehouseAssignmentCreate,
): Promise<WarehouseAssignmentResponse> {
  return apiClient.post<WarehouseAssignmentResponse>(
    endpoints.wms.warehouseAssignments(warehouseId),
    body,
  );
}

/** Update an existing assignment (level / capabilities / notes). */
export async function updateWarehouseAssignment(
  warehouseId: string,
  userId: string,
  body: WarehouseAssignmentUpdate,
): Promise<WarehouseAssignmentResponse> {
  return apiClient.patch<WarehouseAssignmentResponse>(
    endpoints.wms.warehouseAssignment(warehouseId, userId),
    body,
  );
}

/** Remove a member from a warehouse team. ``reason`` is mandatory (BR-6). */
export async function removeWarehouseAssignment(
  warehouseId: string,
  userId: string,
  reason: string,
): Promise<void> {
  await apiClient.delete<null>(
    endpoints.wms.warehouseAssignment(warehouseId, userId),
    { reason },
  );
}

