import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import {
  fetchAllPages,
  MAX_PAGE_SIZE,
  type PageResponse,
} from "@shared/api/pagination";
import { endpoints } from "@shared/api/endpoints";

// ─── Domain types ────────────────────────────────────────────────────────────

// Inline-computed rollups from the backend response (per spec.md §3.8 hybrid
// counts). Not yet in schema.gen.ts — extend until
// `pnpm api:gen` is rerun against the live backend.
/** Unit counts per stock status.
 *
 * MUST mirror the backend `StockByStatus`. Carrying only a subset is not a
 * cosmetic gap: consumers sum these fields, so a missing bucket silently
 * under-reports. Both sides once carried only the first five, which hid
 * every dispatched / issued / returned unit — a variant showed "Total 11"
 * whose buckets summed to 10.
 *
 * `available` means AVAILABLE FOR DISPATCH: out of the ops pipeline and
 * racked. Units mid-inspection/repair/QC land in `in_operations`.
 */
export interface StockByStatusRollup {
  // Live, settled inventory.
  available?: StockStatusCount;
  in_operations?: StockStatusCount;
  unracked?: StockStatusCount;
  reserved?: StockStatusCount;
  damaged?: StockStatusCount;
  // In flight or out of the building.
  in_transit?: StockStatusCount;
  dispatched?: StockStatusCount;
  issued?: StockStatusCount;
  pending_inspection?: StockStatusCount;
  // Consumed into something else, or gone.
  consumed?: StockStatusCount;
  disposed?: StockStatusCount;
  dismantled?: StockStatusCount;
  installed?: StockStatusCount;
  // Vendor-return lane.
  pending_return?: StockStatusCount;
  returned_to_vendor?: StockStatusCount;
}

export interface StockStatusCount {
  // Matches the generated schema: the backend emits an int here, not a
  // Decimal-as-string. (This type previously declared `string`, which no
  // caller noticed because nothing read qty.)
  qty: number;
  units: number;
}

/** Total units across EVERY bucket.
 *
 * Sums the object's own keys rather than a hardcoded list, so a bucket added
 * to the backend is counted here the day it appears instead of being
 * silently dropped until someone notices the totals not adding up.
 */
export function sumStockByStatus(
  rollup: StockByStatusRollup | null | undefined,
): number {
  if (!rollup) return 0;
  return Object.values(rollup).reduce(
    (total, bucket) => total + (bucket?.units ?? 0),
    0,
  );
}

// Live backend dropped `is_tracking` from categories — it now
// lives on parts. schema.gen.ts is stale; treat it as a read-only legacy
// shape and override the fields that actually ride the wire.
export interface CategoryRollups {
  // Linked specification attributes, in display order. Filled on the
  // detail / create / update responses; list rows carry an empty array.
  specification_attributes?: SpecificationAttributeShort[];
  part_count?: number;
  subcategory_count?: number;
  variant_count?: number;
  available_stock_qty?: string | number;
  tracked_parts_count?: number;
  non_tracked_parts_count?: number;
  stock_by_status?: StockByStatusRollup | null;
}

// `is_bom_eligible` was added to the backend Category schema after the
// last `pnpm api:gen` run; schema.gen.ts is stale until the next regen.
// Patched in locally on the Response / Create / Update shapes so the
// form + the BOM eligibility check (`LineItemBomSection`) have a typed
// field to read. Categories flagged `true` expose the BOM child-component
// editor on line items (Quotes / Sales Orders / Closed Won). Optional
// here so the type is forgiving of older backend responses during
// deployments; remove the override once the generated file catches up.
export type Category = Omit<
  components["schemas"]["CategoryResponse"],
  "is_tracking" | "spec_template"
> &
  CategoryRollups & {
    is_bom_eligible?: boolean;
  };

// CategoryCreate: `code` is optional (auto-derived from name when omitted),
// `is_tracking` no longer exists. Override the schema.gen.ts shape so the
// payload survives Pydantic's `extra='forbid'`.
export type CategoryCreate = Omit<
  components["schemas"]["CategoryCreate"],
  "code" | "is_tracking" | "spec_template"
> & {
  code?: string | null;
  // Replaces the category's attribute set, in this order.
  specification_attribute_ids?: string[];
  is_bom_eligible?: boolean;
};

export type CategoryUpdate = Omit<
  components["schemas"]["CategoryUpdate"],
  "is_tracking" | "spec_template"
> & {
  // Omit to leave the set untouched; [] clears it.
  specification_attribute_ids?: string[];
  is_bom_eligible?: boolean | null;
};
// One row of OEMResponse.parts_by_category — backend's per-OEM x category
// breakdown returned on the detail GET.
export interface OEMCategoryRollup {
  category_id: string;
  name: string;
  code: string;
  parts_count: number;
}

export interface OEMRollups {
  parts_count?: number;
  categories_count?: number;
  available_stock_qty?: string | number;
  stock_by_status?: StockByStatusRollup | null;
  parts_by_category?: OEMCategoryRollup[];
  notes?: string | null;
}

export type OEM = components["schemas"]["OEMResponse"] & OEMRollups;
// Live backend made `code` optional (auto-derived from name) and added
// `notes`. schema.gen.ts is stale — override.
export type OEMCreate = Omit<components["schemas"]["OEMCreate"], "code"> & {
  code?: string | null;
  notes?: string | null;
};
export type OEMUpdate = components["schemas"]["OEMUpdate"] & {
  notes?: string | null;
};

// schema.gen.ts is stale — backend has renamed `unit` → `uom` and
// `specifications` → `specs`, plus added `is_tracking` and
// `default_variant_condition` (create-only). Override locally so the
// payload + read shape match the live PartCreate / PartResponse contract
// and Pydantic's `extra='forbid'` doesn't reject the request.
// Detail-only PM identity attached to PartResponse / PartVariantResponse via
// `responsible_pms` (current-window PM scope).
export interface ResponsiblePMSummary {
  user_id: string;
  name: string;
  email: string;
}

export interface PartRollups {
  // Live backend fields not in schema.gen.ts.
  uom?: string;
  specs?: Record<string, string> | null;
  is_tracking?: boolean;
  // Inline rollups (spec §3.8).
  category_name?: string | null;
  oem_name?: string | null;
  variant_count?: number;
  available_stock_qty?: string | number;
  stock_by_status?: StockByStatusRollup | null;
  // Detail GET only.
  responsible_pms?: ResponsiblePMSummary[];
  // Embedded on list GET when `?include_variants=true`. When search/filter
  // hit only specific variants, only those matching variants are embedded;
  // when a part itself matches, every variant under it is embedded.
  variants?: PartVariant[];
}

export type Part = Omit<components["schemas"]["PartResponse"], "unit"> &
  PartRollups;

export type PartCreate = Omit<
  components["schemas"]["PartCreate"],
  "unit" | "uom" | "category_id" | "oem_id" | "default_variant_condition"
> & {
  // Not collected by the form; the backend defaults it ("nos").
  uom?: string;
  specs?: Record<string, string> | null;
  // category and oem are NOT NULL on the live backend; tighten the
  // type so consumers can't accidentally send null.
  category_id: string;
  oem_id: string;
  is_tracking?: boolean;
  default_variant_condition?: "new" | "refurbished" | "new_pull";
};

