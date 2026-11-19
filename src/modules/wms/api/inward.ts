import { DEFAULT_FETCH_LIMIT } from "../constants/list";
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";
import { appendQuery } from "./query-string";

// ─── Inward / GRN ────────────────────────────────────────────────────────────

export type GrnBatchListItem = components["schemas"]["GrnBatchListItem"];
export type GrnBatchResponse = components["schemas"]["GrnBatchResponse"];
export type PaginatedGrnBatchesResponse =
  components["schemas"]["PaginatedResponse_GrnBatchListItem_"];
export type InwardSourceRow = components["schemas"]["InwardSourceRow"];

// Backend GrnBatch enums (mirrors the DB CHECK allow-lists).
export type InwardType =
  | "purchase_order"
  | "sale_return"
  | "rental_return"
  | "demo_return"
  | "staff_return"
  | "replacement_return"
  | "warehouse_transfer_inward";
export type GrnBatchStatus = "open" | "closed" | "cancelled";

// Sort tokens the GRN list endpoint accepts (`field` asc / `-field` desc).
export type GrnBatchSortField =
  | "created_at"
  | "-created_at"
  | "grn_number"
  | "-grn_number"
  | "status"
  | "-status"
  | "unit_count"
  | "-unit_count"
  | "warehouse"
  | "-warehouse"
  | "inward_type"
  | "-inward_type";

export interface GrnBatchListParams {
  inward_type?: InwardType;
  status?: GrnBatchStatus;
  to_warehouse_id?: string;
  /** Navbar multi-select — the union of these destination warehouses. Repeated
   *  as `to_warehouse_ids`. Empty/omitted = all accessible warehouses. */
  to_warehouse_ids?: string[];
  source_entity_type?: string;
  source_entity_id?: string;
  q?: string;
  sort?: GrnBatchSortField;
  // Created-date range (YYYY-MM-DD, inclusive) — filters batches by created_at.
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export async function fetchGrnBatchesPage(
  params: GrnBatchListParams,
): Promise<PaginatedGrnBatchesResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? DEFAULT_FETCH_LIMIT));
  appendQuery(qs, params, [
    "inward_type",
    "status",
    "to_warehouse_id",
    "to_warehouse_ids",
    "source_entity_type",
    "source_entity_id",
    "q",
    "sort",
    "date_from",
    "date_to",
  ]);

  return apiClient.get<PaginatedGrnBatchesResponse>(
    `${endpoints.wms.grnBatches}?${qs.toString()}`,
  );
}

export async function fetchGrnBatch(id: string): Promise<GrnBatchResponse> {
  return apiClient.get<GrnBatchResponse>(endpoints.wms.grnBatch(id));
}

// ─── Inward / GRN — create → stage → finalize (atomic) ───────────────────────

export type GrnBatchCreate = components["schemas"]["GrnBatchCreate"];
export type GrnBatchUpdate = components["schemas"]["GrnBatchUpdate"];
export type GrnBatchCancelRequest =
  components["schemas"]["GrnBatchCancelRequest"];
export type FinalizePreviewResponse =
  components["schemas"]["FinalizePreviewResponse"];
export type GrnDraftLine = components["schemas"]["GrnDraftLine"];
export type POInwardSourceRow = components["schemas"]["POInwardSourceRow"];
export type POExpectedLine = components["schemas"]["POExpectedLineEnriched"];
// One dispatched unit pending return (the "expected line" of a return source).
export type ExpectedReturnLine = components["schemas"]["ExpectedReturnLineRow"];
// A migrated rental unit a replacement return expects back — received by serial.
export type ExpectedLegacyUnit = components["schemas"]["ExpectedLegacyUnit"];
// The inward-sources endpoint returns a smart-union: PO sources carry the
// procurement-shaped row; return flows carry the generic WMS row.
export type InwardSourceRowAny = InwardSourceRow | POInwardSourceRow;

export interface InwardSourceParams {
  inward_type: InwardType;
  source_entity_id?: string;
  q?: string;
  // purchase_order only — keep only POs of this condition. Mirrors the
  // operator's inward origin selection so a refurbished inward shows only
  // refurbished POs (and new only new).
  condition?: "new" | "refurbished";
}

/** The paged envelope `GET /wms/inward/sources` returns in list mode (and a
 *  one-item envelope in singleton mode). Local to this fetcher — the picker
 *  consumes the flat list below, not the envelope. */
interface InwardSourcesPage {
  items: InwardSourceRowAny[];
  page: number;
  page_size: number;
  has_next: boolean;
}

/** How many sources to pull per page while assembling the full list. The
 *  backend caps page_size at 100. */
const INWARD_SOURCES_PAGE_SIZE = 100;

export async function fetchInwardSources(
  params: InwardSourceParams,
): Promise<InwardSourceRowAny[]> {
  // The endpoint pages (the source list grows with procurement volume, so the
  // PO branch is no longer capped). This picker filters client-side by the
  // navbar warehouse scope and resolves the picked row from the loaded set, so
  // it needs the WHOLE list: page through until the backend says there's no
  // more. A source set is bounded (open POs / authorizations awaiting receipt),
  // so this is a couple of requests; singleton mode returns one page.
  const all: InwardSourceRowAny[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const qs = new URLSearchParams();
    qs.set("inward_type", params.inward_type);
    if (params.source_entity_id)
      qs.set("source_entity_id", params.source_entity_id);
    if (params.q) qs.set("q", params.q);
    if (params.condition) qs.set("condition", params.condition);
    qs.set("page", String(page));
    qs.set("page_size", String(INWARD_SOURCES_PAGE_SIZE));
    const res = await apiClient.get<InwardSourcesPage>(
      `${endpoints.wms.inwardSources}?${qs.toString()}`,
    );
    all.push(...(res?.items ?? []));
    if (!res?.has_next || (res?.items?.length ?? 0) === 0) break;
  }
  return all;
}

export async function createGrnBatch(
  body: GrnBatchCreate,
): Promise<GrnBatchResponse> {
  return apiClient.post<GrnBatchResponse>(endpoints.wms.grnBatches, body);
}

export async function updateGrnBatchDraft(
  id: string,
  body: GrnBatchUpdate,
): Promise<GrnBatchResponse> {
  return apiClient.patch<GrnBatchResponse>(endpoints.wms.grnBatch(id), body);
}

export async function finalizePreviewGrnBatch(
  id: string,
): Promise<FinalizePreviewResponse> {
  return apiClient.post<FinalizePreviewResponse>(
    endpoints.wms.grnBatchFinalizePreview(id),
    {},
  );
}

export async function finalizeGrnBatch(id: string): Promise<GrnBatchResponse> {
  return apiClient.post<GrnBatchResponse>(
    endpoints.wms.grnBatchFinalize(id),
    {},
  );
}

export async function cancelGrnBatch(
  id: string,
  body: GrnBatchCancelRequest,
): Promise<GrnBatchResponse> {
  return apiClient.post<GrnBatchResponse>(
    endpoints.wms.grnBatchCancel(id),
    body,
  );
}
