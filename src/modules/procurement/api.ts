import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import type { components } from "@/shared/api/schema.gen"
import { PAGINATION } from "@/shared/constants"

// ─── Vendor types ─────────────────────────────────────────────────
//
// Hand-written to match `app/modules/procurement/schemas/vendor.py`. These
// will be replaced by `pnpm api:gen` output once the generated schema
// (src/shared/api/schema.gen.ts) catches the procurement namespace — at
// that point switch to `components["schemas"]["VendorResponse"]` etc. and
// delete this block.

export type VendorStatus = "active" | "inactive"

// A vendor's additional coordinating person. The flat contact_* fields on the
// vendor remain the "primary" contact; these are the extra people and back the
// PO "Purchase Requested By" picker.
export interface VendorContact {
  id: string
  vendor_id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
  // True for the vendor's flat "primary" contact, surfaced as a synthetic
  // first option in the PO picker (its id equals the vendor id).
  is_primary: boolean
}

// Form/create shape for a contact (no id — the server assigns it).
export interface VendorContactInput {
  name: string
  email?: string | null
  phone?: string | null
}

export interface Vendor {
  id: string
  code: string
  name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  gst_number: string | null
  status: VendorStatus
  notes: string | null
  // Structured postal address — surfaced on the PO via SupplierBrief.
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  pincode: string | null
  country: string | null
  created_by: string
  created_at: string
  updated_at: string
  contacts: VendorContact[]
}

export interface VendorListItem {
  id: string
  code: string
  name: string
  contact_name: string | null
  contact_email: string | null
  status: VendorStatus
  created_at: string
  updated_at: string
}

export interface VendorsListResponse {
  items: VendorListItem[]
  total: number
  page: number
  page_size: number
}

export interface VendorCreatePayload {
  name: string
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  gst_number?: string | null
  status?: VendorStatus
  notes?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  country?: string | null
  // Omit to leave contacts untouched (update); an explicit array (incl. [])
  // replaces the whole set.
  contacts?: VendorContactInput[]
}

export interface VendorContactsListResponse {
  items: VendorContact[]
  total: number
  page: number
  page_size: number
}

export interface FetchVendorContactsParams {
  page?: number
  page_size?: number
  search?: string
}

// PATCH payload — every field optional. Send `null` to clear, omit to keep.
export type VendorUpdatePayload = Partial<VendorCreatePayload>

export type VendorSortField =
  | "name"
  | "code"
  | "created_at"
  | "updated_at"
  | "-name"
  | "-code"
  | "-created_at"
  | "-updated_at"

export interface FetchVendorsParams {
  page?: number
  page_size?: number
  search?: string
  status?: VendorStatus
  sort?: VendorSortField
}

// ─── Wrappers ─────────────────────────────────────────────────────

export async function fetchVendors(
  params: FetchVendorsParams = {},
): Promise<VendorsListResponse> {
  return apiClient.get<VendorsListResponse>(endpoints.procurement.vendors, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
      status: params.status,
      sort: params.sort,
    },
  })
}

export async function fetchVendor(id: string): Promise<Vendor> {
  return apiClient.get<Vendor>(endpoints.procurement.vendor(id))
}

export async function createVendor(body: VendorCreatePayload): Promise<Vendor> {
  return apiClient.post<Vendor>(endpoints.procurement.vendors, body)
}

export async function updateVendor(
  id: string,
  body: VendorUpdatePayload,
): Promise<Vendor> {
  return apiClient.patch<Vendor>(endpoints.procurement.vendor(id), body)
}

export async function deleteVendor(id: string): Promise<void> {
  await apiClient.delete<null>(endpoints.procurement.vendor(id))
}

// Paginated/searchable contacts of a vendor — backs the PO "Purchase Requested
// By" dropdown (see useVendorContactOptions).
export async function fetchVendorContacts(
  vendorId: string,
  params: FetchVendorContactsParams = {},
): Promise<VendorContactsListResponse> {
  return apiClient.get<VendorContactsListResponse>(
    endpoints.procurement.vendorContacts(vendorId),
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        search: params.search?.trim() || undefined,
      },
    },
  )
}

