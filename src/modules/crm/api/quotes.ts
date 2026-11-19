import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import { roundMoneyFields } from "@/shared/lib/money"

import type { CrmIdNameRef } from "./_shared"

// ─── Quotes ──────────────────────────────────────────────────────────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/quote.py`.
// Backend serializes Decimal money/qty fields as JSON numbers via the
// `DecimalAsFloat` annotation (see schemas/quote.py:47), so we type them as
// `number` here. Verified against the live OpenAPI on 2026-05-06.

// Backend enum (verified via OpenAPI 2026-05-20):
//   Draft → Sent → Accepted | Rejected   (all transitions are manual)
// SO activity does NOT change quote.status. Fulfilment is tracked on
// quote_items.remaining_qty — a quote can be drawn by ≥1 SOs from any
// non-Rejected status; status is purely a sales-rep display badge.
//
// Pre-2026-05-20 the enum also carried `PartiallyFulfilled` / `Fulfilled`
// server-derived from per-line remaining_qty; those branches are commented
// out below for history, removed from the live type so the FE can't filter
// on dead values (the backend CHECK constraint now 422s them).
export type QuoteStatus =
  | "Draft"
  | "Submitted"
  // QUOTE-APPR-T1 — approval statuses added additively. Backend
  // ``_run_approval_resolution`` rolls each submit to one of these
  // three based on the per-line resolver decisions. Carried through
  // the FE for badge rendering + list filtering.
  | "Pending Approval"
  | "Partially Approved"
  | "Partially Rejected"
  | "Approved"
  | "Sent"
  | "Accepted"
  | "Rejected"
  // Terminal "this row was superseded by a new version" — set on the source
  // row by QuoteService.version() when a Submitted/Rejected quote spawns
  // v(N+1). Service-managed only; never accepted as FE input, but the FE must
  // render it (badge + filter) since superseded rows still appear in lists.
  | "Amend"
  // | "PartiallyFulfilled"
  // | "Fulfilled"
export type QuotableType = "account" | "deal" | "lead"

// `GET /crm/quotes?mention=` — "only" = quotes visible ONLY because the viewer
// is @mentioned on their lead/deal (not assigned — read-only); "exclude" =
// quotes whose lead/deal doesn't mention the viewer, INCLUDING dropping ones
// the viewer is assigned to AND mentioned on; "all" = no filter.
export type QuoteMentionFilter = "all" | "only" | "exclude"

// Mention → view-only access. "view" = the viewer reaches this quote ONLY
// through a lead/deal they were @mentioned on (read-only; every write 404s).
// Optional so older payloads / fixtures stay valid — absent means "edit".
export type QuoteAccessLevel = "edit" | "view"

// Per backend spec (`schemas/quote.py:RentalPeriod`).
export type QuoteRentalPeriod = "day" | "month"

// BOM action on every quote item row (QUOTE-4).
//   - 'Standard' → headline row (parent_quote_item_id IS NULL)
//   - 'Add'      → BOM child added to a parent assembly
//   - 'Remove'   → BOM child removed from a parent assembly (server flips
//                  is_customer_visible=false so it never prints on the PDF)
export type QuoteConfigAction = "Standard" | "Add" | "Remove"

// Children-only action — Standard is reserved for headlines.
export type BomChildAction = "Add" | "Remove"

