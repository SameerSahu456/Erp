import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"

import type { AccountTypeWire } from "./accounts"
import type { SOLineCondition } from "./sales-orders"

// ─── Demo Requests ─────────────────────────────────────────────────────

export type DemoRequestSource = "lead" | "deal" | "account"
export type DemoRequestStatusWire =
  | "Draft"
  | "Pending for Approval"
  | "PartiallyApproved"
  | "Approved"
  | "Rejected"
  // Some approved units are out, others aren't. Measured per unit, and
  // PM-rejected lines are excluded from the denominator — so a demo whose
  // only unshipped line was rejected reads "Dispatched", not this.
  | "PartiallyDispatched"
  | "Dispatched"
  | "WithCustomer"
  | "PartiallyReturned"
  | "Returned"
  | "ConvertedToSO"
  | "Closed"
  | "Account Approval Pending"
  | "Account Rejected"
export type DemoRequestItemPMStatus = "Pending" | "Approved" | "Rejected"
export type DemoRequestReturnCondition = "Good" | "Damaged" | "MissingParts"

/** Per-line condition. The SAME IMS `ConditionEnum` the SO lines use — one
 *  alias rather than a second copy of `"new" | "refurbished" | "new_pull"`, so
 *  the two can never drift and `SO_LINE_CONDITION_LABELS` is a valid label map
 *  for a demo line too. */
export type DemoLineCondition = SOLineCondition

export interface DemoRequestItemCreatePayload {
  variant_id: string
  qty: number
  unit_price: number | string
  /** PM-routing hints — the two dimensions IMS PM lookup matches on beyond
   *  category. Both OPTIONAL server-side: `null`/omitted is a WILDCARD, not a
   *  filter, so a line without them routes exactly as it did before the
   *  columns existed. Sending them lets a Dell-only PM assignment win over an
   *  all-OEM one. Backend: `DemoRequestService._resolve_pm_for_item`. */
  oem_id?: string
  condition?: DemoLineCondition
}

export interface DemoRequestItemUpdatePayload {
  variant_id?: string
  qty?: number
  unit_price?: number | string
  oem_id?: string
  condition?: DemoLineCondition
}

export interface DemoRequestCreatePayload {
  source: DemoRequestSource
  source_type?: DemoRequestSource
  source_id?: string
  account_id?: string
  account?: {
    name: string
    // 2026-05-19: account_type enum shifted to channel relationship.
    account_type?: AccountTypeWire
    status?: "Active" | "Inactive" | "Prospect"
    tag?: "Hunting" | "Farming" | "Cold"
    industry?: string | null
    website?: string | null
    // Demo-request endpoint internally maps lead's free-text company_size
    // (Startup/SMB/Mid-Market/Large Enterprise) onto the account's typed
    // enum (Mid-Market + Large Enterprise → Enterprise per spec §9.1), so
    // the wire shape stays string-loose here. Direct account-create still
    // uses the strict CompanySizeWire on AccountUpsertPayload.
    company_size?: string | null
    employees?: number | null
  }
  contact_id?: string
  contact_details?: {
    name: string
    email?: string | null
    phone?: string | null
    alt_phone?: string | null
    designation?: string | null
    department?: string | null
    status?: "Active" | "Inactive"
  }
  shipping_address_id?: string
  shipping_address?: {
    line1: string
    city: string
    state: string
    pincode: string
    label?: string | null
    line2?: string | null
    status?: "Active" | "Inactive"
    is_default?: boolean
  }
  expected_return_date: string
  status?: "Draft" | "Pending for Approval"
  auto_submit?: boolean
  notes?: string | null
  items: DemoRequestItemCreatePayload[]
}