export type PartUpdate = Omit<components["schemas"]["PartUpdate"], "unit"> & {
  uom?: string | null;
  specs?: Record<string, string> | null;
  is_tracking?: boolean | null;
};
// schema.gen.ts is stale — it lacks `sku_code`, `aliases`, `is_default`,
// `available_qty`, the live-backend `condition` literal, and renames
// `specifications` → `specs`. Override the response shape locally until
// `pnpm api:gen` is rerun against the live backend.
export type PartVariant = Omit<
  components["schemas"]["PartVariantResponse"],
  "condition"
> & {
  specs?: Record<string, string> | null;
  sku_code?: string | null;
  aliases?: string[] | null;
  is_default?: boolean;
  available_qty?: string | number;
  condition: "new" | "refurbished" | "new_pull";
  // GET /ims/variants/{id} embeds the current Reference BOM (or null when
  // none) under `bom`. Re-declared here because schema.gen.ts is stale and
  // doesn't carry the BOM enrichment yet; remove once `pnpm api:gen` reruns.
  bom?: Bom | null;
};
// `avg_purchase_price`, `source`, and the old `new_pool` condition literal
// were dropped/renamed; schema.gen.ts is stale until
// `pnpm api:gen` is rerun. Override the create payload to match the live
// backend contract:
//   sku_code, name, description, condition (new|refurbished|new_pull),
//   aliases, specs, currency, sell_price (optional, > 0), hsn_code_id,
//   is_active.
// Local override — relax sku_code/currency/is_active back to optional. The
// backend's PartVariantCreate marks them required (sku_code) or has defaults
// (currency=INR, is_active=true), but the FE dialogs intentionally let the
// user leave them blank and the backend auto-derives. Keeping the FE type
// permissive avoids redundant placeholder values on the wire.
export type PartVariantCreate = Omit<
  components["schemas"]["PartVariantCreate"],
  "sku_code" | "condition" | "sell_price" | "currency" | "is_active"
> & {
  specs?: Record<string, string> | null;
  sku_code?: string | null;
  aliases?: string[] | null;
  condition: "new" | "refurbished" | "new_pull";
  currency?: string;
  sell_price?: number | string | null;
  is_active?: boolean;
};
export type PartVariantUpdate = components["schemas"]["PartVariantUpdate"] & {
  specs?: Record<string, string> | null;
};
export type PriceHistory = components["schemas"]["PriceHistoryResponse"];
export type UpdatePriceRequest = components["schemas"]["UpdatePriceRequest"];

export type PMAssignment = components["schemas"]["PMAssignmentResponse"];
// schema.gen.ts is stale on this endpoint:
//   • condition has the typo `new_pool` (backend uses `new_pull`)
//   • effective_from / effective_until were added server-side and
//     aren't in the generated schema yet
//   • category_id is `string | null` on the live backend (null = global PM,
//     permissions span every category) but the generated type is `string`
// Override locally until `pnpm api:gen` is rerun. Dates are ISO yyyy-mm-dd
// strings (Pydantic's `date` serializes that way over JSON).
export type PMAssignmentCreate = Omit<
  components["schemas"]["PMAssignmentCreate"],
  "condition" | "category_id"
> & {
  category_id: string | null;
  condition?: "new" | "refurbished" | "new_pull" | null;
  effective_from?: string | null;
  effective_until?: string | null;
  notes?: string | null;
};

/** Replace payload — identical shape to Create. Backend's
 *  `POST /pm-assignments/{id}/replace` atomically revokes the old row and
 *  creates a new one with this full body (no field inheritance). */
export type PMAssignmentReplace = PMAssignmentCreate;

/** Five-value status filter that drives the list endpoint.
 *  - `all`       — everything except revoked rows (default).
 *  - `active`    — not revoked AND today inside the effective window.
 *  - `scheduled` — effective_from > today.
 *  - `expired`   — effective_until < today.
 *  - `revoked`   — soft-deleted rows only (admin/history).
 */
export type PMAssignmentStatusFilter =
  "all" | "active" | "scheduled" | "expired" | "revoked";

export interface UserListItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  full_name: string;
  is_active: boolean;
  roles: string[];
}

type PaginatedUsersResponse = PageResponse<{
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  is_active: boolean;
  roles: string[];
}>;

export type HSNCode = components["schemas"]["HSNCodeResponse"];
export type HSNCodeCreate = components["schemas"]["HSNCodeCreate"];
export type HSNCodeUpdate = components["schemas"]["HSNCodeUpdate"];

export type StockItem = components["schemas"]["StockItemResponse"];
export type StockMovement = components["schemas"]["StockMovementResponse"];

// Denormalized list row from `GET /ims/stock-items` (StockItemListRow on the
// backend). Not yet in schema.gen.ts — declare locally until `pnpm api:gen`
// is rerun.
export interface StockItemListRow {
  id: string;
  serial_number: string;
  // The maker's serial (Dell / HP …); null when not captured.
  manufacturer_serial?: string | null;
  status: string;
  // WMS ops-pipeline stage (null = outside the pipeline). Decoupled from
  // `status`: a just-inwarded unit is `in_operations` + `pending_inspection`.
  workflow_status: string | null;
  // Set ONLY while workflow_status='at_external_vendor': the stage the device
  // was actually in before a vendor job took custody. What physically goes to
  // a vendor is usually a component, not the unit, so the badge shows this as
  // the primary stage — "In Repair · At Vendor" — rather than a bare custody
  // flag. Optional: older deploys omit it.
  vendor_prior_workflow_status?: string | null;
  // Sections the unit is currently out to, e.g. ["Display Repair"].
  // Section NAME, not device_status_label — the badge prefix already says
  // "In Repair ·", so the label form would double the "In".
  vendor_section_names?: string[] | null;
  // Optional — older list-row deploys may omit `quantity`. Falls back to "—".
  quantity?: string | number | null;
  warehouse_id: string | null;
  rack: string | null;
  bin: string | null;
  // Resolved display labels for the current location: warehouse + the rack /
  // bin / pallet (`warehouse_location_id` → name). `rack`/`bin` above are legacy.
  warehouse_name: string | null;
  location_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  part_variant_id: string;
  variant_name: string;
  variant_condition: string;
  // The variant's own SKU (part_variants.sku_code) — the real per-variant
  // identifier for the inventory "SKU" column, distinct from the part-level
  // `part_number`.
  sku_code: string;
  part_id: string;
  part_number: string;
  part_name: string;
  part_is_tracking: boolean;
  category_id: string;
  category_code: string;
  category_name: string;
  oem_id: string;
  oem_code: string;
  oem_name: string;
}

export type StockItemsPage = PageResponse<StockItemListRow>;

// ─── Stats overview ──────────────────────────────────────────────────────────
// Mirrors backend `app/modules/ims/schemas/stats.py:StatsOverviewResponse`.
// Inlined here until `pnpm api:gen` is rerun against the live backend.
export interface StockStatusBreakdown {
  qty: string;
  units: number;
}

