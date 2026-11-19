import { DEFAULT_FETCH_LIMIT } from "../constants/list";
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { FIRST_PAGE, type PageResponse } from "@shared/api/pagination";
import { endpoints } from "@shared/api/endpoints";

// ─── Available stock (serialized unit picker) ────────────────────────────────
//
// The dispatch pick's own endpoint — lists `available` serialized units of one
// variant in a warehouse, searchable by serial (internal or manufacturer). The
// Material Issue form uses it so an operator picks a real known unit (or scans
// its serial) instead of typing a raw serial.

export type AvailableStockRow = components["schemas"]["AvailableStockRow"];

export interface AvailableStockParams {
  warehouse_id: string;
  /** Omit to resolve a scanned serial (`q`) across every variant in the
   *  warehouse — the scan-first Material Issue line. */
  part_variant_id?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export async function fetchAvailableStock(
  params: AvailableStockParams,
): Promise<PageResponse<AvailableStockRow>> {
  const qs = new URLSearchParams();
  qs.set("warehouse_id", params.warehouse_id);
  if (params.part_variant_id) qs.set("part_variant_id", params.part_variant_id);
  if (params.q) qs.set("q", params.q);
  qs.set("page", String(params.page ?? FIRST_PAGE));
  qs.set("page_size", String(params.page_size ?? DEFAULT_FETCH_LIMIT));
  return apiClient.get<PageResponse<AvailableStockRow>>(
    `${endpoints.wms.availableStock}?${qs.toString()}`,
  );
}

// ─── Available stock counts (per-variant on-hand aggregate) ──────────────────
//
// One grouped count of pickable units per variant in a warehouse — the
// aggregate sibling of fetchAvailableStock. The Material Issue "Add line item"
// dropdown uses it to show how many units are actually on hand at the chosen
// warehouse next to the demand still pending.
export type AvailableStockCount = components["schemas"]["AvailableStockCount"];

export async function fetchAvailableStockCounts(params: {
  warehouse_id: string;
  part_variant_ids: string[];
}): Promise<AvailableStockCount[]> {
  if (params.part_variant_ids.length === 0) return [];
  const qs = new URLSearchParams();
  qs.set("warehouse_id", params.warehouse_id);
  for (const id of params.part_variant_ids) qs.append("part_variant_ids", id);
  const res = await apiClient.get<AvailableStockCount[]>(
    `${endpoints.wms.availableStockCounts}?${qs.toString()}`,
  );
  return res ?? [];
}