// ─── Material-Inquiry vendor responses (procurement-side, MI-3) ─────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/
// material_inquiry_response.py:MIResponseFullView` (and the Add/Update
// payload classes). Sales-side embeds use the slimmer `MIResponseSalesView`
// shape — that one lives in `modules/crm/api.ts` (`MIResponseSalesViewWire`)
// and is what gets nested under each MI item on the CRM detail GET.
//
// Backend permissions: list/get → PROCUREMENT_READ; add/update/delete →
// PROCUREMENT_RESPOND. A sales user without PROCUREMENT_READ will see a
// 403 from the GET — the FE renders a friendly "ask procurement" hint.

export type MIResponsePMStatus = "pending" | "approved" | "rejected"

export interface VendorEmbedOnResponseWire {
  id: string
  code: string
  name: string
}

export interface MIResponseFullViewWire {
  id: string
  enquiry_item_id: string
  vendor: VendorEmbedOnResponseWire
  vendor_id: string
  cost_price: number
  qty_available: number
  qty_allocated: number
  available_date: string | null      // ISO "YYYY-MM-DD"
  margin_pct: number | null
  sell_price: number | null
  pm_status: MIResponsePMStatus
  pm_actioned_by: string | null
  pm_actioned_at: string | null
  pm_notes: string | null
  responded_by: string
  responded_at: string
  created_at: string
  updated_at: string
}

export interface MIResponseAddPayload {
  vendor_id: string
  cost_price: number
  qty_available: number
  available_date?: string            // ISO "YYYY-MM-DD"
  pm_notes?: string
}

export async function fetchMIResponsesForItem(
  miId: string,
  itemId: string,
): Promise<MIResponseFullViewWire[]> {
  return apiClient.get<MIResponseFullViewWire[]>(
    endpoints.procurement.inquiryItemResponses(miId, itemId),
  )
}

export async function fetchMIResponse(
  miId: string,
  respId: string,
): Promise<MIResponseFullViewWire> {
  return apiClient.get<MIResponseFullViewWire>(
    endpoints.procurement.inquiryResponse(miId, respId),
  )
}

export async function addMIResponse(
  miId: string,
  itemId: string,
  body: MIResponseAddPayload,
): Promise<MIResponseFullViewWire> {
  return apiClient.post<MIResponseFullViewWire>(
    endpoints.procurement.inquiryItemResponses(miId, itemId),
    body,
  )
}

export async function deleteMIResponse(
  miId: string,
  respId: string,
): Promise<void> {
  await apiClient.delete<null>(endpoints.procurement.inquiryResponse(miId, respId))
}

// ─── PM queue + approve/reject (MI-4) ───────────────────────────────────
//
// Wire shapes mirror `material_inquiry_response.py:PMQueueInquiry`,
// `MIProcurementDetail`, `MIResponsePMApprove`, `MIResponsePMReject`.
//
// Backend permission:
//   * `me/pending`, `/approve`, `/reject` → PM_APPROVE
//   * `/inquiries/{mi_id}` (procurement detail) → PROCUREMENT_READ
//
// Spec details verified end-to-end in the service code:
//   * On approve, PM supplies EITHER `margin_pct` OR `sell_price` (or both —
//     server validates consistency). Both null → server applies env-default
//     margin (~7%). `qty_allocated` is required.
//   * On reject, only `pm_notes` is accepted (optional).

export type OpportunityType = "Lead" | "Deal"

export interface PMQueueInquiryWire {
  id: string
  enquiry_number: string
  status: string
  created_at: string
  updated_at: string
  opportunity_type: OpportunityType
  opportunity_id: string
  company_name: string | null
  items_with_pending: number
  pending_response_count: number
  oldest_pending_at: string         // ISO datetime — drives "X days waiting"
  // Creator + display name, resolved server-side (no /users call).
  created_by?: string | null
  created_by_name?: string | null
}

export interface PMQueueListResponse {
  items: PMQueueInquiryWire[]
  total: number
  page: number
  page_size: number
}