export interface StatsOverviewResponse {
  totals: {
    categories: number;
    oems: number;
    parts: number;
    variants: number;
    stock_items: number;
  };
  stock_by_status: {
    available: StockStatusBreakdown;
    reserved: StockStatusBreakdown;
    consumed: StockStatusBreakdown;
    damaged: StockStatusBreakdown;
    disposed: StockStatusBreakdown;
  };
  zero_stock_variants: number;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoriesPage = PageResponse<Category>;

// Compact category row for picker / dropdown / filter callers. Mirrors
// the backend's `shape=short` projection on GET /api/v1/ims/categories,
// which drops rollup subqueries (part_count, subcategory_count, stock,
// description, specification attributes, etc.) to cut payload + DB cost.
export interface CategoryShort {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
}

export type CategoriesShortPage = PageResponse<CategoryShort>;

export async function fetchCategoriesPage(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  /** Backend allow-list: name, display_order, created_at, is_active. Prefix
   *  with `-` for descending. Anything else returns 422. */
  sort?: string;
  /** When `"short"`, the backend returns only id / name / parent_id /
   *  parent_name per row — skips every rollup subquery. Use this from
   *  any filter dropdown or name-lookup caller that doesn't display
   *  counts. */
  shape?: "short";
}): Promise<CategoriesPage> {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.page_size != null) qs.set("page_size", String(params.page_size));
  if (params?.search) qs.set("search", params.search);
  if (params?.is_active != null) qs.set("is_active", String(params.is_active));
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.shape) qs.set("shape", params.shape);
  const query = qs.toString();
  return apiClient.get<CategoriesPage>(
    `${endpoints.ims.categories}${query ? `?${query}` : ""}`,
  );
}

// Page-shaped fetcher dedicated to the `shape=short` response. Returns
// the slimmer `CategoryShort` row so TypeScript blocks any caller from
// silently reading rollup fields the wire payload doesn't carry.
export async function fetchCategoriesShortPage(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  sort?: string;
}): Promise<CategoriesShortPage> {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.page_size != null) qs.set("page_size", String(params.page_size));
  if (params?.search) qs.set("search", params.search);
  if (params?.is_active != null) qs.set("is_active", String(params.is_active));
  if (params?.sort) qs.set("sort", params.sort);
  qs.set("shape", "short");
  return apiClient.get<CategoriesShortPage>(
    `${endpoints.ims.categories}?${qs.toString()}`,
  );
}

/** Every child of `parent_id` (or every category when omitted). */
export async function fetchCategories(params?: {
  parent_id?: string;
}): Promise<Category[]> {
  return fetchAllPages((page) => {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(MAX_PAGE_SIZE),
    });
    if (params?.parent_id) qs.set("parent_id", params.parent_id);
    return apiClient.get<CategoriesPage>(
      `${endpoints.ims.categories}?${qs.toString()}`,
    );
  });
}

/**
 * Fetch every category in one logical call by chaining through all pages.
 * Backend caps `page_size` at 100, so when the catalog grows past 100 a
 * single fetch would silently truncate the tree. Use this for the tree
 * view where we always need the full set; switch to `useCategoriesPage`
 * for any UI that paginates explicitly.
 */
export async function fetchAllCategories(
  params: { is_active?: boolean } = {},
): Promise<Category[]> {
  return fetchAllPages((page) =>
    fetchCategoriesPage({
      page,
      page_size: MAX_PAGE_SIZE,
      is_active: params.is_active,
    }),
  );
}

// Filter / picker variant — same chained pagination as `fetchAllCategories`
// but with `?shape=short` so every page skips the rollup subqueries.
// Returns `CategoryShort[]`, so TypeScript blocks any caller from
// silently reading rollup fields the wire doesn't carry.
export async function fetchAllCategoriesShort(
  params: { is_active?: boolean } = {},
): Promise<CategoryShort[]> {
  return fetchAllPages((page) =>
    fetchCategoriesShortPage({
      page,
      page_size: MAX_PAGE_SIZE,
      is_active: params.is_active,
    }),
  );
}

export async function fetchCategory(id: string): Promise<Category> {
  return apiClient.get<Category>(endpoints.ims.category(id));
}

export async function createCategory(body: CategoryCreate): Promise<Category> {
  return apiClient.post<Category>(endpoints.ims.categories, body);
}

export async function updateCategory(
  id: string,
  body: CategoryUpdate,
): Promise<Category> {
  return apiClient.patch<Category>(endpoints.ims.category(id), body);
}

export async function deleteCategory(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.ims.category(id));
}

// ─── OEMs ─────────────────────────────────────────────────────────────────────

export type OEMPage = PageResponse<OEM>;

// Page-shaped fetcher (per Coding-guideline §16.11) over the standard page.
export async function fetchOEMsPage(params: {
  page?: number;
  page_size?: number;
  tier?: string;
  search?: string;
  is_active?: boolean;
  // Sort field; prefix with `-` for descending. Backend allowlist:
  // name, code, tier, country_origin, created_at. Default: name.
  sort?: string;
}): Promise<OEMPage> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  if (params.tier) qs.set("tier", params.tier);
  if (params.search) qs.set("search", params.search);
  if (params.is_active != null) qs.set("is_active", String(params.is_active));
  if (params.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  return apiClient.get<OEMPage>(
    `${endpoints.ims.oems}${query ? `?${query}` : ""}`,
  );
}

export async function fetchOEM(id: string): Promise<OEM> {
  return apiClient.get<OEM>(endpoints.ims.oem(id));
}

// ── Product-manager picker source (distinct PMs, server-searched) ──────────
export type ProductManagerOption =
  components["schemas"]["ProductManagerOption"];

export type ProductManagersPage = PageResponse<ProductManagerOption>;

// Distinct PMs for the picker — GET /ims/pm-assignments/product-managers.
// Server-side search + pagination, so the dropdown is never capped at a fixed
// client-side fetch (§16.11).
export async function fetchProductManagers(params: {
  page?: number;
  page_size?: number;
  search?: string;
}): Promise<ProductManagersPage> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  if (params.search) qs.set("search", params.search);
  const query = qs.toString();
  return apiClient.get<ProductManagersPage>(
    `${endpoints.ims.pmAssignments}/product-managers${query ? `?${query}` : ""}`,
  );
}

export async function createOEM(body: OEMCreate): Promise<OEM> {
  return apiClient.post<OEM>(endpoints.ims.oems, body);
}

export async function updateOEM(id: string, body: OEMUpdate): Promise<OEM> {
  return apiClient.patch<OEM>(endpoints.ims.oem(id), body);
}

export async function deleteOEM(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.ims.oem(id));
}

// ─── Parts ────────────────────────────────────────────────────────────────────

export type PartsPage = PageResponse<Part>;

// `?include_variants=true` embeds a `variants[]` array on each Part row and
// unlocks the four variant-scoped filters below. The backend returns 422 if
// any of those filters are passed without the flag, so we only stamp them
// into the query string when include_variants is true.
//
// Pagination remains by-part regardless: `total` is the part count, not the
// variant count. When a search/filter matches only specific variants, only
// those matching variants are embedded; when the part itself matches, every
// variant under it is embedded.
export interface FetchPartsParams {
  search?: string;
  category_id?: string;
  oem_id?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  // Sort field; prefix with `-` for descending. Backend allowlist:
  // name, part_number, created_at, updated_at, available_stock_qty,
  // is_active. Out-of-list values get 422'd by the API.
  sort?: string;
  include_variants?: boolean;
  condition?: "new" | "refurbished" | "new_pull";
  variant_is_active?: boolean;
  is_default?: boolean;
  has_stock?: boolean;
}

