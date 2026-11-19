import { DEFAULT_FETCH_LIMIT } from "../constants/list";
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";
import { appendQuery } from "./query-string";
import { createDispatchRequest, finaliseDispatch, type DispatchRequestCreate } from "./dispatch";

// ─── Purchase Returns (return-to-vendor) ─────────────────────────────────────
//
// Units received from a vendor on a PO (via a GRN) found damaged / wrong get
// returned to the vendor. A return is `raised`, then shipped out on one or more
// consignments until it is fully `dispatched` (challan per consignment),
// while procurement decides each unit's disposition (replace / refund) and
// settles or waives the resulting credit. The returnable-units + returns feeds
// hang off the source PO. Lives in the procurement API surface but is consumed
// from the WMS pages, mirroring the Material Issue data layer.

export type PurchaseReturn = components["schemas"]["PurchaseReturnResponse"];
export type PurchaseReturnItem =
  components["schemas"]["PurchaseReturnItemResponse"];
export type PurchaseReturnCreate =
  components["schemas"]["PurchaseReturnCreate"];
export type PurchaseReturnItemCreate =
  components["schemas"]["PurchaseReturnItemCreate"];
export type PurchaseReturnItemDecision =
  components["schemas"]["PurchaseReturnItemDecision"];
export type PurchaseReturnSettle =
  components["schemas"]["PurchaseReturnSettle"];
export type PurchaseReturnWaive = components["schemas"]["PurchaseReturnWaive"];
export type ReturnableUnit = components["schemas"]["ReturnableUnit"];
export type POCreditRollup = components["schemas"]["POCreditRollup"];
export type PurchaseReturnPage =
  components["schemas"]["PaginatedResponse_PurchaseReturnResponse_"];
export type PurchaseReturnStats =
  components["schemas"]["PurchaseReturnStats"];
export type PurchaseReturnFilterOption =
  components["schemas"]["PurchaseReturnFilterOption"];
export type PurchaseReturnFilterOptions =
  components["schemas"]["PurchaseReturnFilterOptions"];

// Header state machine — raised → partially_dispatched → dispatched → closed,
// plus a cancelled terminal. `partially_dispatched` exists because a return is
// a list of units owed to a vendor and they need not leave together; a return
// with anything already shipped can never reach `cancelled`.
export type PurchaseReturnStatus =
  | "raised"
  | "partially_dispatched"
  | "dispatched"
  | "closed"
  | "cancelled";
// Has this unit physically left the dock? Independent of the item's `status`
// (is the obligation open?) and `settlement_status` (did the money land?).
export type PurchaseReturnItemDispatchStatus =
  "pending" | "dispatched" | "cancelled";
// Procurement's remedy for one returned unit.
export type PurchaseReturnDisposition = "replace" | "refund";

export interface PurchaseReturnListParams {
  page?: number;
  page_size?: number;
  // Created-date range (YYYY-MM-DD, inclusive) — filters by created_at.
  date_from?: string;
  date_to?: string;
  // Navbar warehouse scope — union of these warehouse ids (the return's
  // snapshotted warehouse). Empty/undefined = all accessible.
  warehouse_ids?: string[];
  // Server-side lifecycle status filter.
  status?: PurchaseReturnStatus;
  // Pin the list to one PO / one vendor. Options come from the facets endpoint
  // (`fetchPurchaseReturnFilterOptions`) so only ids that have a return appear.
  purchase_order_id?: string;
  vendor_id?: string;
  // Server-side free-text search: return number, PO number, or vendor name.
  search?: string;
  // Server-side sort: column + direction (default newest first).
  sort_by?: "pret_number" | "created_at";
  sort_dir?: "asc" | "desc";
}

export async function fetchPurchaseReturnsPage(
  params: PurchaseReturnListParams,
): Promise<PurchaseReturnPage> {
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? DEFAULT_FETCH_LIMIT;
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", String(pageSize));
  appendQuery(qs, params, [
    "date_from", "date_to", "warehouse_ids", "status", "purchase_order_id",
    "vendor_id", "search", "sort_by", "sort_dir",
  ]);
  const res = await apiClient.get<PurchaseReturnPage>(
    `${endpoints.procurement.purchaseReturns}?${qs.toString()}`,
  );
  return {
    items: res.items ?? [],
    total: res.total ?? 0,
    page: res.page ?? page,
    page_size: res.page_size ?? pageSize,
    has_next: res.has_next ?? false,
  };
}