export interface DemoRequestItemWire {
  id: string
  demo_request_id: string
  variant_id: string
  category_id: string | null
  /** Stamped from the picked variant at save time; null on rows created
   *  before the columns existed. */
  oem_id: string | null
  condition: DemoLineCondition | null
  qty: number
  unit_price: string
  /** GST % the part carries (variant HSN, else the part's); null when no HSN
   *  is linked. Decimal-as-string off the wire. */
  tax_rate?: string | null
  pm_status: DemoRequestItemPMStatus
  pm_rejection_reason: string | null
  /** Approver's note, saved on approve and on reject. */
  pm_notes?: string | null
  product_manager_id: string | null
  returned_qty: number
  pending_qty: number
  return_condition: DemoRequestReturnCondition | null
  actual_return_date: string | null
  serial_numbers: string[]
  days_of_delay: number
  // Viewer-scoped action gate (backend `can_approve`): true iff the CURRENT
  // caller may approve/reject this item right now — folds in pm_status ==
  // Pending and the caller being superuser / the stamped PM / an eligible PM
  // for the category. FE gates the per-line Approve/Reject controls on this
  // instead of matching `product_manager_id`. Defaults false when absent.
  can_approve?: boolean
  // Back-reference to the SO line birthed by demo→SO partial conversion.
  // `null` until this item has been converted.
  converted_to_so_line_id: string | null
  created_at: string
  updated_at: string
}

export interface DemoRequestListItemWire {
  id: string
  demo_number: string
  source: DemoRequestSource
  requestable_type: DemoRequestSource
  requestable_id: string
  account_id: string
  lead_id: string | null
  deal_id: string | null
  status: DemoRequestStatusWire
  expected_return_date: string
  is_overdue: boolean
  created_at: string
  updated_at: string
  /** Who raised it (DRs have no created_by) + display name, resolved server-side. */
  requested_by_id?: string | null
  requested_by_name?: string | null
  /** List payloads only — denormalised so a list row needs no per-row
   *  account / detail fetch (PM Approvals Demo tab). */
  account_name?: string | null
  account_code?: string | null
  items_count?: number
  /** Lines still awaiting a PM decision (all PMs). */
  pending_items_count?: number
}

export interface DemoRequestWire extends DemoRequestListItemWire {
  contact_id: string
  shipping_address_id: string
  requested_by_id: string
  dispatch_id: string | null
  /** Transient: the SO just created by a convert-to-order call — present only
   *  on the convert response (a demo may have many SOs; the durable list is the
   *  Sales Orders tab). Null everywhere else. */
  converted_sales_order_id: string | null
  notes: string | null
  items: DemoRequestItemWire[]
}

export interface DemoRequestsListResponse {
  items: DemoRequestListItemWire[]
  total: number
  page: number
  page_size: number
}

export interface FetchDemoRequestsParams {
  page?: number
  page_size?: number
  q?: string
  status?: DemoRequestStatusWire[]
  account_id?: string
  requestable_type?: DemoRequestSource
  requestable_id?: string
  overdue?: boolean
  /** Created-date range (IST calendar days, inclusive). `YYYY-MM-DD`. */
  date_from?: string
  date_to?: string
  sort?: string
}

/** Filters shared by the list and its stats call. Status / overdue are left
 *  out on purpose: the stats cover every status so each tab shows its count. */
export type FetchDemoRequestStatsParams = Pick<
  FetchDemoRequestsParams,
  "q" | "account_id" | "requestable_type" | "requestable_id" | "date_from" | "date_to"
>

/** `GET /crm/demo-requests/stats` — counts over the whole filtered, visibility-
 *  scoped set (not the current page). `by_status` has a key for every status. */
export interface DemoRequestStatsWire {
  total: number
  by_status: Record<DemoRequestStatusWire, number>
  overdue: number
}

export interface DemoRequestItemApproveBody {
  pm_notes?: string
}