export async function fetchPartsPage(
  params?: FetchPartsParams,
): Promise<PartsPage> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.oem_id) qs.set("oem_id", params.oem_id);
  if (params?.is_active != null) qs.set("is_active", String(params.is_active));
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.page_size != null) qs.set("page_size", String(params.page_size));
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.include_variants) {
    qs.set("include_variants", "true");
    // Variant-scoped filters are only valid alongside the flag — gate them
    // here so a forgotten flag never blows up the request with a 422.
    if (params.condition) qs.set("condition", params.condition);
    if (params.variant_is_active != null)
      qs.set("variant_is_active", String(params.variant_is_active));
    if (params.is_default != null)
      qs.set("is_default", String(params.is_default));
    if (params.has_stock != null) qs.set("has_stock", String(params.has_stock));
  }
  const query = qs.toString();
  return apiClient.get<PartsPage>(
    `${endpoints.ims.parts}${query ? `?${query}` : ""}`,
  );
}

export type FlatPartRow = components["schemas"]["FlatPartRow"];

export type PartsFlatPage = PageResponse<FlatPartRow>;

// Flat-rows mode (`GET /ims/parts?flatten=true`): parts AND their variants
// come back as a single ROW-paginated stream — one `parent` row per part,
// then a `variant` row per matching variant — with a ROW-based `total`. The
// shared pager then lines up exactly with the rendered rows (no client-side
// flatten + cap). `flatten` implies variant inclusion, so the four variant
// filters are always valid here and we never pass `include_variants`.
export async function fetchPartsFlatPage(
  params?: FetchPartsParams,
): Promise<PartsFlatPage> {
  const qs = new URLSearchParams();
  qs.set("flatten", "true");
  if (params?.search) qs.set("search", params.search);
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.oem_id) qs.set("oem_id", params.oem_id);
  if (params?.is_active != null) qs.set("is_active", String(params.is_active));
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.page_size != null) qs.set("page_size", String(params.page_size));
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.condition) qs.set("condition", params.condition);
  if (params?.variant_is_active != null)
    qs.set("variant_is_active", String(params.variant_is_active));
  if (params?.is_default != null)
    qs.set("is_default", String(params.is_default));
  if (params?.has_stock != null) qs.set("has_stock", String(params.has_stock));
  return apiClient.get<PartsFlatPage>(
    `${endpoints.ims.parts}?${qs.toString()}`,
  );
}

export async function fetchPart(id: string): Promise<Part> {
  return apiClient.get<Part>(endpoints.ims.part(id));
}

export async function createPart(body: PartCreate): Promise<Part> {
  return apiClient.post<Part>(endpoints.ims.parts, body);
}

export async function updatePart(id: string, body: PartUpdate): Promise<Part> {
  return apiClient.patch<Part>(endpoints.ims.part(id), body);
}

export async function deletePart(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.ims.part(id));
}

// ─── Part Variants ────────────────────────────────────────────────────────────

export type VariantsPage = PageResponse<PartVariant>;

export async function fetchVariantsPage(
  partId: string,
  params?: { page?: number; page_size?: number },
): Promise<VariantsPage> {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.page_size != null) qs.set("page_size", String(params.page_size));
  const query = qs.toString();
  return apiClient.get<VariantsPage>(
    `${endpoints.ims.partVariants(partId)}${query ? `?${query}` : ""}`,
  );
}

/** Fetch one variant. Pass `includeBom: true` to ask the backend to embed
 *  the variant's Reference BOM (or `null`) under `bom` — the endpoint's
 *  comma-separated `?include=` list currently only knows the `bom` token,
 *  so we hardcode the value. When omitted, the `bom` field is absent
 *  from the response (back-compat — see endpoints.py:936-947). */
export async function fetchVariant(
  variantId: string,
  options?: { includeBom?: boolean },
): Promise<PartVariant> {
  const qs = options?.includeBom ? "?include=bom" : "";
  return apiClient.get<PartVariant>(`${endpoints.ims.variant(variantId)}${qs}`);
}

export async function createVariant(
  partId: string,
  body: PartVariantCreate,
): Promise<PartVariant> {
  return apiClient.post<PartVariant>(endpoints.ims.partVariants(partId), body);
}

export async function updateVariant(
  variantId: string,
  body: PartVariantUpdate,
): Promise<PartVariant> {
  return apiClient.patch<PartVariant>(endpoints.ims.variant(variantId), body);
}

export async function deleteVariant(variantId: string): Promise<void> {
  return apiClient.delete<void>(endpoints.ims.variant(variantId));
}

// ─── Reference BOM (PUT/DELETE /api/v1/ims/part-variants/{id}/bom) ───────────
//
// Two endpoints + the GET-variant embed make up the BOM surface:
//   PUT    /ims/part-variants/{variant_id}/bom — declarative replace.
//          Diff semantics: items with a known `id` preserve / update in
//          place, items without an `id` insert (server mints a UUIDv7),
//          items missing from the payload soft-delete. 201 on first
//          create, 200 on update. Gated on `categories.is_bom_eligible`
//          of the owner part's category — 422 `CATEGORY_NOT_BOM_ELIGIBLE`
//          otherwise.
//   DELETE /ims/part-variants/{variant_id}/bom — soft-delete header +
//          cascade items. 404 `BOM_NOT_FOUND` when there's no live BOM
//          (so the FE can suppress the toast on a double-clicked Delete).
//
// Read path: the variant detail GET embeds the current BOM under
// `data.bom` (null when none). No separate fetch needed for the read.
//
// Schemas mirror `app/modules/ims/schemas/bom.py` exactly. Inline because
// schema.gen.ts is stale w.r.t. the BOM module.

export interface BomItemComponentVariant {
  id: string;
  sku_code: string | null;
  name: string;
  condition: string;
  part_id: string;
  part_name: string;
}

export interface BomItem {
  id: string;
  component_variant_id: string;
  component_variant: BomItemComponentVariant;
  quantity: number;
  position: string | null;
  notes: string | null;
}

export interface Bom {
  id: string;
  part_variant_id: string;
  notes: string | null;
  items: BomItem[];
  created_at: string;
  updated_at: string;
}

/** Per-item payload for PUT /part-variants/{variant_id}/bom.
 *
 * `id` semantics:
 *   - omitted → server mints a fresh UUIDv7 (new row).
 *   - present + matches a live row → preserve/update in place.
 *   - present + stale (deleted row) → server silently mints a new id.
 */
export interface BomItemReplace {
  id?: string | null;
  component_variant_id: string;
  quantity: number;
  position?: string | null;
  notes?: string | null;
}

export interface BomReplace {
  notes?: string | null;
  /** Bounded `[1, 100]` server-side. Sending an empty list returns 422;
   *  the DELETE endpoint is the right surface for removing a BOM. */
  items: BomItemReplace[];
}

export async function replaceBom(
  variantId: string,
  body: BomReplace,
): Promise<Bom> {
  return apiClient.put<Bom>(endpoints.ims.variantBom(variantId), body);
}

export async function deleteBom(variantId: string): Promise<void> {
  return apiClient.delete<void>(endpoints.ims.variantBom(variantId));
}

// ─── Cross-part variants list (GET /api/v1/ims/variants) ─────────────────────
// Mirrors `VariantListItem` / `PaginatedResponse[VariantListItem]` in the backend
// (`app/modules/ims/schemas/part.py`). Defined inline because schema.gen.ts is
// stale — replace with `components["schemas"]["VariantListItem"]` after the
// next `pnpm api:gen` run.