export interface QuoteItemWire {
  id: string
  quote_id: string
  // BOM tree fields (QUOTE-4). `parent_quote_item_id` is NULL on headline
  // rows; `config_action` is 'Standard' on headlines and 'Add' | 'Remove'
  // on children. The response is TREE-shaped — children appear under
  // `QuoteItemWire.children` on their parent, not at the top level.
  parent_quote_item_id: string | null
  config_action: QuoteConfigAction
  configuration_notes: string | null
  warranty_level: string | null
  sort_order: number
  is_customer_visible: boolean
  part_variant_id: string | null
  condition: string | null
  oem_id: string | null
  // Nullable since backend migration 202610211400 — quote line items
  // (headlines + children) may now be saved without a category.
  category_id: string | null
  item_name: string
  description: string | null
  qty: number
  // Live fulfillment-tracking column on the quote item. Decremented every
  // time an SO line draws from this quote item; restored when an SO is
  // rejected and its qty is released. Drives the multi-SO-from-one-Quote
  // flow: the FE caps each `quote_line_quantities[id]` at `remaining_qty`
  // and shows the "X of Y left" hint on quote detail/preview UIs.
  remaining_qty: number
  rate: number
  // Snapshot of IMS variant.sell_price at pick time; survives later catalog
  // sell_price changes. NULL on freeform rows + legacy rows.
  list_price: number | null
  // Server-computed money fields (mirror QuoteItemResponse). `gross_amount`
  // is qty*rate (or qty*rate*duration for rentals); `discount_amount` is the
  // resolved per-line discount; `amount` is gross-discount; `tax_amount` is
  // amount * tax_rate / 100.
  gross_amount: number
  discount_percentage: number | null
  discount_amount: number
  amount: number
  tax_rate: number
  tax_amount: number
  // Rental fields (per spec §B14). `rental_duration_units` is server-computed:
  // day-period → (end - start).days + 1; month-period → the ACTUAL months,
  // whole months + prorated days (RM54), so it may be fractional.
  is_rental: boolean
  rental_period: QuoteRentalPeriod | null
  rental_start_date: string | null    // ISO "YYYY-MM-DD"
  rental_end_date: string | null      // ISO "YYYY-MM-DD"
  rental_duration_units: number | null
  rental_duration_label?: string | null // "1 month 5 days"
  // QUOTE-APPR-T1/T5/T6 — per-line approval state. Set by the resolver
  // on submit and mutated by the approve/reject endpoints. ``Draft`` on
  // quotes that never went through approval. ``approver_id`` is the
  // stamped assignee (NULL for bypass lines). ``approval_notes`` is
  // required on ``Rejected`` lines. ``approval_snapshot`` is the
  // resolver's audit trail.
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected"
  approver_id: string | null
  approver_name: string | null
  approved_at: string | null
  approval_notes: string | null
  approval_snapshot?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // QUOTE-4 tree shape — depth-1 by construction. On a headline row this
  // holds the Add/Remove children sorted by `sort_order`. On a child row
  // this is always `[]`. Server filters out non-headlines from the top
  // level of `QuoteWire.items` so the FE never has to walk-and-group.
  children: QuoteItemWire[]
}

// One per-quote Terms & Conditions snapshot row — mirrors `QuoteTermResponse`.
// Most `body_html` tokens (`{{account.*}}`, `{{quote.quote_number}}`, …) are
// baked in at save time. The ONE exception is `{{quote.validity_days}}`, which
// the backend deliberately keeps as a raw token in the stored snapshot so the
// day count stays live against the quote's current `valid_until`: the edit
// builder round-trips the raw token, the read-only detail view resolves it for
// display (see `lib/validity-token.ts`), and the PDF resolves it at render
// time. `source_template_row_id` points at the seeding `brand_template_rows.id`
// (NULL = added ad-hoc by sales). Carried nested on `QuoteWire.terms`.
export interface QuoteTermWire {
  id: string
  sequence: number
  heading: string
  body_html: string
  is_fixed: boolean
  // Whether sales may edit this clause's heading/body. Optional until the
  // backend persists it on quote_terms — treated as `true` when absent.
  is_editable?: boolean
  // Whether sales may delete this clause. Optional until the backend persists
  // it on quote_terms — treated as `true` when absent.
  is_deletable?: boolean
  source_template_row_id: string | null
}

// One T&C row sent on create/update — mirrors `QuoteTermIn`. `body_html` may
// still contain `{{quote.*}}`/`{{account.*}}`/`{{contact.*}}` tokens; the
// backend resolves them in the save transaction. NOTE: `is_fixed` position
// locking is enforced FRONTEND-side — the backend stores the flag as-is.
export interface QuoteTermPayload {
  sequence: number
  heading: string
  body_html: string
  // Permission flags carried per row. Template clauses send the values seeded
  // from the brand template; ad-hoc clauses send is_fixed=false,
  // is_editable=true, is_deletable=true. Backend defaults all three when omitted.
  is_fixed: boolean
  is_editable: boolean
  is_deletable: boolean
  source_template_row_id: string | null
}

