import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import type { PageResponse } from "@shared/api/pagination";
import { endpoints } from "@shared/api/endpoints";

// ─── Stock relocation + warehouse transfer ───────────────────────────────────
//
// Two transactions behind one entry point (stock-transfer spec D1):
//
//   same warehouse      -> relocation. Instant, no document, units stay
//                          `available`. One call.
//   different warehouse -> transfer. A document, a transit window, and a
//                          receiving step at the far end.
//
// The mode is DERIVED from the chosen destination warehouse, never toggled —
// the demo's wh2wh/bin2bin switch was redundant state whose only job was
// deciding whether the destination equalled the source (spec D2).

export type RelocateRequest = components["schemas"]["RelocateRequest"];
export type RelocateResponse = components["schemas"]["RelocateResponse"];

export type TransferCreate = components["schemas"]["TransferCreate"];
export type TransferSend = components["schemas"]["TransferSend"];
export type TransferResponse = components["schemas"]["TransferResponse"];
export type TransferDetailResponse =
  components["schemas"]["TransferDetailResponse"];
export type TransferItemResponse =
  components["schemas"]["TransferItemResponse"];
export type CandidateUnit = components["schemas"]["CandidateUnit"];
// Pydantic emits separate Input/Output variants; the request side is -Input.
export type DeliveryDetails = components["schemas"]["DeliveryDetails-Input"];

// ── relocation ───────────────────────────────────────────────────────────────

export async function relocateStock(
  locationId: string,
  body: RelocateRequest,
): Promise<RelocateResponse> {
  return apiClient.post<RelocateResponse>(
    endpoints.wms.relocateStock(locationId),
    body,
  );
}

// ── transfer ─────────────────────────────────────────────────────────────────

export async function createTransfer(
  body: TransferCreate,
): Promise<TransferResponse> {
  return apiClient.post<TransferResponse>(
    endpoints.wms.warehouseTransfers,
    body,
  );
}

/** A page of transfers with the server total; `items` normalised to an array. */
export type TransferListPage = Omit<
  components["schemas"]["PaginatedResponse_TransferResponse_"],
  "items"
> & {
  items: TransferResponse[];
};

export async function listTransfers(params?: {
  status?: string;
  overdue?: boolean;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  /** Navbar scope (multi-select): source OR destination in ANY of these. */
  warehouse_ids?: string[];
  q?: string;
  /** IST-day ranges (YYYY-MM-DD, inclusive) on Sent / Expected delivery. */
  dispatched_from?: string;
  dispatched_to?: string;
  expected_from?: string;
  expected_to?: string;
  /** `-`-prefixed for descending: transfer_number | dispatched_at |
   *  expected_delivery_date | created_at. */
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<TransferListPage> {
  const page = await apiClient.get<
    components["schemas"]["PaginatedResponse_TransferResponse_"]
  >(endpoints.wms.warehouseTransfers, { params });
  return { ...page, items: page.items ?? [] };
}

export async function getTransfer(id: string): Promise<TransferDetailResponse> {
  return apiClient.get<TransferDetailResponse>(
    endpoints.wms.warehouseTransfer(id),
  );
}

export async function listTransferCandidates(
  id: string,
  params?: { search?: string; page?: number; page_size?: number },
): Promise<PageResponse<CandidateUnit>> {
  return apiClient.get<PageResponse<CandidateUnit>>(
    endpoints.wms.warehouseTransferCandidates(id),
    { params },
  );
}

export async function addTransferUnits(
  id: string,
  stockItemIds: string[],
): Promise<TransferItemResponse[]> {
  return apiClient.post<TransferItemResponse[]>(
    endpoints.wms.warehouseTransferUnits(id),
    {
      stock_item_ids: stockItemIds,
    },
  );
}

export async function removeTransferUnit(itemId: string): Promise<void> {
  await apiClient.delete(endpoints.wms.warehouseTransferItem(itemId));
}

export async function sendTransfer(
  id: string,
  body: TransferSend,
): Promise<TransferResponse> {
  return apiClient.post<TransferResponse>(
    endpoints.wms.warehouseTransferSend(id),
    body,
  );
}

// ── receiving ────────────────────────────────────────────────────────────────

export async function placeTransferUnit(
  itemId: string,
  warehouseLocationId: string,
): Promise<TransferItemResponse> {
  return apiClient.post<TransferItemResponse>(
    endpoints.wms.warehouseTransferItemPlace(itemId),
    { warehouse_location_id: warehouseLocationId },
  );
}

export async function flagTransferUnit(
  itemId: string,
  reason?: string,
): Promise<TransferItemResponse> {
  return apiClient.post<TransferItemResponse>(
    endpoints.wms.warehouseTransferItemFlag(itemId),
    { reason: reason ?? null },
  );
}

export async function markTransferUnitLost(
  itemId: string,
  reason: string,
): Promise<TransferItemResponse> {
  return apiClient.post<TransferItemResponse>(
    endpoints.wms.warehouseTransferItemMarkLost(itemId),
    { reason },
  );
}

export async function returnTransferUnitToSource(
  itemId: string,
  reason?: string,
): Promise<TransferItemResponse> {
  return apiClient.post<TransferItemResponse>(
    endpoints.wms.warehouseTransferItemReturnToSource(itemId),
    { reason: reason ?? null },
  );
}