export interface VariantListStockSummary {
  available: number;
  // Received but not yet racked — inspection, repair, QC, awaiting-rack.
  // Physically present, not sellable. Rendered as the In-Ops column.
  in_operations: number;
  reserved: number;
  damaged: number;
  /** Fitted inside a parent device (component-tracking D1). Stock we OWN but
   *  cannot sell without pulling it first — and the ONLY signal that a part
   *  whose `available` reads 0 is not actually absent. Deliberately excluded
   *  from `total_units` (spec §5): a component is not independently on-hand,
   *  and counting it would double-count the parent it sits in. */
  installed: number;
  total_units: number;
}

export interface VariantListItem {
  id: string;
  part_id: string;
  oem_name: string;
  oem_id: string;
  parent_category_name: string | null;
  parent_category_id: string | null;
  category_name: string;
  category_id: string;
  // BOM eligibility of the variant's category, denormalised by the backend so
  // pickers don't need a separate GET /ims/categories to resolve it.
  is_bom_eligible: boolean;
  part_name: string;
  // Parent PART's number — the SAME value for every variant of a part, so it
  // can never identify a row on its own. Use `sku_code` for that.
  part_number: string;
  name: string;
  // Operator-facing SKU printed on labels; returned directly on the list row.
  sku_code: string;
  display_title: string;
  aliases: string[] | null;
  // The PARENT PART's aliases. Distinct from `aliases` above, which is the
  // variant's own and is empty on essentially every real row.
  part_aliases: string[] | null;
  condition: string;
  is_active: boolean;
  is_default: boolean;
  // Parent PART's serial-tracking flag — confirmed present on the generated
  // `VariantListItem` schema (schema.gen.ts). Previously missing here, which
  // forced `as`-casts at every WMS Material Issue call site.
  part_is_tracking: boolean;
  // The variant's OWN description — null on essentially every real row.
  description: string | null;
  // The PARENT PART's description, denormalised by the backend. Variant rows
  // fall back to this in the stock-items list, since the Name column shows the
  // part+variant title (`display_title`) and variant descriptions are
  // effectively always empty.
  part_description: string | null;
  currency: string;
  // Decimal serialized as string — preserves INR precision.
  //
  // OPTIONAL because the backend OMITS the key entirely for callers without
  // `ims:price_read` (modules/ims/variant-list-pricing/spec.md §3.4). The
  // column's presence is derived from this being non-null, so do not
  // "tidy" it back to a required field.
  sell_price?: string | null;
  // Whether THIS caller may change THIS variant's price — Layer-2
  // (`ims:price_write`) AND Layer-3 (a `manage` pm_assignment covering the
  // variant's category x oem x condition), both resolved server-side.
  can_edit_price: boolean;
  // Last price change, denormalized from the newest price_history row.
  // Both null when the variant has never been repriced.
  //
  // `previous_price` is redacted alongside `sell_price` — leaking the old
  // value to someone barred from the current one would defeat the gate.
  // `price_changed_at` is not a price and survives redaction.
  previous_price?: string | null;
  price_changed_at?: string | null;
  available_stock_qty: number;
  stock_summary: VariantListStockSummary;
  // Units still inbound on open purchase orders — the Expected column.
  // Outside `stock_summary` because the backend computes it per page from
  // procurement rather than projecting it from the variant's stored denorm.
  expected_qty: number;
  // Units out on rent (On Rent / Hold / Replacement) — the On Rent column.
  // Computed per page from rentals, like `expected_qty`. Optional only so
  // hand-built rows elsewhere need not invent it.
  on_rent_qty?: number;
  hsn_code_id: string | null;
  // GST rate (%) resolved from the linked HSN code; Decimal serialized as
  // string. Null when the variant has no HSN code mapped.
  hsn_gst_rate: string | null;
  created_at: string;
  updated_at: string;
}

export type VariantsListPage = PageResponse<VariantListItem>;

export interface VariantsListParams {
  page?: number;
  page_size?: number;
  search?: string;
  part_id?: string;
  category_id?: string;
  oem_id?: string;
  condition?: "new" | "refurbished" | "new_pull";
  is_active?: boolean;
  is_default?: boolean;
  has_stock?: boolean;
  /** Scope each row's `available_stock_qty` to this warehouse's pickable
   *  on-hand count (Material Issue line-item picker). Omit for the
   *  all-warehouses total. */
  warehouse_id?: string;
  /** Material Issue picker only: with `warehouse_id`, keep just the variants
   *  that have at least one pickable unit in that warehouse (racked, status
   *  "available", out of the ops pipeline). Ignored without `warehouse_id`. */
  available_only?: boolean;
  /** Specification filter — every `{name: value}` pair must match exactly.
   *  Sent as repeated `spec=Name:Value` params. */
  specs?: Record<string, string>;
  sort?: string;
}