// ── Convert-to-order (2026-05-27 Track 3 reshape) ─────────────────────
// Mirrors `DemoConvertToOrderRequest` in schema.gen.ts: the operator picks
// which demo items roll into the SO (`demo_request_item_ids`) and may tack on
// net-new part-backed lines (`additional_items`). The service requires at
// least one of the two arrays to be non-empty.
export interface DemoConvertAdditionalItemPayload {
  part_variant_id: string
  qty: number
  rate: number | string
}

export interface DemoRequestItemRejectBody {
  pm_rejection_reason: string
  pm_notes?: string
}

export async function fetchDemoRequests(
  params: FetchDemoRequestsParams = {},
): Promise<DemoRequestsListResponse> {
  return apiClient.get<DemoRequestsListResponse>(endpoints.crm.demoRequests, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      q: params.q?.trim() || undefined,
      status: params.status,
      account_id: params.account_id,
      requestable_type: params.requestable_type,
      requestable_id: params.requestable_id,
      overdue: params.overdue,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      sort: params.sort,
    },
  })
}

export async function fetchDemoRequestStats(
  params: FetchDemoRequestStatsParams = {},
): Promise<DemoRequestStatsWire> {
  return apiClient.get<DemoRequestStatsWire>(endpoints.crm.demoRequestsStats, {
    params: {
      q: params.q?.trim() || undefined,
      account_id: params.account_id,
      requestable_type: params.requestable_type,
      requestable_id: params.requestable_id,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
    },
  })
}

export interface FetchPendingDemoRequestsForPMParams {
  page?: number
  page_size?: number
  /** PM Approvals toolbar filters — server-side, applied before paging. */
  search?: string
  account_id?: string[]
  /** Demo requests raised by these users (`requested_by`). */
  user_id?: string[]
  /** created_at, inclusive IST days (YYYY-MM-DD). */
  date_from?: string
  date_to?: string
  /** Server sort, `field` or `-field` (desc). */
  sort?: string
}

export interface PendingDemoRequestsForPMPage {
  items: DemoRequestListItemWire[]
  total: number
  page: number
  page_size: number
}

// Server-paginated (the endpoint used to return the whole queue as a list,
// which the FE then windowed client-side — §16.7).
export async function fetchPendingDemoRequestsForPM(
  params: FetchPendingDemoRequestsForPMParams = {},
): Promise<PendingDemoRequestsForPMPage> {
  return apiClient.get<PendingDemoRequestsForPMPage>(endpoints.crm.demoRequestsPendingPM, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search || undefined,
      account_id: params.account_id?.length ? params.account_id : undefined,
      user_id: params.user_id?.length ? params.user_id : undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      // Server sort: `field` / `-field` (allow-listed by the endpoint).
      sort: params.sort || undefined,
    },
  })
}

export async function fetchDemoRequest(id: string): Promise<DemoRequestWire> {
  return apiClient.get<DemoRequestWire>(endpoints.crm.demoRequest(id))
}

export async function createDemoRequest(
  body: DemoRequestCreatePayload,
): Promise<DemoRequestWire> {
  return apiClient.post<DemoRequestWire>(endpoints.crm.demoRequests, body)
}

export async function updateDemoRequestItem(
  id: string,
  itemId: string,
  body: DemoRequestItemUpdatePayload,
): Promise<DemoRequestItemWire> {
  return apiClient.patch<DemoRequestItemWire>(
    endpoints.crm.demoRequestItem(id, itemId),
    body,
  )
}

export async function approveDemoRequestItem(
  id: string,
  itemId: string,
  body: DemoRequestItemApproveBody = {},
): Promise<DemoRequestWire> {
  return apiClient.patch<DemoRequestWire>(
    endpoints.crm.demoRequestItemApprove(id, itemId),
    body,
  )
}

export async function rejectDemoRequestItem(
  id: string,
  itemId: string,
  body: DemoRequestItemRejectBody,
): Promise<DemoRequestWire> {
  return apiClient.patch<DemoRequestWire>(
    endpoints.crm.demoRequestItemReject(id, itemId),
    body,
  )
}