export interface FetchMyPMQueueParams {
  page?: number
  page_size?: number
  /** PM Approvals toolbar filters — server-side, applied before paging. */
  search?: string
  /** Inquiries created by these users. */
  user_id?: string[]
  /** Inquiry created_at, inclusive IST days (YYYY-MM-DD). */
  date_from?: string
  date_to?: string
}

export interface ResponseSummaryWire {
  pending: number
  approved: number
  rejected: number
  total: number
}

export interface CategoryEmbedOnItemWire {
  id: string
  code: string
  name: string
}

export interface LeadEmbedOnInquiryWire {
  id: string
  lead_code: string
  company_name: string | null
  stage: string
  priority: string
}

// Deal snapshot embedded on the procurement-side MI detail. Mirrors
// LeadEmbedOnInquiryWire so the FE renders deal-sourced inquiries with
// the same shape as lead-sourced ones. ``company_name`` is the linked
// account's name (Deal has no denormalised company field).
export interface DealEmbedOnInquiryWire {
  id: string
  deal_number: string
  title: string
  company_name: string | null
  stage: string
  priority: string
}

export interface ItemProcurementViewWire {
  id: string
  enquiry_id: string
  item_name: string
  description: string | null
  qty_requested: number
  client_budget_per_unit: number | null
  client_timeline: string | null
  // Backend: app/modules/crm/schemas/material_inquiry_response.py
  // `ItemProcurementView.product_manager_id`. Drives the per-line PM-scope
  // filter on the PM Approvals MI detail surface.
  product_manager_id: string | null
  category: CategoryEmbedOnItemWire | null
  response_summary: ResponseSummaryWire
  qty_allocated_total: number
  qty_remaining: number
  blended_sell_price: number | null
  created_at: string
  updated_at: string
}

export interface MIProcurementDetailWire {
  id: string
  enquiry_number: string
  status: string
  description: string | null
  client_budget: number | null
  client_timeline: string | null
  notes: string | null
  assigned_to_id: string | null
  lead: LeadEmbedOnInquiryWire | null
  deal_id: string | null
  deal: DealEmbedOnInquiryWire | null
  items: ItemProcurementViewWire[]
  created_at: string
  updated_at: string
}

export interface MIResponsePMApprovePayload {
  qty_allocated: number              // required, int 0..10_000_000
  margin_pct?: number                // optional 0..100 (Decimal 5,2)
  sell_price?: number                // optional ≥ 0
  pm_notes?: string                  // optional ≤ 2000
}

export interface MIResponsePMRejectPayload {
  pm_notes?: string                  // optional ≤ 2000
}

export async function fetchMyPMQueue(
  params: FetchMyPMQueueParams = {},
): Promise<PMQueueListResponse> {
  return apiClient.get<PMQueueListResponse>(endpoints.procurement.inquiriesMyPending, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search || undefined,
      user_id: params.user_id?.length ? params.user_id : undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
    },
  })
}

export async function fetchMIProcurementDetail(
  miId: string,
): Promise<MIProcurementDetailWire> {
  return apiClient.get<MIProcurementDetailWire>(endpoints.procurement.inquiry(miId))
}

export async function approveMIResponse(
  miId: string,
  respId: string,
  body: MIResponsePMApprovePayload,
): Promise<MIResponseFullViewWire> {
  return apiClient.patch<MIResponseFullViewWire>(
    endpoints.procurement.inquiryResponseApprove(miId, respId),
    body,
  )
}

export async function rejectMIResponse(
  miId: string,
  respId: string,
  body: MIResponsePMRejectPayload = {},
): Promise<MIResponseFullViewWire> {
  return apiClient.patch<MIResponseFullViewWire>(
    endpoints.procurement.inquiryResponseReject(miId, respId),
    body,
  )
}

// ─── Purchase Orders (PO enrichment, Tier 1-3) ──────────────────────────
//
// Backend-aligned via generated OpenAPI types (run `pnpm api:gen` after any
// backend PO schema change). Mirrors:
//   comprint-erp-backend/app/modules/procurement/schemas/purchase_order.py
// Money fields (subtotal/tax_amount/grand_total/line_*) arrive as decimal
// STRINGS on the wire (Pydantic Decimal → JSON string); render via the
// currency helpers, do not Number() them for display rounding.

