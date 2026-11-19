import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"

import type { CrmIdNameRef } from "./_shared"

// ─── Material Inquiries (sales-facing) ──────────────────────────────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/
// material_inquiry.py`. Verified live against the OpenAPI dump on
// 2026-05-08. Items are nested under the detail GET; list rows are slim
// (no items, no notes, no client_timeline).
//
// Status is lowercase per backend Literal — the FE renders title-case
// labels via a helper, never by string-mangling the wire value.

export type MaterialInquiryStatus =
  | "draft"
  | "submitted"
  | "partially_responded"
  | "fully_responded"
  | "partially_approved"
  | "fully_approved"
  | "closed"

export const MATERIAL_INQUIRY_STATUSES: readonly MaterialInquiryStatus[] = [
  "draft",
  "submitted",
  "partially_responded",
  "fully_responded",
  "partially_approved",
  "fully_approved",
  "closed",
] as const

export type MIResponsePMStatus = "pending" | "approved" | "rejected"

// Sales-safe view of a vendor response, embedded under each MI item. Backend
// strips vendor / cost / margin at the schema layer (see
// `MIResponseSalesView`); the FE matches that — never tries to render
// fields it shouldn't see.
export interface MIResponseSalesViewWire {
  id: string
  enquiry_item_id: string
  sell_price: number | null
  available_date: string | null    // ISO "YYYY-MM-DD"
  pm_status: MIResponsePMStatus
}

export interface MaterialInquiryItemWire {
  id: string
  enquiry_id: string
  item_name: string
  // Catalog link. NULL when the line is freeform (sales typed everything
  // by hand). When set, points to a `part_variants.id` — matches the
  // backend `MaterialInquiryItemResponse.variant_id` field.
  variant_id: string | null
  category_id: string | null
  description: string | null
  qty_requested: number
  client_budget_per_unit: number | null
  client_timeline: string | null
  // PM-finalised unit selling price for this line. NULL until a Product
  // Manager sets it. Mirrors backend MaterialInquiryItemResponse.unit_selling_price.
  unit_selling_price: number | null
  created_at: string
  updated_at: string
  // Sales-safe response embeds. Empty array until procurement responds + PM
  // approves (MI-3 / MI-4 lifecycle).
  responses: MIResponseSalesViewWire[]
  // Qty-weighted average sell price across approved responses. NULL until
  // the first approval lands.
  blended_sell_price: number | null
}

export interface MaterialInquiryWire {
  id: string
  enquiry_number: string
  lead_id: string | null
  deal_id: string | null
  description: string | null
  client_budget: number | null
  client_timeline: string | null
  status: MaterialInquiryStatus
  assigned_to_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  items: MaterialInquiryItemWire[]
}

// Slim row shape returned by the list endpoint — no items, no client_timeline,
// no notes (those load lazily on the detail GET).
export interface MaterialInquiryListItemWire {
  id: string
  enquiry_number: string
  lead_id: string | null
  deal_id: string | null
  description: string | null
  status: MaterialInquiryStatus
  client_budget: number | null
  assigned_to_id: string | null
  created_by: string
  // 2026-05-27 enrichment — backend resolves names server-side via
  // batched lookups (no N+1). `created_by_user` carries `{id, name}`;
  // `categories` is the union of all item-level category refs on this
  // MI; `items_count` is the live count of non-deleted items.
  created_by_user: CrmIdNameRef | null
  categories: CrmIdNameRef[]
  items_count: number
  created_at: string
  updated_at: string
}

export interface MaterialInquiriesListResponse {
  items: MaterialInquiryListItemWire[]
  total: number
  page: number
  page_size: number
}

export type MaterialInquirySortField =
  | "enquiry_number"
  | "status"
  | "created_at"
  | "updated_at"
  | "-enquiry_number"
  | "-status"
  | "-created_at"
  | "-updated_at"

export interface FetchMaterialInquiriesParams {
  page?: number
  page_size?: number
  search?: string
  status?: MaterialInquiryStatus
  lead_id?: string
  deal_id?: string
  created_by?: string
  /** Created-date range (IST calendar days, inclusive). `YYYY-MM-DD`. */
  date_from?: string
  date_to?: string
  sort?: MaterialInquirySortField
}