/** The stats rollup honours the same filters as the list (minus status, which
 *  it counts across) so the KPI cards + tab badges move with a filter (§1.1.H). */
export interface PurchaseReturnStatsParams {
  warehouse_ids?: string[];
  date_from?: string;
  date_to?: string;
  purchase_order_id?: string;
  vendor_id?: string;
  search?: string;
}

export async function fetchPurchaseReturnStats(
  params: PurchaseReturnStatsParams = {},
): Promise<PurchaseReturnStats> {
  const qs = new URLSearchParams();
  for (const id of params.warehouse_ids ?? []) qs.append("warehouse_ids", id);
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.purchase_order_id) qs.set("purchase_order_id", params.purchase_order_id);
  if (params.vendor_id) qs.set("vendor_id", params.vendor_id);
  if (params.search) qs.set("search", params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiClient.get<PurchaseReturnStats>(
    `${endpoints.procurement.purchaseReturnStats}${suffix}`,
  );
}

// Distinct PO + vendor facets for the list filter dropdowns — only the POs and
// vendors that have a return in the current warehouse scope. Warehouse-scoped
// like the stats feed so the two toolbar dropdowns list nothing that can't match.
export async function fetchPurchaseReturnFilterOptions(
  warehouseIds?: string[],
): Promise<PurchaseReturnFilterOptions> {
  const qs = new URLSearchParams();
  for (const id of warehouseIds ?? []) qs.append("warehouse_ids", id);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiClient.get<PurchaseReturnFilterOptions>(
    `${endpoints.procurement.purchaseReturnFilterOptions}${suffix}`,
  );
}

export async function fetchPurchaseReturn(id: string): Promise<PurchaseReturn> {
  return apiClient.get<PurchaseReturn>(
    endpoints.procurement.purchaseReturn(id),
  );
}

/** Serialized units on a PO that can still be sent back to the vendor, each
 *  flagged `returnable` with a `blocked_reason` when it can't. */
export async function fetchReturnableUnits(
  poId: string,
): Promise<ReturnableUnit[]> {
  const res = await apiClient.get<ReturnableUnit[]>(
    endpoints.procurement.returnableUnits(poId),
  );
  return res ?? [];
}

/** Every return already raised against a PO (drives the PO detail's returns
 *  tab + credit rollup). */
export async function fetchPurchaseOrderReturns(
  poId: string,
): Promise<PurchaseReturn[]> {
  const res = await apiClient.get<PurchaseReturn[]>(
    endpoints.procurement.purchaseOrderReturns(poId),
  );
  return res ?? [];
}

export async function createPurchaseReturn(
  body: PurchaseReturnCreate,
): Promise<PurchaseReturn> {
  return apiClient.post<PurchaseReturn>(
    endpoints.procurement.purchaseReturns,
    body,
  );
}

export async function cancelPurchaseReturn(
  id: string,
): Promise<PurchaseReturn> {
  return apiClient.delete<PurchaseReturn>(
    endpoints.procurement.purchaseReturn(id),
  );
}

export interface ShipPurchaseReturnInput {
  /** Which units to put on THIS consignment. Omit to ship everything still
   *  on the dock — the old all-or-nothing behaviour. */
  itemIds: string[];
  warehouseId: string;
  awbNumber: string;
  driverName?: string;
  driverPhone?: string;
  /** ISO date the vendor should receive it. Distinct from `delivery_date`,
   *  which records when it actually arrived. */
  expectedDeliveryDate?: string;
  /** Where the units go back to the vendor — free text on the challan. */
  returnAddress?: string;
  /** Logistics + invoice amount for the draft (billing is draft-only). */
  createMetadata?: DispatchRequestCreate["metadata"];
}

