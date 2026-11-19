import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import type { PageParams, PageResponse } from "@/shared/api/pagination"

// ─── Verticals: Brands + hydrate ──────────────────────────────────────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/verticals/schemas/`.
// The quote builder consumes these to (a) populate the "Business Vertical"
// dropdown (brands) and (b) pre-fill the Terms & Conditions clause list for
// the picked brand (hydrate). See comprint-erp-docs/modules/crm/quote/CLAUSES_STATIC.md / comprint-erp-docs/modules/crm/quote/QUOTE_VERTICALS_PLAN.md.

// One brand ("vertical") — mirrors `BrandResponse`. Thin identity model;
// document copy lives on the brand template, surfaced via `hydrate`.
export interface BrandWire {
  id: string
  code: string
  name: string
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Paginated brand list — mirrors `PaginatedResponse[BrandResponse]` (the standard page).
export type BrandsListResponse = PageResponse<BrandWire>

export interface FetchBrandsParams extends PageParams {
  search?: string
  is_active?: boolean
}

// One default clause row returned by hydrate — mirrors
// `BrandTemplateRowResponse`. `body_html` still carries literal
// `{{quote.*}}`/`{{account.*}}`/`{{contact.*}}` tokens (resolved backend-side
// on quote save); `{{brand.*}}`/`{{user.*}}` are already substituted.
export interface HydrateRowWire {
  id: string
  sequence: number
  heading: string
  body_html: string
  is_fixed: boolean
  // Whether sales may edit this clause's heading/body. Optional until the
  // backend ships it — treated as `true` (editable) when absent.
  is_editable?: boolean
  // Whether sales may delete this clause. Optional until the backend ships it —
  // treated as `true` (deletable) when absent.
  is_deletable?: boolean
}

// Pre-fill payload — mirrors `HydrateResponse`. Only `rows` feeds the clause
// builder; `description_html` / `stats` drive the PDF cover (out of scope here).
export interface HydrateResponse {
  brand: { id: string; code: string; name: string }
  document_type: string
  description_html: string | null
  stats: Array<{ number: string; suffix: string; description: string }>
  rows: HydrateRowWire[]
}

export type VerticalDocumentType = "sales_quote" | "sales_order" | "purchase_order"

// GET /verticals/brands — paginated (page / page_size).
export async function fetchBrands(
  params: FetchBrandsParams = {},
): Promise<BrandsListResponse> {
  return apiClient.get<BrandsListResponse>(endpoints.verticals.brands, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      // Backend has no free-text search on brands yet; `search` is forwarded
      // for forward-compat and ignored server-side today. The list is tiny
      // (a handful of brands) so the dropdown filters client-side regardless.
      search: params.search?.trim() || undefined,
      is_active: params.is_active,
    },
  })
}

export async function fetchBrandById(id: string): Promise<BrandWire> {
  return apiClient.get<BrandWire>(endpoints.verticals.brand(id))
}

// GET /verticals/hydrate?brand_code=&document_type= — the default clause
// template for a brand. Used on vertical select and on "Reset to default".
export async function fetchHydrate(
  brandCode: string,
  documentType: VerticalDocumentType = "sales_quote",
): Promise<HydrateResponse> {
  return apiClient.get<HydrateResponse>(endpoints.verticals.hydrate, {
    params: { brand_code: brandCode, document_type: documentType },
  })
}