export type PurchaseOrderStatus = components["schemas"]["PurchaseOrderListItem"]["status"]
export type SupplierBrief = components["schemas"]["SupplierBrief"]
export type PurchaseOrderListItem = components["schemas"]["PurchaseOrderListItem"]
export type PurchaseOrderItemView = components["schemas"]["PurchaseOrderItemView"]
export type PurchaseOrder = components["schemas"]["PurchaseOrderResponse"]
export type PurchaseOrderCreatePayload = components["schemas"]["PurchaseOrderCreate"]
export type PurchaseOrderItemCreatePayload = components["schemas"]["PurchaseOrderItemCreate"]
export type PurchaseOrdersListResponse =
  components["schemas"]["PaginatedResponse_PurchaseOrderListItem_"]

export type PurchaseOrderSortField =
  | "po_number"
  | "status"
  | "created_at"
  | "updated_at"
  | "expected_delivery_date"
  // Computed quantity columns, sorted server-side from the line-item rollup
  | "items"
  | "ordered"
  | "received"
  | "pending"
  | "returned"
  | "-po_number"
  | "-status"
  | "-created_at"
  | "-updated_at"
  | "-expected_delivery_date"
  | "-items"
  | "-ordered"
  | "-received"
  | "-pending"
  | "-returned"

export interface FetchPurchaseOrdersParams {
  page?: number
  page_size?: number
  status?: PurchaseOrderStatus
  /** Maker-checker axis, orthogonal to `status`. Repeated on the wire —
   *  a PO matching ANY listed approval status is returned. */
  approval_status?: PurchaseOrderApprovalStatus[]
  warehouse_id?: string
  supplier_id?: string
  condition?: "new" | "refurbished"
  /** True = only POs with a rejected amendment awaiting re-amendment. Orthogonal
   *  to `status` — a flagged PO stays receivable. */
  has_rejected_amendment?: boolean
  q?: string
  sort?: PurchaseOrderSortField
}

export async function fetchPurchaseOrders(
  params: FetchPurchaseOrdersParams = {},
): Promise<PurchaseOrdersListResponse> {
  return apiClient.get<PurchaseOrdersListResponse>(endpoints.procurement.purchaseOrders, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      status: params.status,
      // Axios `paramsSerializer: { indexes: null }` expands this to repeated
      // `approval_status=a&approval_status=b`, which is what FastAPI's
      // `list[str] | None` Query expects. An empty array must collapse to
      // undefined or it serializes to nothing and silently drops the filter.
      approval_status: params.approval_status?.length ? params.approval_status : undefined,
      warehouse_id: params.warehouse_id,
      supplier_id: params.supplier_id,
      condition: params.condition,
      has_rejected_amendment: params.has_rejected_amendment ? true : undefined,
      q: params.q?.trim() || undefined,
      sort: params.sort,
    },
  })
}

/** PO picker feed for the purchase-return form. Same shape as
 *  `fetchPurchaseOrders`, but hits the `procurement:po_return_write`-gated
 *  `/purchase-orders/returnable` endpoint so warehouse roles that raise returns
 *  (store_manager, mis) can list POs without holding the coarse `procurement:read`. */
export async function fetchReturnablePurchaseOrders(
  params: Pick<FetchPurchaseOrdersParams, "page" | "page_size" | "q" | "sort"> & {
    /** Restrict to POs in these warehouses — the WMS navbar warehouse scope. */
    warehouse_ids?: string[]
  } = {},
): Promise<PurchaseOrdersListResponse> {
  return apiClient.get<PurchaseOrdersListResponse>(
    endpoints.procurement.purchaseOrdersReturnable,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        // Repeated `warehouse_ids=a&warehouse_ids=b` (paramsSerializer indexes:null).
        // An empty array must collapse to undefined or it silently drops the filter.
        warehouse_ids: params.warehouse_ids?.length ? params.warehouse_ids : undefined,
        q: params.q?.trim() || undefined,
        sort: params.sort,
      },
    },
  )
}