export interface QuoteWire {
  id: string
  quote_number: string
  // Source record number (lead / deal / account) — ``QuoteResponse.entity_number``.
  entity_number: string | null
  version_number: number
  parent_quote_id: string | null
  is_latest_quote: boolean
  quotable_type: QuotableType
  quotable_id: string
  status: QuoteStatus
  valid_until: string | null     // ISO date "YYYY-MM-DD"
  terms_conditions: string | null
  notes: string | null
  // The vertical brand this quote is rendered under. Frozen for the quote's
  // lifetime (immutable after create). `null` on legacy quotes created before
  // the brand column shipped.
  brand_id: string | null
  // Structured Terms & Conditions snapshot (token-resolved), ordered by
  // `sequence`. Empty when the quote carries no clauses.
  terms: QuoteTermWire[]
  // Header-level discount columns are retained server-side for migration
  // reasons (QUOTE-4 deliberately did NOT drop the DB columns) but always
  // serialize as 0/null — discounts now live exclusively at line-item
  // level. FE must NEVER send `discount_percentage` / `discount_amount`
  // in QuoteCreate / QuoteUpdate / QuoteCalculate — backend rejects via
  // `extra='forbid'` (422). The header totals panel displays
  // `total_line_discount` (sum-of-line-discounts) instead.
  discount_percentage: number | null
  discount_amount: number
  // Server-managed header rollups, recomputed on every item mutation.
  // `subtotal` is sum-of-line-gross; `total_line_discount` is sum of
  // per-line discounts; `taxable_amount` = subtotal − total_line_discount;
  // `total_tax` is sum-of-line-tax on that taxable base; `grand_total` =
  // taxable_amount + total_tax. (Header discount is no longer subtracted
  // — QUOTE-4.)
  subtotal: number
  total_line_discount: number
  taxable_amount: number
  total_tax: number
  grand_total: number
  // Auto-derived labels — `["Rental"]`, `["Sale"]`, or both.
  labels: string[]
  created_by: string
  created_at: string
  updated_at: string
  items: QuoteItemWire[]
  // Public URL to the backend-rendered 3-page commercial PDF (Inter +
  // Chakra Petch, brand-styled). `null` when storage backend is local-disk
  // (dev), or when the most recent generation attempt failed silently —
  // the URL refreshes on every quote mutation.
  pdf_url: string | null
  access_level?: QuoteAccessLevel
  // The quote's lead/deal lists the viewer as @mentioned — true for edit
  // users too.
  is_mentioned?: boolean
}

export interface QuoteListItemWire {
  id: string
  quote_number: string
  version_number: number
  parent_quote_id: string | null
  is_latest_quote: boolean
  quotable_type: QuotableType
  quotable_id: string
  // Human-friendly identifier for the linked party — resolved server-side
  // from account.code / deal.deal_number / lead.lead_code. `null` only if
  // the linked row was hard-deleted (rare — soft-delete is the norm).
  entity_number: string | null
  // 2026-05-27: customer-facing display name for the linked party,
  // resolved server-side per quotable_type:
  //   - account → accounts.name
  //   - deal    → accounts.name via deals.account_id
  //   - lead    → leads.company_name (may be null on legacy leads)
  // Single column regardless of source — FE renders without branching.
  account_name: string | null
  status: QuoteStatus
  valid_until: string | null
  // Server-computed rollup of all line items including header discount
  // and tax. List endpoints carry this so the FE can render totals on
  // collapsed cards without round-tripping for the full QuoteWire.
  grand_total: number
  // Auto-derived labels — `["Rental"]`, `["Sale"]`, or `["Rental", "Sale"]`
  // (mixed quote). Used to chip the row so sales can scan a list at a
  // glance. Backend recomputes on every list query; never persisted.
  labels: string[]
  // 2026-05-27: live count of non-deleted quote_items rows, resolved
  // server-side by a single batched GROUP BY (no N+1).
  line_item_count: number
  // Vertical brand this quote was rendered under. `brand_id` mirrors the
  // frozen `quotes.brand_id`; `brand_code` / `brand_name` are resolved
  // server-side (batched) so the list can show + filter by vertical. All
  // three are `null` on legacy quotes created before the brand column.
  brand_id: string | null
  brand_code: string | null
  brand_name: string | null
  created_by: string
  // Embedded {id, name} for the creator, resolved server-side (batched) so the
  // list can show the creator's name without a second user fetch. `null` only
  // if the creating user row can't be resolved (e.g. soft-deleted).
  created_by_user: CrmIdNameRef | null
  // 2026-10-13: distinct users who have approved ≥ 1 live line item on this
  // quote (`quote_items.status = 'Approved'` with `approver_id` set). Resolved
  // server-side (batched) and ordered by earliest approval time, so the list
  // can render the first name + "+N" with the rest in a tooltip without a
  // second /users fetch. Empty when nothing is approved yet.
  approved_by_users: CrmIdNameRef[]
  /** Distinct category names across the quote's line items (sorted). */
  categories?: string[]
  // Same meaning as on `QuoteWire`.
  access_level?: QuoteAccessLevel
  is_mentioned?: boolean
  created_at: string
  updated_at: string
}