/**
 * Ship a purchase return.
 *
 * There is no purchase-return dispatch endpoint any more: a vendor consignment
 * is an ordinary WMS dispatch request, which is what lets one return leave on
 * several trips. Three calls, in order — raise a draft, put the chosen units on
 * it, finalise — mirroring what the backend's own tests drive.
 *
 * Not wrapped in a transaction: if finalise fails the draft is left behind and
 * can be cancelled or retried, which is preferable to silently shipping units
 * whose challan never landed.
 *
 * Returns the new dispatch's id, so the caller can file documents on it.
 */
export async function shipPurchaseReturn(
  returnId: string,
  input: ShipPurchaseReturnInput,
): Promise<string> {
  // Reuse the dispatch wrappers (typed by the generated request bodies) rather
  // than hand-building their URLs and payloads here (§6.2 / KP1).
  const draft = await createDispatchRequest({
    dispatch_type: "purchase_return_dispatch",
    source_entity_type: "purchase_returns",
    source_entity_id: returnId,
    from_warehouse_id: input.warehouseId,
    metadata: input.createMetadata,
  });
  await apiClient.post(
    endpoints.wms.dispatchRequestPickFromPurchaseReturn(draft.id),
    { purchase_return_item_ids: input.itemIds },
  );
  await finaliseDispatch(draft.id, {
    metadata: {
      delivery_details: {
        // The AWB lives here now; the retired header column is gone.
        courier_tracking_number: input.awbNumber,
        driver_name: input.driverName || null,
        driver_phone: input.driverPhone || null,
        expected_delivery_date: input.expectedDeliveryDate || null,
        return_address: input.returnAddress || null,
      },
    },
  });
  return draft.id;
}

export async function setDisposition(
  prId: string,
  itemId: string,
  disposition: PurchaseReturnDisposition,
): Promise<PurchaseReturn> {
  return apiClient.patch<PurchaseReturn>(
    endpoints.procurement.purchaseReturnItemDisposition(prId, itemId),
    { disposition } satisfies PurchaseReturnItemDecision,
  );
}

/** Apply one disposition to MANY items in a single request. The detail page's
 *  bulk bar uses this instead of one call per item, so a large return applies
 *  in one transaction rather than N round-trips (CP-344). */
export async function setDispositionsBulk(
  prId: string,
  itemIds: string[],
  disposition: PurchaseReturnDisposition,
): Promise<PurchaseReturn> {
  return apiClient.patch<PurchaseReturn>(
    endpoints.procurement.purchaseReturnItemsDispositionBulk(prId),
    { item_ids: itemIds, disposition },
  );
}

export async function rejectReturnItem(
  prId: string,
  itemId: string,
): Promise<PurchaseReturn> {
  return apiClient.post<PurchaseReturn>(
    endpoints.procurement.purchaseReturnItemReject(prId, itemId),
    {},
  );
}

/** Reject MANY items in one request — the bulk "Reject selected", applied in a
 *  single transaction instead of one call per item (CP-344). */
export async function rejectReturnItemsBulk(
  prId: string,
  itemIds: string[],
): Promise<PurchaseReturn> {
  return apiClient.post<PurchaseReturn>(
    endpoints.procurement.purchaseReturnItemsRejectBulk(prId),
    { item_ids: itemIds },
  );
}

// Warehouse per-item cancel — the raiser removing a mistakenly-added unit from a
// still-raised, still-undecided return. `po_return_write` (not `_settle`): this
// is the operator fixing their own raise, distinct from procurement's reject.
export async function cancelReturnItem(
  prId: string,
  itemId: string,
): Promise<PurchaseReturn> {
  return apiClient.post<PurchaseReturn>(
    endpoints.procurement.purchaseReturnItemCancel(prId, itemId),
    {},
  );
}

export async function settleReturnItem(
  prId: string,
  itemId: string,
  body: PurchaseReturnSettle,
): Promise<PurchaseReturn> {
  return apiClient.post<PurchaseReturn>(
    endpoints.procurement.purchaseReturnItemSettle(prId, itemId),
    body,
  );
}

export async function waiveReturnItem(
  prId: string,
  itemId: string,
  body: PurchaseReturnWaive,
): Promise<PurchaseReturn> {
  return apiClient.post<PurchaseReturn>(
    endpoints.procurement.purchaseReturnItemWaive(prId, itemId),
    body,
  );
}