export async function fetchPurchaseOrder(
  id: string,
  // `?include=returns` asks the backend to attach `credit_rollup` (returned /
  // refund / replace / undecided unit counts + credit totals). Kept opt-in so
  // the list, form, and approval callers stay cheap — only the detail page,
  // which renders the returns tab + credit banner + close-block, requests it.
  include?: "returns",
): Promise<PurchaseOrder> {
  const path = include
    ? `${endpoints.procurement.purchaseOrder(id)}?include=${include}`
    : endpoints.procurement.purchaseOrder(id)
  return apiClient.get<PurchaseOrder>(path)
}

// ─── Purchase returns (return-to-vendor) — procurement-side read ─────────
//
// The return itself is raised / dispatched / settled from the WMS pages; the
// PO detail only needs to LIST what already went back (the audit trail shown
// to a disputing vendor) and the credit rollup. Types are re-exported from the
// generated schema here — mirroring wms/api.ts — so procurement code never
// reaches across the module boundary for them.
export type PurchaseReturn = components["schemas"]["PurchaseReturnResponse"]
export type PurchaseReturnItem =
  components["schemas"]["PurchaseReturnItemResponse"]
export type POCreditRollup = components["schemas"]["POCreditRollup"]

/** Every return already raised against a PO — feeds the PO detail's returns
 *  tab, the per-line `Returned` count, and the close-block. */
export async function fetchPurchaseOrderReturns(
  poId: string,
): Promise<PurchaseReturn[]> {
  const res = await apiClient.get<PurchaseReturn[]>(
    endpoints.procurement.purchaseOrderReturns(poId),
  )
  return res ?? []
}

export async function createPurchaseOrder(
  body: PurchaseOrderCreatePayload,
): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>(endpoints.procurement.purchaseOrders, body)
}

// ─── PO approval lifecycle (spec-po-approval Tier A) ────────────────────

export type PurchaseOrderApprovalStatus =
  components["schemas"]["PurchaseOrderResponse"]["approval_status"]
export type PurchaseOrderApprovePayload = components["schemas"]["PurchaseOrderApprovePayload"]
export type PurchaseOrderRejectPayload = components["schemas"]["PurchaseOrderRejectPayload"]
export type PurchaseOrderApprovalQueueItem =
  components["schemas"]["PurchaseOrderApprovalQueueItem"]
export type PurchaseOrderApprovalQueueResponse =
  components["schemas"]["PaginatedResponse_PurchaseOrderApprovalQueueItem_"]

export async function submitPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>(endpoints.procurement.purchaseOrderSubmit(id))
}

export async function approvePurchaseOrder(
  id: string,
  body: PurchaseOrderApprovePayload = { category_ids: [] },
): Promise<PurchaseOrder> {
  return apiClient.patch<PurchaseOrder>(endpoints.procurement.purchaseOrderApprove(id), body)
}

export async function rejectPurchaseOrder(
  id: string,
  body: PurchaseOrderRejectPayload,
): Promise<PurchaseOrder> {
  return apiClient.patch<PurchaseOrder>(endpoints.procurement.purchaseOrderReject(id), body)
}

// The printed PO, rendered by the backend from the live order.
export async function downloadPurchaseOrderPdf(id: string): Promise<Blob> {
  return (await apiClient.getBlob(endpoints.procurement.purchaseOrderPdf(id))).blob
}

export async function downloadPurchaseOrderVersionPdf(id: string, version: number): Promise<Blob> {
  return (await apiClient.getBlob(endpoints.procurement.purchaseOrderVersionPdf(id, version))).blob
}

export async function clonePurchaseOrder(id: string): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>(endpoints.procurement.purchaseOrderClone(id))
}

export async function amendPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>(endpoints.procurement.purchaseOrderAmend(id))
}

// ─── PO stats (tab badges + KPI tiles) ──────────────────────────────────

export type PurchaseOrderStats = components["schemas"]["PurchaseOrderStatsResponse"]

/** Per-status counts + total order value under the list's filters (status
 *  excluded — it's the dimension). One call feeds the tab badges and the
 *  KPI tiles instead of N single-row list queries. */