export interface QuotesListResponse {
  items: QuoteListItemWire[]
  total: number
  page: number
  page_size: number
}

export interface FetchQuotesParams {
  page?: number
  page_size?: number
  search?: string
  /** Narrow search on the quote's OWN number only (max 100 chars). `search` is wider. */
  quote_number?: string
  /** Inclusive bounds on the quote's grand total (inc. tax). */
  min_total?: number
  max_total?: number
  // Single value or array — axios paramsSerializer `indexes: null` emits
  // `?status=A&status=B` which the FastAPI endpoint parses as `list[str]`.
  // The backend treats the list as an OR filter (e.g. accepted-or-partial).
  status?: QuoteStatus | QuoteStatus[]
  quotable_type?: QuotableType
  quotable_id?: string
  // Multi-select: returns quotes created by ANY of these user ids. Sent as
  // repeated query keys (?created_by=a&created_by=b) via axios `indexes: null`.
  created_by?: string[]
  // Multi-select: quotes where ANY line item was approved by ANY of these users.
  // Repeated keys (?approved_by=a&approved_by=b).
  approved_by?: string[]
  // Multi-select: quotes on ANY of these accounts (direct or via a deal).
  // Repeated keys (?account_id=a&account_id=b); lead quotes drop out.
  account_id?: string[]
  // Multi-select: quotes whose lead/deal has ANY of these channel types.
  // Account quotes (no channel) drop out. Repeated `?channel_type=` keys.
  channel_type?: string[]
  /** Rows with at least one LINE ITEM in ANY of these IMS categories. */
  category_ids?: string[]
  /** Rows with at least one LINE ITEM carrying ANY of these IMS OEMs (same line as category_ids). */
  oem_ids?: string[]
  /** Vertical brand id — filters to quotes rendered under this brand. */
  brand_id?: string
  /** Created-date range (IST calendar days, inclusive). `YYYY-MM-DD`. */
  date_from?: string
  date_to?: string
  sort?: string
  mention?: QuoteMentionFilter
  // CRM Quotes page only: hide quotes visible ONLY because the viewer was
  // @mentioned on their lead/deal. The lead/deal Quotes tab leaves it off.
  hide_mention_only?: boolean
}

// BOM child create payload (QUOTE-4). Sent inline under a parent
// `QuoteItemCreatePayload.children`. Mirrors backend
// `schemas/quote.py:QuoteBomChildCreate`. Differences vs a headline:
//   - `config_action` required ('Add' | 'Remove'); 'Standard' is rejected
//   - `category_id` required on every row (FE always derives from the
//     picked variant on catalog rows)
//   - `is_customer_visible` NOT accepted — server sets it (false for
//     Remove, true for Add)
//   - rental fields NOT accepted — sales rents the whole headline, not
//     individual components
export interface QuoteBomChildCreatePayload {
  config_action: BomChildAction
  part_variant_id?: string             // catalog row
  // Per-child Brand/OEM + Condition — same shape as the headline row.
  // Catalog children: autofilled from the variant when omitted (service
  // never asserts conflict — quotes stay lenient). Freeform children:
  // stored as-is.
  condition?: string
  oem_id?: string
  // Optional since migration 202610211400 — may be omitted on quote children.
  category_id?: string
  item_name?: string                   // required for freeform
  description?: string | null
  qty: number
  rate?: number
  // Catalog sell_price snapshot of the child's variant at pick time (same
  // contract as the parent line's `list_price`). Omit when unknown.
  list_price?: number | null
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  discount_percentage?: number
  discount_amount?: number
}