export async function fetchVariantsListPage(
  params: VariantsListParams = {},
): Promise<VariantsListPage> {
  const qs = new URLSearchParams();
  // Backend's PaginationParams (app/shared/schemas/common.py) reads `page` /
  // `page_size`; sending `offset` / `limit` was silently ignored and every
  // "next page" request returned the same first 20 rows.
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  // Backend enforces min_length=2 on `search` — drop shorter values rather
  // than 422-ing the request.
  if (params.search && params.search.length >= 2)
    qs.set("search", params.search);
  if (params.part_id) qs.set("part_id", params.part_id);
  if (params.category_id) qs.set("category_id", params.category_id);
  if (params.oem_id) qs.set("oem_id", params.oem_id);
  if (params.condition) qs.set("condition", params.condition);
  if (params.is_active != null) qs.set("is_active", String(params.is_active));
  if (params.is_default != null)
    qs.set("is_default", String(params.is_default));
  if (params.has_stock != null) qs.set("has_stock", String(params.has_stock));
  if (params.warehouse_id) qs.set("warehouse_id", params.warehouse_id);
  if (params.available_only != null)
    qs.set("available_only", String(params.available_only));
  for (const [name, value] of Object.entries(params.specs ?? {})) {
    qs.append("spec", `${name}:${value}`);
  }
  if (params.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  return apiClient.get<VariantsListPage>(
    `${endpoints.ims.variants}${query ? `?${query}` : ""}`,
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export async function updatePrice(
  variantId: string,
  body: UpdatePriceRequest,
): Promise<PriceHistory> {
  // Backend exposes this as PATCH /variants/{id}/price (atomic price update +
  // price_history insert); using POST returns 405.
  return apiClient.patch<PriceHistory>(
    endpoints.ims.variantPrice(variantId),
    body,
  );
}

// /variants/{id}/price-history is a standard page. Unwrap so callers that
// consume PriceHistory[] keep working without changes.
type PriceHistoryPage = PageResponse<PriceHistory>;

/** Price-change trail for one variant, newest first.
 *
 *  Gated on `ims:price_read` — the trail carries `old_price` / `new_price`,
 *  so a caller barred from the current price gets 403 here too. Callers
 *  should treat a 403 as "no panel", not as an error worth surfacing.
 */
export async function fetchPriceHistory(
  variantId: string,
  params?: { page?: number; page_size?: number },
): Promise<PriceHistoryPage> {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.page_size != null) qs.set("page_size", String(params.page_size));
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiClient.get<PriceHistoryPage>(
    `${endpoints.ims.variantPriceHistory(variantId)}${suffix}`,
  );
}

export type { PriceHistoryPage };

// ─── PM Assignments ───────────────────────────────────────────────────────────

/** Bare-list fetcher used by side-panel widgets (Category/Part detail) that
 *  need every row scoped to one entity. Paginated callers should use
 *  `fetchPMAssignmentsPage` instead so the listing page doesn't fetch the
 *  full set up-front. */
export async function fetchPMAssignments(params?: {
  user_id?: string;
  category_id?: string;
}): Promise<PMAssignment[]> {
  const qs = new URLSearchParams();
  if (params?.user_id) qs.set("user_id", params.user_id);
  if (params?.category_id) qs.set("category_id", params.category_id);
  // Only the CURRENTLY-EFFECTIVE PM(s) belong on the detail info cards. The
  // endpoint's default is `status=all`, which INCLUDES revoked / scheduled /
  // expired rows — so a revoked PM (and a revoked parent-category PM inherited
  // by a sub-category) kept showing here. Ask for `active` explicitly.
  qs.set("status", "active");
  // Side-panel use only — fetch up to the backend's page_size cap so a
  // single category's PMs come back in one request.
  qs.set("page_size", "100");
  const query = qs.toString();
  const res = await apiClient.get<PageResponse<PMAssignment>>(
    `${endpoints.ims.pmAssignments}${query ? `?${query}` : ""}`,
  );
  return res.items ?? [];
}

export type PMAssignmentsPage = PageResponse<PMAssignment>;

/** Server-paginated fetcher for the PM Assignments list page. Forwards the
 *  full filter set the backend supports (per `list_pm_assignments` —
 *  user_id / category_id / oem_id / condition / permission_type / status /
 *  sort) so every filter / sort / paginate action becomes a fresh GET.
 *
 *  Phase-1 final-spec lockstep: `active_only` boolean is gone, replaced by
 *  the 5-value `status` filter (default `all` = every non-revoked row).
 */
export async function fetchPMAssignmentsPage(params: {
  page?: number;
  page_size?: number;
  user_id?: string;
  category_id?: string;
  oem_id?: string;
  condition?: string;
  permission_type?: string;
  status?: PMAssignmentStatusFilter;
  sort?: string;
}): Promise<PMAssignmentsPage> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  if (params.user_id) qs.set("user_id", params.user_id);
  if (params.category_id) qs.set("category_id", params.category_id);
  if (params.oem_id) qs.set("oem_id", params.oem_id);
  if (params.condition) qs.set("condition", params.condition);
  if (params.permission_type) qs.set("permission_type", params.permission_type);
  if (params.status) qs.set("status", params.status);
  if (params.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  return apiClient.get<PMAssignmentsPage>(
    `${endpoints.ims.pmAssignments}${query ? `?${query}` : ""}`,
  );
}

/** Fetch one assignment. Pass `include_revoked` to surface soft-deleted rows
 *  (admin/history view). Without it, revoked rows 404 to non-superusers. */
export async function fetchPMAssignment(
  id: string,
  options?: { include_revoked?: boolean },
): Promise<PMAssignment> {
  const qs = new URLSearchParams();
  if (options?.include_revoked) qs.set("include_revoked", "true");
  const query = qs.toString();
  return apiClient.get<PMAssignment>(
    `${endpoints.ims.pmAssignment(id)}${query ? `?${query}` : ""}`,
  );
}

export async function createPMAssignment(
  body: PMAssignmentCreate,
): Promise<PMAssignment> {
  return apiClient.post<PMAssignment>(endpoints.ims.pmAssignments, body);
}

/** Replace = atomic revoke + create-new (the only mutation path; backend has
 *  no PATCH). Body is a full new row with no inheritance from the old. */
export async function replacePMAssignment(
  id: string,
  body: PMAssignmentReplace,
): Promise<PMAssignment> {
  return apiClient.post<PMAssignment>(
    `${endpoints.ims.pmAssignment(id)}/replace`,
    body,
  );
}

/** Revoke = soft-delete. Backend exposes this as POST; the previous
 *  `DELETE /pm-assignments/{id}` shape no longer exists. */
export async function revokePMAssignment(id: string): Promise<void> {
  return apiClient.post<void>(
    `${endpoints.ims.pmAssignment(id)}/revoke`,
    undefined,
  );
}

// ─── PM Lookup — eligible-PMs (routing/candidate picker) ──────────────────────
//
// `POST /ims/pm-lookup/eligible-pms` answers "which PMs can manage this
// (category, OEM?, condition?) target?". Used by the Sales Order line
// Reassign dialog to populate the approver dropdown scoped to the line's
// snapshot category. Permission: `ims:manage` (held by `pm` + `apm`
// per rbac_seed.py).

export type EligiblePMPermission = "manage" | "view";

export interface EligiblePMsRequest {
  category_id: string;
  oem_id?: string;
  condition?: "new" | "refurbished" | "new_pull";
  required_permission?: EligiblePMPermission;
}

export interface EligiblePMEntry {
  user_id: string;
  name: string;
  email: string;
  resolved_permission: EligiblePMPermission;
  matched_assignment_ids: string[];
}

export interface PrimaryPM {
  user_id: string;
  matched_assignment_id: string;
}

export interface EligiblePMsResponse {
  eligible_pms: EligiblePMEntry[];
  primary_pm: PrimaryPM | null;
}

export async function findEligiblePMs(
  body: EligiblePMsRequest,
): Promise<EligiblePMsResponse> {
  return apiClient.post<EligiblePMsResponse>(
    endpoints.ims.pmLookupEligiblePMs,
    body,
  );
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export async function fetchStockItemsPage(params?: {
  q?: string;
  category_id?: string;
  oem_id?: string;
  condition?: string;
  // Repeatable server-side: `?status=available&status=in_operations`. A single
  // value is a one-element array. The placement picker needs "sellable OR in
  // the ops pipeline" in one query.
  status?: string | readonly string[];
  warehouse_id?: string;
  part_id?: string;
  part_variant_id?: string;
  is_tracking?: boolean;
  // When true, restrict to units genuinely available to pick (status=available
  // AND workflow_status IS NULL) — excludes units that are 'available' but still
  // in the ops pipeline. Used by allocation pickers (e.g. spare fulfilment).
  available_for_pick?: boolean;
  page?: number;
  page_size?: number;
}): Promise<StockItemsPage> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.oem_id) qs.set("oem_id", params.oem_id);
  if (params?.condition) qs.set("condition", params.condition);
  // `append`, not `set` — repeated keys are how FastAPI receives a list, and
  // `set` would keep only the last one.
  if (params?.status) {
    for (const st of Array.isArray(params.status)
      ? params.status
      : [params.status])
      qs.append("status", st);
  }
  if (params?.warehouse_id) qs.set("warehouse_id", params.warehouse_id);
  if (params?.part_id) qs.set("part_id", params.part_id);
  if (params?.part_variant_id)
    qs.set("part_variant_id", params.part_variant_id);
  if (params?.is_tracking != null)
    qs.set("is_tracking", String(params.is_tracking));
  if (params?.available_for_pick) qs.set("available_for_pick", "true");
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.page_size != null) qs.set("page_size", String(params.page_size));
  const query = qs.toString();
  return apiClient.get<StockItemsPage>(
    `${endpoints.ims.stockItems}${query ? `?${query}` : ""}`,
  );
}