export async function fetchPurchaseOrderStats(
  params: {
    warehouse_id?: string
    supplier_id?: string
    condition?: "new" | "refurbished"
    q?: string
  } = {},
): Promise<PurchaseOrderStats> {
  return apiClient.get<PurchaseOrderStats>(endpoints.procurement.purchaseOrderStats, {
    params: {
      warehouse_id: params.warehouse_id,
      supplier_id: params.supplier_id,
      condition: params.condition,
      q: params.q?.trim() || undefined,
    },
  })
}

// ─── PO close / cancel (spec-po-close-cancel-and-documents §B) ──────────

export type PurchaseOrderClosePayload = components["schemas"]["PurchaseOrderClosePayload"]
export type PurchaseOrderCancelPayload = components["schemas"]["PurchaseOrderCancelPayload"]

export async function closePurchaseOrder(
  id: string,
  body: PurchaseOrderClosePayload = {},
): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>(endpoints.procurement.purchaseOrderClose(id), body)
}

export async function cancelPurchaseOrder(
  id: string,
  body: PurchaseOrderCancelPayload,
): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>(endpoints.procurement.purchaseOrderCancel(id), body)
}

export interface FetchMyPoApprovalsParams {
  page?: number
  page_size?: number
  /** PM Approvals toolbar: PO number or supplier name. */
  search?: string
  /** POs created by these users. */
  user_id?: string[]
  /** PO created_at, inclusive IST days (YYYY-MM-DD). */
  date_from?: string
  date_to?: string
  /** Server sort, `field` or `-field` (desc). */
  sort?: string
}

export async function fetchMyPoApprovals(
  params: FetchMyPoApprovalsParams = {},
): Promise<PurchaseOrderApprovalQueueResponse> {
  return apiClient.get<PurchaseOrderApprovalQueueResponse>(
    endpoints.procurement.purchaseOrderApprovals,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        search: params.search || undefined,
        user_id: params.user_id?.length ? params.user_id : undefined,
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
        // Server sort: `field` / `-field` (allow-listed by the endpoint).
        sort: params.sort || undefined,
      },
    },
  )
}

// ─── PO amend (issued) + version trail (Tier B) ─────────────────────────

export type PurchaseOrderAmendPayload = components["schemas"]["PurchaseOrderAmendPayload"]
export type PoVersionSnapshot = components["schemas"]["PoVersionSnapshotView"]

// A line inside a snapshot's `payload.items`. The backend's `list_versions`
// denormalizes part fields + computes per-line money so the FE can render a
// full line table per version. The generated `payload` type is an opaque
// `{[k: string]: unknown}`, so this is the hand-written read shape for it.
export interface PoSnapshotLine {
  /** Stable id of this proposed line (per-line approval scope). */
  line_id: string
  /** The live PO line this proposed line edits (null = a newly added line).
   *  Used to re-seed the draft editor's `original` so a description edit keeps
   *  its identity even though the content key changed. */
  source_line_id: string | null
  part_variant_id: string | null
  description: string | null
  category_id: string | null
  /** Denormalized category name for display (added by the version-list builder). */
  category_name?: string | null
  ordered_quantity: number
  unit_price: string | null
  tax_rate: string | null
  /** The part's HSN rate today (added by the version-list endpoint); locks the
   *  rate when the draft is re-edited. Null with no HSN code. */
  hsn_gst_rate?: string | null
  // Per-line approval state on the amendment. Unchanged carried-over lines are
  // "approved" (no PM action); only amended/added lines are "pending".
  pm_id: string | null
  pm_status: "pending" | "approved" | "rejected"
  /** The PM's note recorded when this line was rejected — the amendment
   *  rejection reason surfaced back to the maker. Null unless pm_status is
   *  "rejected". It rides in the payload but is absent from the generated
   *  type, so it lives on this hand-written read shape. */
  pm_notes: string | null
  /** The viewer may approve/reject this specific pending line. */
  can_act: boolean
  // Denormalized (catalog lines only — null for free-text lines).
  part_number: string | null
  part_name: string | null
  variant_name: string | null
  variant_sku: string | null
  condition: string | null
  // Computed money (decimal strings).
  line_total: string
  line_tax: string
  line_total_with_tax: string
}