// BOM child upsert payload — id present → update existing child;
// id absent → create new child. `parent_quote_item_id` and
// `config_action` are immutable on existing rows (backend ignores
// FE-supplied values for them).
export interface QuoteBomChildUpsertPayload {
  id?: string
  config_action?: BomChildAction        // required when id absent
  // Catalog child → variant id. Pass `null` (not omit) on an EXISTING child
  // whose variant was cleared — omitting keeps the old variant on a PATCH;
  // explicit null drops it (child → freeform).
  part_variant_id?: string | null
  // Per-child Brand/OEM + Condition. Omit to leave unchanged on an existing
  // child; pass a value to overwrite. Catalog children: autofilled from the
  // variant when omitted on CREATE. Freeform: stored as-is.
  condition?: string
  oem_id?: string
  category_id?: string
  item_name?: string
  description?: string | null
  qty?: number
  rate?: number
  list_price?: number | null
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  discount_percentage?: number
  discount_amount?: number
}

// Item create payload — headline (parent) row. Supports catalog
// (`part_variant_id`) and freeform shapes. Optional `children` carries
// the BOM tree inline; the service inserts the headline first, then
// each child with `parent_quote_item_id` auto-wired. The backend rejects
// `extra='forbid'`, so omit fields rather than send `null` for "not used"
// (except nullable fields like `description`).
//
// `category_id` is now required on every row (QUOTE-4) — for catalog rows
// the FE derives it from the variant lookup it already does for autofill;
// for freeform rows the user picks it.
//
// Rental shape: when `is_rental` is true, all three of `rental_period`,
// `rental_start_date`, `rental_end_date` are required (backend rejects with
// a clear validation error otherwise). When `is_rental` is false (or omitted),
// none of those three may be set.
export interface QuoteItemCreatePayload {
  part_variant_id?: string
  condition?: string
  oem_id?: string
  // Optional since migration 202610211400 — quote headlines may be saved
  // without a category (same contract as children).
  category_id?: string
  item_name?: string                    // required for freeform
  description?: string | null
  qty: number
  rate?: number
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  // Optional per-line discount (one or both — backend resolves agreement).
  discount_percentage?: number
  discount_amount?: number
  // Snapshot of IMS variant.sell_price at pick time; never auto-refreshed.
  list_price?: number | null
  // Rental fields (per spec §B14).
  is_rental?: boolean
  rental_period?: QuoteRentalPeriod
  rental_start_date?: string            // ISO "YYYY-MM-DD"
  rental_end_date?: string              // ISO "YYYY-MM-DD"
  // Inline BOM children (QUOTE-4) — max 20 per parent. Atomic with the
  // headline: any child failing rolls back the parent + earlier siblings.
  children?: QuoteBomChildCreatePayload[]
}

// Inline upsert shape used inside QuoteUpdatePayload.items[]. Backend
// dispatches on the optional `id`: present → update existing line item,
// absent → create new. See schemas/quote.py (QuoteItemUpsert).
//
// QUOTE-4: `parent_quote_item_id` + `config_action` are mutable on the
// CREATE branch (id absent) — that's how a flat sibling row creates a
// child under an existing parent identified by id. They are IMMUTABLE on
// the UPDATE branch (backend rejects with `QUOTE_BOM_FIELD_IMMUTABLE`).
// Prefer the nested `children` form for new code.
export interface QuoteItemUpsertPayload
  extends Omit<QuoteItemCreatePayload, "category_id" | "children" | "part_variant_id"> {
  id?: string
  parent_quote_item_id?: string
  config_action?: QuoteConfigAction
  category_id?: string
  // Catalog line → variant id. Pass `null` (not omit) on an EXISTING line
  // whose variant was cleared — omitting keeps the old variant on a PATCH;
  // explicit null clears it and the line becomes freeform (item_name +
  // category_id then required).
  part_variant_id?: string | null
  children?: QuoteBomChildUpsertPayload[]
}

export interface QuoteCreatePayload {
  quotable_type: QuotableType
  quotable_id: string
  // Backend accepts only "Draft" or "Submitted" at create time; other
  // statuses must be reached via PATCH /quotes/{id}/status. See
  // backend services/quote_service.py:285.
  status?: QuoteStatus
  valid_until?: string | null
  terms_conditions?: string | null
  notes?: string | null
  // Vertical brand — optional at create (backend backfills the default when
  // omitted), then frozen. Immutable after create — NEVER send on PATCH.
  brand_id?: string | null
  // Structured Terms & Conditions snapshot. When omitted/empty the backend
  // may seed from the brand template; the FE sends exactly what the user sees.
  terms?: QuoteTermPayload[]
  // Header discount fields removed (QUOTE-4) — discounts live at line
  // level only. Backend rejects header `discount_*` with 422 (extra='forbid').
  items?: QuoteItemCreatePayload[]
}