export async function fetchStockByVariant(
  variantId: string,
): Promise<StockItem[]> {
  return apiClient.get<StockItem[]>(endpoints.ims.variantStock(variantId));
}

export async function fetchStockItem(id: string): Promise<StockItem> {
  return apiClient.get<StockItem>(endpoints.ims.stockItem(id));
}

/** The item's whole movement history — every page. */
export async function fetchStockMovements(
  itemId: string,
): Promise<StockMovement[]> {
  return fetchAllPages((page) =>
    apiClient.get<PageResponse<StockMovement>>(
      `${endpoints.ims.stockItem(itemId)}/movements?page=${page}&page_size=${MAX_PAGE_SIZE}`,
    ),
  );
}

// ─── Stats overview ───────────────────────────────────────────────────────────

export async function fetchStatsOverview(): Promise<StatsOverviewResponse> {
  return apiClient.get<StatsOverviewResponse>(endpoints.ims.statsOverview);
}

// ─── HSN Codes ────────────────────────────────────────────────────────────────

/** Backend's `PaginatedResponse[HSNCodeResponse]` — the standard page. */
export type HSNCodesPagedResponse = PageResponse<HSNCode>;

/** Allowed values for the `sort` query param on
 *  `GET /api/v1/ims/hsn-codes`. Prefix with `-` for descending. */
export type HSNSortField =
  "code" | "-code" | "gst_rate" | "-gst_rate" | "created_at" | "-created_at";

/** Server-paginated, server-searchable, server-sortable HSN list. Sends
 *  `page`, `page_size` (per `PaginationParams`) plus optional `search`
 *  (min 2 chars), `is_active`, and `sort`. Returns
 *  the standard page. */
export async function fetchHSNCodesPaged(params: {
  page: number;
  page_size: number;
  search?: string;
  is_active?: boolean;
  sort?: HSNSortField;
}): Promise<HSNCodesPagedResponse> {
  const query: Record<string, unknown> = {
    page: params.page,
    page_size: params.page_size,
  };
  // Backend enforces min_length=2 on `search`. Drop shorter strings so a
  // typed "h" doesn't error out — the typeahead just keeps the prior
  // result until the user types the 2nd char.
  if (params.search && params.search.trim().length >= 2) {
    query.search = params.search.trim();
  }
  if (params.is_active != null) query.is_active = params.is_active;
  if (params.sort) query.sort = params.sort;
  return apiClient.get<HSNCodesPagedResponse>(endpoints.ims.hsnCodes, {
    params: query,
  });
}

export async function fetchHSNCode(id: string): Promise<HSNCode> {
  return apiClient.get<HSNCode>(endpoints.ims.hsnCode(id));
}

export async function createHSNCode(body: HSNCodeCreate): Promise<HSNCode> {
  return apiClient.post<HSNCode>(endpoints.ims.hsnCodes, body);
}

export async function updateHSNCode(
  id: string,
  body: HSNCodeUpdate,
): Promise<HSNCode> {
  return apiClient.patch<HSNCode>(endpoints.ims.hsnCode(id), body);
}

export async function deleteHSNCode(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.ims.hsnCode(id));
}

// ─── Specification Attributes ────────────────────────────────────────────────

// Master list of specification names (RAM, CPU …). A part/variant `specs` key
// must be one of these names; `values` are only suggestions for the value
// dropdown — operators may still type their own value.
export interface SpecificationAttributeShort {
  id: string;
  name: string;
  values: string[];
  is_active: boolean;
}

export interface SpecificationAttribute extends SpecificationAttributeShort {
  created_by: string;
  created_at: string;
  updated_at: string;
  /** Number of live categories this attribute is linked to. */
  categories_count: number;
  /** The live categories this attribute is linked to — populated on the single
   *  get (for the edit form), empty on list rows. */
  category_ids?: string[];
  /** Position within the category — only set when listed by `category_id`. */
  display_order: number | null;
}

export interface SpecificationAttributeCreate {
  name: string;
  values?: string[];
  is_active?: boolean;
  /** Categories to map this attribute to on creation (create flow only). */
  category_ids?: string[];
}

export type SpecificationAttributeUpdate =
  Partial<SpecificationAttributeCreate>;

export type SpecificationAttributesPagedResponse =
  PageResponse<SpecificationAttribute>;

export type SpecificationAttributeSortField =
  "name" | "-name" | "created_at" | "-created_at";

export async function fetchSpecificationAttributesPaged(params: {
  page: number;
  page_size: number;
  search?: string;
  is_active?: boolean;
  sort?: SpecificationAttributeSortField;
  /** Only this category's linked attributes, in its display order. */
  category_id?: string;
}): Promise<SpecificationAttributesPagedResponse> {
  const query: Record<string, unknown> = {
    page: params.page,
    page_size: params.page_size,
  };
  // Backend enforces min_length=2 on `search`.
  if (params.search && params.search.trim().length >= 2) {
    query.search = params.search.trim();
  }
  if (params.is_active != null) query.is_active = params.is_active;
  if (params.sort) query.sort = params.sort;
  if (params.category_id) query.category_id = params.category_id;
  return apiClient.get<SpecificationAttributesPagedResponse>(
    endpoints.ims.specificationAttributes,
    { params: query },
  );
}

export async function fetchSpecificationAttribute(
  id: string,
): Promise<SpecificationAttribute> {
  return apiClient.get<SpecificationAttribute>(
    endpoints.ims.specificationAttribute(id),
  );
}

export async function createSpecificationAttribute(
  body: SpecificationAttributeCreate,
): Promise<SpecificationAttribute> {
  return apiClient.post<SpecificationAttribute>(
    endpoints.ims.specificationAttributes,
    body,
  );
}

export async function updateSpecificationAttribute(
  id: string,
  body: SpecificationAttributeUpdate,
): Promise<SpecificationAttribute> {
  return apiClient.patch<SpecificationAttribute>(
    endpoints.ims.specificationAttribute(id),
    body,
  );
}

export async function deleteSpecificationAttribute(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.ims.specificationAttribute(id));
}

// ─── Users (for PM assignment lookup) ────────────────────────────────────────

export type UsersPage = PageResponse<UserListItem>;

/** Server-paginated users fetcher for AsyncSelect dropdowns. Page-shape
 *  mirrors PaginatedUsersResponse, hydrating `full_name` for display. */