/** Read a snapshot's proposed lines with the denormalized/computed shape. */
export function snapshotLines(snap: PoVersionSnapshot): PoSnapshotLine[] {
  return ((snap.payload as { items?: PoSnapshotLine[] }).items ?? []) as PoSnapshotLine[]
}

/** Commercial header (payment/delivery terms + notes) captured on a snapshot —
 *  drives the amend form seed and the per-version display in the trail. */
export function snapshotHeader(snap: PoVersionSnapshot): {
  payment_terms: string | null
  delivery_terms: string | null
  other_references: string | null
  notes: string | null
} {
  const p = snap.payload as {
    payment_terms?: string | null
    delivery_terms?: string | null
    other_references?: string | null
    notes?: string | null
  }
  return {
    payment_terms: p.payment_terms ?? null,
    delivery_terms: p.delivery_terms ?? null,
    other_references: p.other_references ?? null,
    notes: p.notes ?? null,
  }
}

// ── Amendment rejection ─────────────────────────────────────────────────
// A rejected amendment is discarded to a `historical` snapshot whose rejected
// lines carry the PM's `pm_notes`. These helpers read that state so the maker
// can see why their amendment was turned down.

/** A rejected amendment = a historical snapshot with at least one rejected
 *  line. (An applied amendment is also historical, but has no rejected lines.) */
export function isRejectedSnapshot(snap: PoVersionSnapshot): boolean {
  return (
    snap.status === "historical" &&
    snapshotLines(snap).some((l) => l.pm_status === "rejected")
  )
}

/** The rejected lines of a snapshot, paired with the reason recorded on each. */
export function snapshotRejections(
  snap: PoVersionSnapshot,
): { line: PoSnapshotLine; reason: string | null }[] {
  return snapshotLines(snap)
    .filter((l) => l.pm_status === "rejected")
    .map((l) => ({ line: l, reason: l.pm_notes?.trim() || null }))
}

/** The distinct rejection reasons on a snapshot. Usually one — a PM rejects the
 *  whole amendment with a single note — but different lines may cite different
 *  reasons, so callers can decide whether to show one paragraph or a list. */
export function snapshotRejectionReasons(snap: PoVersionSnapshot): string[] {
  const notes = snapshotRejections(snap)
    .map((r) => r.reason)
    .filter((n): n is string => Boolean(n))
  return [...new Set(notes)]
}

export async function amendIssuedPurchaseOrder(
  id: string,
  body: PurchaseOrderAmendPayload,
): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>(endpoints.procurement.purchaseOrderAmendIssued(id), body)
}

export async function fetchPurchaseOrderVersions(id: string): Promise<PoVersionSnapshot[]> {
  return apiClient.get<PoVersionSnapshot[]>(endpoints.procurement.purchaseOrderVersions(id))
}

// Per-category approval breakdown (Tier A draft + Tier B amend).
export type PurchaseOrderCategoryApproval =
  components["schemas"]["PurchaseOrderCategoryApproval"]

// Update a DRAFT PO's header + lines (edit before submit). Same payload
// shape as create; the PO stays a draft.
export async function updateDraftPurchaseOrder(
  id: string,
  body: PurchaseOrderCreatePayload,
): Promise<PurchaseOrder> {
  return apiClient.patch<PurchaseOrder>(endpoints.procurement.purchaseOrder(id), body)
}

// Flow B amendment ops (issued PO: amend stages a DRAFT you edit then submit).
export async function editAmendment(
  id: string,
  body: PurchaseOrderAmendPayload,
): Promise<PurchaseOrder> {
  return apiClient.patch<PurchaseOrder>(endpoints.procurement.purchaseOrderAmendmentEdit(id), body)
}

export async function submitAmendment(id: string): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>(endpoints.procurement.purchaseOrderAmendmentSubmit(id))
}

export async function cancelAmendment(id: string): Promise<PurchaseOrder> {
  return apiClient.delete<PurchaseOrder>(endpoints.procurement.purchaseOrderAmendmentCancel(id))
}