// PATCH /quotes/{id}. All fields optional. `items` here is the upsert
// array (Option B semantics): rows with `id` update, rows without `id`
// create, omitted rows are NOT deleted — caller must hit
// DELETE /quotes/{id}/items/{item_id} explicitly.
export interface QuoteUpdatePayload {
  quotable_type?: QuotableType
  quotable_id?: string
  // Optional inline state transition. Backend runs the same
  // `(current, target)` state-machine validation as PATCH
  // /quotes/{id}/status — illegal transitions raise 400
  // QUOTE_INVALID_TRANSITION. See backend schemas/quote.py:758.
  status?: QuoteStatus
  valid_until?: string | null
  terms_conditions?: string | null
  notes?: string | null
  // Business Vertical. Editable while the quote is still editable
  // (Draft/Submitted); the backend rebrands the quote and re-renders its PDF.
  // Frozen quotes (Sent/Accepted/Rejected) reject any body edit upstream, so
  // history stays intact. Omit to leave the brand untouched; `null` clears it.
  brand_id?: string | null
  // `terms`, when provided, REPLACES the whole T&C snapshot; omit to leave
  // the existing snapshot untouched (an empty array clears it).
  terms?: QuoteTermPayload[]
  // Header discount removed (QUOTE-4).
  items?: QuoteItemUpsertPayload[]
}

export async function fetchQuotes(
  params: FetchQuotesParams = {},
): Promise<QuotesListResponse> {
  return apiClient.get<QuotesListResponse>(endpoints.crm.quotes, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
      quote_number: params.quote_number?.trim() || undefined,
      min_total: params.min_total,
      max_total: params.max_total,
      status: params.status,
      quotable_type: params.quotable_type,
      quotable_id: params.quotable_id,
      // Repeated query keys (?created_by=a&created_by=b) via axios indexes:null.
      created_by:
        params.created_by && params.created_by.length > 0
          ? params.created_by
          : undefined,
      approved_by:
        params.approved_by && params.approved_by.length > 0
          ? params.approved_by
          : undefined,
      account_id:
        params.account_id && params.account_id.length > 0
          ? params.account_id
          : undefined,
      channel_type:
        params.channel_type && params.channel_type.length > 0
          ? params.channel_type
          : undefined,
      category_ids:
        params.category_ids && params.category_ids.length > 0
          ? params.category_ids
          : undefined,
      oem_ids:
        params.oem_ids && params.oem_ids.length > 0 ? params.oem_ids : undefined,
      brand_id: params.brand_id || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      mention: params.mention && params.mention !== "all" ? params.mention : undefined,
      hide_mention_only: params.hide_mention_only || undefined,
      sort: params.sort,
    },
  })
}

export async function fetchQuote(id: string): Promise<QuoteWire> {
  return apiClient.get<QuoteWire>(endpoints.crm.quote(id))
}

// ── Document numbering ────────────────────────────────────────────────────
// `GET /api/v1/next-number?type=<doc>` returns a *provisional* preview of the
// next document number. It is NOT reserved — the authoritative number is
// allocated inside the create transaction (e.g. POST /crm/quotes), which may
// land one ahead if another user creates first. Used to pre-fill the
// read-only "Quote Number" field on the create form.

export type NextNumberDocType =
  | "quotes"
  | "sales-orders"
  | "material-inquiries"
  | "demo-requests"
  | "deals"

export interface NextNumberWire {
  type: NextNumberDocType
  next_number: string
  provisional: boolean
}

export async function fetchNextNumber(
  type: NextNumberDocType,
): Promise<NextNumberWire> {
  return apiClient.get<NextNumberWire>(endpoints.nextNumber, {
    params: { type },
  })
}

export async function createQuote(
  body: QuoteCreatePayload,
): Promise<QuoteWire> {
  return apiClient.post<QuoteWire>(endpoints.crm.quotes, roundMoneyFields(body))
}

export async function updateQuote(
  id: string,
  body: QuoteUpdatePayload,
): Promise<QuoteWire> {
  return apiClient.patch<QuoteWire>(endpoints.crm.quote(id), roundMoneyFields(body))
}

export async function addQuoteItem(
  quoteId: string,
  body: QuoteItemCreatePayload,
): Promise<QuoteItemWire> {
  return apiClient.post<QuoteItemWire>(endpoints.crm.quoteItems(quoteId), roundMoneyFields(body))
}