export async function fetchUsersPage(params: {
  page: number;
  page_size: number;
  search?: string;
  is_active?: boolean;
  /** Backend-side PM eligibility filter. When true, the endpoint returns
   *  only users the system considers Product-Manager-assignable —
   *  superusers OR users holding `product_manager` / `asst_product_manager`
   *  (the role allow-list is hardcoded server-side in
   *  `app.core.rbac.pm_eligibility`; callers cannot widen it). */
  pm_assignable?: boolean;
}): Promise<UsersPage> {
  const response = await apiClient.get<PaginatedUsersResponse>(
    endpoints.users.list,
    {
      params: {
        page: params.page,
        page_size: params.page_size,
        is_active: params.is_active ?? true,
        ...(params.search ? { search: params.search } : {}),
        ...(params.pm_assignable ? { pm_assignable: true } : {}),
      },
    },
  );
  return {
    ...response,
    items: response.items.map((u) => ({
      ...u,
      full_name:
        [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email,
    })),
  };
}

// ─── Checklists (template per part / category) ───────────────────────────────
//
// Backend reshaped this in migration `ims_cfb1_items_form_builder` to a
// form-builder JSONB structure with `kind`-specific validation hints. Old
// shape `{id, label, group, description, required}` is dead. This type
// mirrors `components.schemas.ChecklistItem` from schema.gen.ts.

export type ChecklistItemKind =
  "boolean" | "text" | "numeric" | "select" | "multi_select" | "photo";

export interface ChecklistItem {
  /** Stable machine identifier — lowercase letters, digits, underscore. */
  key: string;
  label: string;
  kind: ChecklistItemKind;
  required: boolean;
  notes?: string | null;
  min_length?: number | null;
  max_length?: number | null;
  min_value?: number | null;
  max_value?: number | null;
  integer_only: boolean;
  options?: string[] | null;
  min_choices?: number | null;
  max_choices?: number | null;
  min_photos?: number | null;
  max_photos?: number | null;
  /** Scoring mode — "pass_fail_na" on a canonical Pass/Fail/N/A select (the
   *  only kind that may carry route_tags); "informational" otherwise. */
  evaluation_mode?: "informational" | "pass_fail_na" | null;
  /** Per-item WMS fail-routing override (repair/paint/spares). Empty/absent ⇒
   *  the WMS engine defaults a fail of this item to repair. */
  route_tags?: ("repair" | "paint" | "spares")[] | null;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  target_type: "category" | "part";
  target_id: string;
  // Denormalized target label from the backend (repo JOINs against
  // categories/parts): `target_name` = category/part name, `target_path` =
  // category breadcrumb or the part_number. Lets the list render the label
  // without a per-row part/category fetch. Optional: the create/preview flow
  // builds bare template objects that don't carry the denorms.
  target_name?: string | null;
  target_path?: string | null;
  type_code: string;
  items: ChecklistItem[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistType {
  code: string;
  label: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

export interface ChecklistTemplateCreate {
  name: string;
  target_type: "category" | "part";
  target_id: string;
  type_code: string;
  items?: ChecklistItem[];
  is_active?: boolean;
}

export interface ChecklistsPage extends PageResponse<ChecklistTemplate> {
  // A#4 — per-`type_code` live-template counts, honoring search/is_active but
  // NOT the active tab, so each tab badge shows its true total. Absent key = 0.
  type_counts?: Record<string, number>;
}

export async function fetchChecklists(params?: {
  target_type?: "category" | "part";
  target_id?: string;
  type_code?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  /** `[-]name` — the server allow-list is name/created_at/updated_at/is_active. */
  sort?: string;
}): Promise<ChecklistsPage> {
  const qs = new URLSearchParams();
  if (params?.target_type) qs.set("target_type", params.target_type);
  if (params?.target_id) qs.set("target_id", params.target_id);
  if (params?.type_code) qs.set("type_code", params.type_code);
  if (params?.search) qs.set("search", params.search);
  if (params?.is_active != null) qs.set("is_active", String(params.is_active));
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.page_size != null) qs.set("page_size", String(params.page_size));
  if (params?.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  return apiClient.get<ChecklistsPage>(
    `${endpoints.ims.imsChecklists}${query ? `?${query}` : ""}`,
  );
}

export async function fetchChecklistTypes(): Promise<ChecklistType[]> {
  return apiClient.get<ChecklistType[]>(endpoints.ims.imsChecklistTypes);
}

export async function fetchChecklist(id: string): Promise<ChecklistTemplate> {
  return apiClient.get<ChecklistTemplate>(endpoints.ims.imsChecklist(id));
}

export async function createChecklist(
  body: ChecklistTemplateCreate,
): Promise<ChecklistTemplate> {
  return apiClient.post<ChecklistTemplate>(endpoints.ims.imsChecklists, body);
}

// Backend `ChecklistTemplateUpdate` has `extra='forbid'` and only accepts
// these three fields. Identity (`target_type` / `target_id` / `type_code`)
// is immutable post-create — sending any of them returns 422.
export interface ChecklistTemplateUpdate {
  name?: string;
  items?: ChecklistItem[];
  is_active?: boolean;
}

export async function updateChecklist(
  id: string,
  body: ChecklistTemplateUpdate,
): Promise<ChecklistTemplate> {
  return apiClient.patch<ChecklistTemplate>(
    endpoints.ims.imsChecklist(id),
    body,
  );
}

export async function deleteChecklist(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.ims.imsChecklist(id));
}

// ─── Activity feed (audit-log projection) ────────────────────────────────────
//
// Backend route: GET /api/v1/ims/activity?resource_type=&resource_id=
// Returns the audit-log history for one IMS resource as an FE-ready
// timeline. Schema source: app/modules/ims/schemas/activity.py.

export type ActivityResourceType =
  | "category"
  | "oem"
  | "part"
  | "part_variant"
  | "stock_item"
  | "checklist_template";

export interface ActivityActor {
  id: string;
  name: string;
  email: string | null;
}

export interface ActivityChange {
  field: string;
  label: string;
  // Pre-formatted display strings (money with ₹, booleans as Active/Inactive,
  // FK ids resolved to names). Render verbatim.
  old: string | null;
  new: string | null;
}

export interface ActivityEntry {
  id: string;
  occurred_at: string;
  headline: string;
  // `null` actor means a system event (seed scripts, scheduled jobs).
  actor: ActivityActor | null;
  action: string;
  resource_type: ActivityResourceType;
  resource_id: string;
  changes: ActivityChange[];
  // Optional user-supplied context (e.g. notes on a price change). Most
  // rows are null.
  note: string | null;
  request_id: string | null;
}

export type ActivityPage = PageResponse<ActivityEntry>;

export interface FetchActivityParams {
  resource_type: ActivityResourceType;
  resource_id: string;
  page?: number;
  page_size?: number;
  // Inclusive UTC bounds on the event date — both must be passed together
  // or neither (backend rejects half-open ranges).
  from_date?: string;
  to_date?: string;
}

export async function fetchActivity(
  params: FetchActivityParams,
): Promise<ActivityPage> {
  const qs = new URLSearchParams();
  qs.set("resource_type", params.resource_type);
  qs.set("resource_id", params.resource_id);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  if (params.from_date) qs.set("from_date", params.from_date);
  if (params.to_date) qs.set("to_date", params.to_date);
  return apiClient.get<ActivityPage>(
    `${endpoints.ims.activity}?${qs.toString()}`,
  );
}

// ── Components (BOM Lite) ────────────────────────────────────────────────
//
// What is physically inside a unit. Each row is a membership record; since
// component-tracking D1 every one is backed by a real `stock_items` row at
// `status='installed'`, so these parts are countable inventory rather than
// annotations.

export type StockItemComponent =
  components["schemas"]["StockItemComponentResponse"];
export type StockItemComponentsView =
  components["schemas"]["StockItemComponentsView"];

/** Current + (optionally) removed components of one unit.
 *
 *  `includeRemoved` populates `removed_components` — the harvest history,
 *  which is how "what was taken out of this machine, and when" is answered. */
export async function fetchStockItemComponents(
  stockItemId: string,
  options: { includeRemoved?: boolean } = {},
): Promise<StockItemComponentsView> {
  const qs = options.includeRemoved ? "?include_removed=true" : "";
  return apiClient.get<StockItemComponentsView>(
    `${endpoints.ims.stockItemComponents(stockItemId)}${qs}`,
  );
}
