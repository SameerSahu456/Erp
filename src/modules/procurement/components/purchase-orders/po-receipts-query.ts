import { PAGINATION } from "@/shared/constants"

// Single-source page size for the PO detail GRNs / Devices tabs (§16.6).
export const PO_RECEIPTS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

/** GRN-list params for one PO's inward batches. The detail page's tab-count
 *  query and the GRNs tab's page 1 build the SAME params, so TanStack shares
 *  one request between them. */
export function poGrnParams(poId: string, page = 1) {
  return {
    source_entity_type: "purchase_orders",
    source_entity_id: poId,
    page,
    page_size: PO_RECEIPTS_PAGE_SIZE,
  }
}

/** Devices-tab filter-bar state (raw, as typed). Empty string = no filter. */
export interface PODeviceFilters {
  search: string
  grnId: string
  variantId: string
  /** Driven by the stage quick tabs above the table. */
  stage: string
  status: string
  /** Received-date bounds, YYYY-MM-DD (IST day), inclusive. */
  fromDate: string
  toDate: string
  engineerId: string
  /** The picked engineer's name, kept alongside the id so the chip never has
   *  to look the user up (that lookup 403s for procurement roles). */
  engineerName: string
}

export const EMPTY_PO_DEVICE_FILTERS: PODeviceFilters = {
  search: "",
  grnId: "",
  variantId: "",
  stage: "",
  status: "",
  fromDate: "",
  toDate: "",
  engineerId: "",
  engineerName: "",
}

/** Any filter set, counting the stage tab. */
export function hasActiveDeviceFilters(f: PODeviceFilters): boolean {
  return Object.values(f).some((v) => v !== "")
}

/** Any filter in the BAR set (stage tab excluded) — drives "Clear filters". */
export function hasActiveBarFilters(f: PODeviceFilters): boolean {
  return hasActiveDeviceFilters({ ...f, stage: "" })
}

/** Devices-tab filters, already debounced. Empty strings mean "no filter". */
export type PODeviceQueryFilters = Partial<PODeviceFilters>

/** Device-list params for every unit inwarded against one PO (same sharing
 *  contract as `poGrnParams`). With no filters the params are identical to the
 *  tab-count query, so the unfiltered first page is one shared request. Unset
 *  filters are left OUT (not sent as undefined) so the query key matches. */
export function poDeviceParams(poId: string, page = 1, f: PODeviceQueryFilters = {}) {
  return {
    purchase_order_id: poId,
    sort: "-created_at",
    page,
    page_size: PO_RECEIPTS_PAGE_SIZE,
    ...(f.search ? { search: f.search } : {}),
    ...(f.grnId ? { batch_id: f.grnId } : {}),
    ...(f.variantId ? { variant_id: f.variantId } : {}),
    ...(f.stage ? { workflow_status: f.stage } : {}),
    ...(f.status ? { device_status: f.status } : {}),
    ...(f.fromDate ? { from_date: f.fromDate } : {}),
    ...(f.toDate ? { to_date: f.toDate } : {}),
    ...(f.engineerId ? { assignee_id: f.engineerId } : {}),
  }
}

/** Stats params for the stage quick-tab counts: every filter EXCEPT the stage
 *  itself (each tab counts its own stage under the other filters), and no
 *  paging / sort. */
export function poDeviceStatsParams(poId: string, f: PODeviceQueryFilters = {}) {
  const { page: _page, page_size: _size, sort: _sort, ...rest } = poDeviceParams(poId, 1, {
    ...f,
    stage: "",
  })
  return rest
}