export async function deleteQuoteItem(
  quoteId: string,
  itemId: string,
): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.quoteItem(quoteId, itemId))
}

export async function versionQuote(id: string): Promise<QuoteWire> {
  return apiClient.post<QuoteWire>(endpoints.crm.quoteVersion(id))
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<QuoteWire> {
  return apiClient.patch<QuoteWire>(endpoints.crm.quoteStatus(id), { status })
}

// ─── Quote calculation preview (POST /quotes/calculate) ─────────────────
//
// Stateless preview — runs the same per-line + header math as POST /quotes
// without persisting anything. The form calls this on every input change
// (debounced) so totals + per-line money render exactly what Save would
// produce. Mirrors `QuoteCalculateRequest` / `QuoteCalculateResponse` in
// `app/modules/crm/schemas/quote.py`.

// /quotes/calculate accepts the SAME nested-children shape as the persist
// endpoint (backend f3e8b18, 2026-05-29). Headlines optionally carry
// `children: QuoteCalculateChildPayload[]`. The backend's compute_totals
// derives `is_customer_visible` from `config_action` — Remove children
// are hidden from the rollup so we CAN send them safely (the preview
// matches what persist will compute).
//
// One form-state shape across `/calculate` and `POST /quotes` /
// `PATCH /quotes/{id}` — no more flat-sibling flattening at call sites.

// BOM child shape for the calculate request. Mirrors backend
// `QuoteBomChildCalculate`. Differences from a headline:
//   - `config_action` required ('Add' | 'Remove'); 'Standard' rejected.
//   - `category_id` required on every row.
//   - No rental fields (sales rents the whole headline assembly).
export interface QuoteCalculateChildPayload {
  config_action: BomChildAction
  part_variant_id?: string
  // Optional since migration 202610211400 — same contract as persist payloads.
  category_id?: string
  item_name?: string
  // `description` is intentionally absent — it is not a pricing input, so it
  // never goes to /calculate. Including it would make the query key change
  // (and refetch) on every keystroke in the Description box.
  qty: number
  rate?: number
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  discount_percentage?: number
  discount_amount?: number
}

export interface QuoteCalculateLinePayload {
  part_variant_id?: string
  category_id?: string
  item_name?: string
  // `description` is intentionally absent — see QuoteCalculateChildPayload.
  qty: number
  rate?: number
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  discount_percentage?: number
  discount_amount?: number
  is_rental?: boolean
  rental_period?: QuoteRentalPeriod
  rental_start_date?: string
  rental_end_date?: string
  // Inline BOM children (backend f3e8b18) — max 20 per parent. Children
  // contribute to the per-line + grand totals the same way persist
  // computes them.
  children?: QuoteCalculateChildPayload[]
}

export interface QuoteCalculateRequest {
  // Header discount removed (QUOTE-4) — `extra='forbid'` will 422.
  items: QuoteCalculateLinePayload[]
}

export interface QuoteCalculateLineResponseWire {
  sort_order: number
  // BOM tree echo (backend f3e8b18). Headlines come back with
  // `config_action='Standard'` + `is_customer_visible=true`; children
  // carry their action and visibility (Remove → is_customer_visible=false
  // and excluded from the rollup).
  config_action: QuoteConfigAction
  is_customer_visible: boolean
  part_variant_id: string | null
  category_id: string | null
  item_name: string | null
  description: string | null
  qty: number
  rate: number | null
  gross_amount: number
  discount_percentage: number | null
  discount_amount: number
  amount: number
  tax_rate: number
  tax_amount: number
  is_rental: boolean
  rental_period: QuoteRentalPeriod | null
  rental_start_date: string | null
  rental_end_date: string | null
  rental_duration_units: number | null
  configuration_notes: string | null
  warranty_level: string | null
  // Self-referential — depth-1 by construction; on a child this is `[]`.
  children: QuoteCalculateLineResponseWire[]
}

export interface QuoteCalculateResponseWire {
  subtotal: number
  total_line_discount: number
  taxable_amount: number
  total_tax: number
  grand_total: number
  labels: string[]
  items: QuoteCalculateLineResponseWire[]
}

export async function calculateQuotePreview(
  body: QuoteCalculateRequest,
): Promise<QuoteCalculateResponseWire> {
  return apiClient.post<QuoteCalculateResponseWire>(
    endpoints.crm.quoteCalculate,
    roundMoneyFields(body),
  )
}