/** One still-dispatched demo unit (serial) — the per-serial convert picker. */
export interface DemoDispatchedUnitWire {
  dispatch_request_item_id: string
  demo_request_item_id: string
  part_variant_id: string
  part_name: string
  variant_name: string
  internal_serial: string
  manufacturer_serial: string | null
}

/** One unit to convert into its own qty-1 SO line at `rate`. */
export interface ConvertDemoUnit {
  dispatch_request_item_id: string
  rate: number
}

export interface ConvertDemoToOrderPayload {
  /** Per-serial selection: each entry becomes its own qty-1 SO line, and only
   *  those units flip to sold. Unlisted dispatched units stay returnable. */
  units?: ConvertDemoUnit[]
  /** Whole-item selection (legacy). Must be dispatched and not already
   *  converted (the backend rejects otherwise). */
  demo_request_item_ids?: string[]
  /** Net-new part-backed SO lines piggybacking on the conversion (close-won
   *  wizard). The service requires ≥1 of units / item ids / add-ons. */
  additional_items?: DemoConvertAdditionalItemPayload[]
  /** Optional per-item sell-price overrides for the whole-item path. */
  item_rates?: Record<string, number>
  notes?: string
}

export async function fetchDemoDispatchedUnits(
  id: string,
): Promise<DemoDispatchedUnitWire[]> {
  return apiClient.get<DemoDispatchedUnitWire[]>(
    endpoints.crm.demoRequestDispatchedUnits(id),
  )
}

/** A sales order derived from this demo (per-serial conversion + linked SO). */
export interface DemoSalesOrderWire {
  id: string
  order_number: string
  status: string
  grand_total: string
  items_count: number
  created_at: string
}

export async function fetchDemoSalesOrders(id: string): Promise<DemoSalesOrderWire[]> {
  return apiClient.get<DemoSalesOrderWire[]>(endpoints.crm.demoRequestSalesOrders(id))
}

export async function convertDemoRequestToOrder(
  id: string,
  payload: ConvertDemoToOrderPayload,
): Promise<DemoRequestWire> {
  return apiClient.post<DemoRequestWire>(
    endpoints.crm.demoRequestConvertToOrder(id),
    payload,
  )
}

// ─── Fulfillment (demo detail cards + per-line custody) ────────────────────
//
// Mirrors `comprint-erp-backend/app/modules/crm/schemas/demo_request_fulfillment.py`.
//
// One source per number, and the backend already resolved every conflict:
// `dispatched` / `returned` / `sold` are CRM counters, `issued` / `ready` /
// `qc_failed` are the WMS pipeline, `under_return` comes from open demo-return
// drafts, and `with_customer` is derived server-side. The UI does no
// arithmetic beyond folding the three pipeline buckets into one "In progress"
// number — see `inProgressCount`.

/** Where one physical unit sits right now. */
export type DemoUnitCustody = "with_customer" | "returned" | "converted"

export interface DemoUnitWire {
  dispatch_request_item_id: string
  internal_serial: string
  manufacturer_serial: string | null
  custody: DemoUnitCustody
}

export interface DemoStageRollupWire {
  requested: number
  pending_dispatch: number
  issued: number
  ready: number
  qc_failed: number
  dispatched: number
  with_customer: number
  under_return: number
  returned: number
  sold: number
  rejected: number
}

export interface DemoLineFulfillmentWire extends DemoStageRollupWire {
  demo_request_item_id: string
  pm_status: string
  units: DemoUnitWire[]
}

export interface DemoRequestFulfillmentWire {
  lines: DemoLineFulfillmentWire[]
  rollup: DemoStageRollupWire
}

export async function fetchDemoRequestFulfillment(
  id: string,
): Promise<DemoRequestFulfillmentWire> {
  return apiClient.get<DemoRequestFulfillmentWire>(
    endpoints.crm.demoRequestFulfillment(id),
  )
}