// Item create / update — `extra='forbid'` on the backend, so omit fields
// rather than send `null` for "not used", except for nullable text fields
// where `null` is the accepted clear value.
export interface MaterialInquiryItemCreatePayload {
  item_name: string
  // Optional catalog link. When the user picks a part from the part-number
  // combobox we send the variant id so procurement can join back to the
  // canonical catalog row; freeform lines omit this entirely.
  variant_id?: string
  category_id?: string
  description?: string | null
  qty_requested: number
  client_budget_per_unit?: number
  client_timeline?: string
}

export type MaterialInquiryItemUpdatePayload = Partial<MaterialInquiryItemCreatePayload>

export interface MaterialInquiryCreatePayload {
  lead_id?: string
  deal_id?: string
  description?: string | null
  client_budget?: number
  client_timeline?: string
  assigned_to_id?: string
  notes?: string | null
  // Inline items at create time — recommended UX. Cap matches backend
  // `_ITEMS_LIST_MAX = 50`.
  items?: MaterialInquiryItemCreatePayload[]
}

// PATCH /material-inquiries/{id}. All fields optional. `status` is NOT
// mutable here — use the dedicated /submit and /close endpoints. `items`
// not accepted on PATCH either; use the per-item endpoints.
export type MaterialInquiryUpdatePayload = Omit<MaterialInquiryCreatePayload, "items">

// ── Wrappers ─────────────────────────────────────────────────────

export async function fetchMaterialInquiries(
  params: FetchMaterialInquiriesParams = {},
): Promise<MaterialInquiriesListResponse> {
  return apiClient.get<MaterialInquiriesListResponse>(endpoints.crm.materialInquiries, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
      status: params.status,
      lead_id: params.lead_id,
      deal_id: params.deal_id,
      created_by: params.created_by,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      sort: params.sort,
    },
  })
}

export async function fetchMaterialInquiry(id: string): Promise<MaterialInquiryWire> {
  return apiClient.get<MaterialInquiryWire>(endpoints.crm.materialInquiry(id))
}

export async function createMaterialInquiry(
  body: MaterialInquiryCreatePayload,
): Promise<MaterialInquiryWire> {
  return apiClient.post<MaterialInquiryWire>(endpoints.crm.materialInquiries, body)
}

export async function updateMaterialInquiry(
  id: string,
  body: MaterialInquiryUpdatePayload,
): Promise<MaterialInquiryWire> {
  return apiClient.patch<MaterialInquiryWire>(endpoints.crm.materialInquiry(id), body)
}

export async function deleteMaterialInquiry(id: string): Promise<void> {
  await apiClient.delete<null>(endpoints.crm.materialInquiry(id))
}

// State transitions — backend validates preconditions (≥ 1 item + lead/deal
// for submit; idempotent close).
export async function submitMaterialInquiry(id: string): Promise<MaterialInquiryWire> {
  return apiClient.post<MaterialInquiryWire>(endpoints.crm.materialInquirySubmit(id))
}

export async function closeMaterialInquiry(id: string): Promise<MaterialInquiryWire> {
  return apiClient.post<MaterialInquiryWire>(endpoints.crm.materialInquiryClose(id))
}

// Item endpoints — Draft-only on the backend. The form gates these on
// `status === 'draft'` so users see a friendly message instead of a 4xx.
export async function addMaterialInquiryItem(
  miId: string,
  body: MaterialInquiryItemCreatePayload,
): Promise<MaterialInquiryItemWire> {
  return apiClient.post<MaterialInquiryItemWire>(
    endpoints.crm.materialInquiryItems(miId),
    body,
  )
}

export async function updateMaterialInquiryItem(
  miId: string,
  itemId: string,
  body: MaterialInquiryItemUpdatePayload,
): Promise<MaterialInquiryItemWire> {
  return apiClient.patch<MaterialInquiryItemWire>(
    endpoints.crm.materialInquiryItem(miId, itemId),
    body,
  )
}

export async function deleteMaterialInquiryItem(
  miId: string,
  itemId: string,
): Promise<void> {
  await apiClient.delete<null>(endpoints.crm.materialInquiryItem(miId, itemId))
}
