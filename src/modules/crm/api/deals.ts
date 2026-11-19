import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"

import type { CrmEntityStats } from "./_shared"

// ─── Deals ───────────────────────────────────────────────────────────────
// Wire types mirror app/modules/crm/schemas/deal.py (verified 2026-05-04).
// Stages on the wire are lowercase + underscore (`new`, `closed_won`, ...).
// FE consumes Title Case throughout; translate at this single boundary.

export type DealStage =
  | "New"
  | "Procurement"
  | "Cold"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost"

export type DealStageWire =
  | "new"
  | "procurement"
  | "cold"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost"

export type DealPriority = "High" | "Medium" | "Low"
export type DealChannelType = "End Customer" | "Channel Partner" | "Cloud / Data Center" | "End User"
export type DealTag = "New" | "Refurb" | "Rental"
export const DEAL_TAG_LIST: readonly DealTag[] = ["New", "Refurb", "Rental"] as const

export const DEAL_STAGE_LIST: readonly DealStage[] = [
  "New",
  "Procurement",
  "Cold",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const

export const DEAL_NON_TERMINAL_STAGES: readonly DealStage[] = [
  "New",
  "Procurement",
  "Cold",
  "Proposal",
  "Negotiation",
] as const

const DEAL_STAGE_TO_WIRE: Record<DealStage, DealStageWire> = {
  New: "new",
  Procurement: "procurement",
  Cold: "cold",
  Proposal: "proposal",
  Negotiation: "negotiation",
  "Closed Won": "closed_won",
  "Closed Lost": "closed_lost",
}

const DEAL_STAGE_FROM_WIRE: Record<DealStageWire, DealStage> = {
  new: "New",
  procurement: "Procurement",
  cold: "Cold",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
}

export function dealStageToWire(stage: DealStage | undefined): DealStageWire | undefined {
  return stage ? DEAL_STAGE_TO_WIRE[stage] : undefined
}

export function dealStageFromWire(wire: string): DealStage {
  return (DEAL_STAGE_FROM_WIRE as Record<string, DealStage>)[wire] ?? (wire as DealStage)
}

// Backend embeds {id, name} for each user in `bde_users`. The same shape
// piggybacks for the optional `account` / `contact` embed if/when the
// backend ships them; today the deal endpoints return only the FK ids,
// so we type these as optional and the FE falls back to showing the id.
export interface DealUserEmbed {
  id: string
  name: string
}

export interface DealAccountEmbed {
  id: string
  name: string
}

export interface DealContactEmbed {
  id: string
  name: string
  designation?: string | null
  phone?: string | null
  email?: string | null
}

// `{id, name}` IMS category ref — the deal list embeds resolved category
// names (backend `IdNameRef`) alongside the raw `category_ids`.
export interface DealCategoryRef {
  id: string
  name: string
}

// Slim record from GET /crm/deals (DealListItem in schemas/deal.py).
export interface DealListItem {
  id: string
  deal_number: string
  title: string
  lead_id: string | null
  account_id: string
  // Backend joins accounts.name onto the list response. Detail (`DealResponse`)
  // does NOT ship this — list-only field.
  account_name: string | null
  contact_id: string
  // Backend embeds the deal's contact (name + designation / phone / email)
  // on the list response so the table can show contact columns without a
  // per-row round-trip. Null when the contact was soft-deleted.
  contact_details: DealContactEmbed | null
  owner_id: string | null
  // Resolved owner `{id, name}`; null when the deal has no owner.
  assigned_to: DealUserEmbed | null
  bde_users: DealUserEmbed[]
  // Decimal(18,2) — backend may serialize as string. Keep both shapes.
  value: number | string
  // grand_total of this deal's latest quote (the chain head where
  // is_latest_quote = true). Backend defaults it to "0" when the deal has no
  // quote yet, so it is always present on the list response — list-only,
  // `DealResponse` (detail) does not ship it. Decimal(18,2) → number | string.
  latest_quote_value: number | string
  stage: DealStage
  priority: DealPriority
  channel_type: DealChannelType | null
  source: string | null
  estimated_closure_date: string | null
  // Actual close timestamps, server-stamped when the deal moves to a terminal stage
  // (null while the deal is open). Present on the list row.
  closed_won_at?: string | null
  closed_lost_at?: string | null
  tags: DealTag[]
  // Raw IMS category UUIDs; `categories` carries the resolved {id, name} refs.
  category_ids: string[]
  categories: DealCategoryRef[]
  // Resolved OEM {id, name} refs (list rows only).
  oems?: DealCategoryRef[]
  requirement: string | null
  // TODO(backend): not yet in the Deal schema — pending Deal.location column.
  // Typed optional so the FE list table can already render the column once
  // backend ships it; reads as undefined on every row until then.
  location?: string | null
  kanban_order: number
  last_activity_at: string | null
  // Deletion-guard hint from the backend — false when an active Sales Order is
  // linked to the deal. The FE hides its delete affordance when false; the
  // server re-checks and raises DEAL_HAS_SALES_ORDER regardless.
  is_deletable: boolean
  // Mention → view-only access. "view" = the viewer reaches this record ONLY
  // because they were @mentioned on it (read-only; every write 404s).
  // Optional so older payloads / fixtures stay valid — absent means "edit".
  access_level?: "edit" | "view"
  created_at: string
  updated_at: string
}

// Full record from GET /crm/deals/{id}, POST, and PATCH responses.
export interface DealResponse {
  /** Whether this deal is a SALE or a RENTAL. Derived server-side from the
   *  deal's live quotes and orders (`_deal_intent.recompute_deal_sellable_intent`),
   *  never set by a user — rentals are quoted and ordered separately from
   *  sales, so a deal is one or the other. */
  sellable_intent: "sale" | "rental"
  /** Money actually INVOICED against this deal, as a decimal string.
   *  Diverges from `value` on rentals by design: a rental's worth accrues
   *  invoice by invoice, and a contract or a line can be terminated at any
   *  point, so the booked figure is a forecast until the invoices exist.
   *  Maintained by `_deal_realised_value.recompute_realised_value`, which
   *  also runs when an invoice is deleted. */
  realised_value: string
  /** When the deal reached Closed Won. */
  closed_won_at: string | null
  id: string
  deal_number: string
  title: string
  lead_id: string | null
  account_id: string
  // Joined `accounts.name` resolved server-side; null only when the
  // account FK is orphaned (rare). Used by triggers / chips that want
  // to show the customer alongside the deal number without a follow-up
  // GET /accounts/{id}.
  account_name: string | null
  contact_id: string
  // Legacy embeds — backend does not actually send these on the detail
  // endpoint today; kept here for forward-compat in case the server
  // grows a richer `account` / `contact` block. Prefer `account_name`
  // for the customer label.
  account?: DealAccountEmbed | null
  contact?: DealContactEmbed | null
  owner_id: string | null
  presales_manager_id: string | null
  bde_users: DealUserEmbed[]
  value: number | string
  expected_revenue: number | string | null
  probability: number
  estimated_closure_date: string | null
  priority: DealPriority
  channel_type: DealChannelType | null
  stage: DealStage
  kanban_order: number
  proposal_date: string | null
  last_activity_at: string | null
  tags: DealTag[]
  // Lead-source label (e.g. "Website", "Referral") carried over from the
  // originating lead, or set directly on the deal. Free text, max 100 chars.
  source: string | null
  // IMS category UUIDs scoped to this deal. ``categories`` carries the
  // resolved {id, name} refs so the FE can render names without a
  // follow-up categories lookup; ``category_ids`` is kept for write paths
  // (PATCH payloads send ids only).
  category_ids: string[]
  categories: DealCategoryRef[]
  // IMS OEM UUIDs + resolved {id, name} refs (same shape as categories).
  oem_ids: string[]
  oems: DealCategoryRef[]
  requirement: string | null
  notes: string | null
  // TODO(backend): not yet in the Deal schema — pending Deal.location column.
  // Optional so the FE detail page can pre-wire the row; backend should add
  // this alongside the list-item field, then no FE changes are needed.
  location?: string | null
  // Close-lost metadata — present once the deal enters "Closed Lost", cleared
  // on reopen. `closed_lost_at` is server-stamped; both are null otherwise.
  closed_lost_reason?: string | null
  closed_lost_at?: string | null
  created_by: string
  // Same deletion-guard hint as `DealListItem` — see that field's comment.
  is_deletable: boolean
  // Mention → view-only access. "view" = the viewer reaches this record ONLY
  // because they were @mentioned on it (read-only; every write 404s).
  // Optional so older payloads / fixtures stay valid — absent means "edit".
  access_level?: "edit" | "view"
  // Detail only: the viewer is @mentioned in a live comment/note here — true
  // for edit users too (assignee, superadmin). Always false on list rows.
  is_mentioned?: boolean
  created_at: string
  updated_at: string
}

export interface DealStats {
  total: number
  total_value: number | string
  by_stage: Record<string, number>
}

export interface DealsListResponse {
  items: DealListItem[]
  total: number
  page: number
  page_size: number
  stats: DealStats
}

export interface FetchDealsParams {
  page?: number
  page_size?: number
  search?: string
  stage?: DealStage
  priority?: DealPriority
  /** Exact-match on the deal's source label (free text, e.g. "Website"). */
  source?: string
  tags?: DealTag[]
  /** Multi-select: returns deals owned by ANY of these user ids. */
  owner_id?: string[]
  /** Include deals with no owner (ORed with `owner_id`). Drives the Unassigned tab. */
  unassigned?: boolean
  /** Only deals the viewer sees solely because they were @mentioned (view-only). */
  mentioned_only?: boolean
  lead_id?: string
  account_id?: string
  /** Multi-select filter by Product Manager(s): returns deals whose own
   *  categories OR their attached quotes' categories overlap ANY of the
   *  selected PMs' managed category scope (resolved server-side from
   *  pm_assignments). */
  pm_user_ids?: string[]
  /** Multi-select: rows whose categories contain ANY of these IMS category ids. */
  category_ids?: string[]
  /** Multi-select: rows whose OEMs contain ANY of these IMS OEM ids. */
  oem_ids?: string[]
  /** Multi-select channel type (repeated `?channel_type=` keys). */
  channel_type?: string[]
  /** Narrow search on the deal NUMBER or TITLE only (max 100 chars). `search` is wider. */
  number_or_title?: string
  /** Won-date range (`closed_won_at`, IST days, inclusive). `YYYY-MM-DD`. */
  closed_from?: string
  closed_to?: string
  /** Created-date range (IST calendar days, inclusive). `YYYY-MM-DD`. */
  date_from?: string
  date_to?: string
  /** Quote-value range: returns deals whose latest-quote grand_total falls
   *  within [min, max] (inclusive; either bound optional). NOT the deal's own
   *  `value` — this filters on the attached latest quote. */
  min_quote_value?: number
  max_quote_value?: number
  /** Deal-value range on the row's own value field (inclusive; either bound optional). */
  min_deal_value?: number
  max_deal_value?: number
  // "deal_number" | "-deal_number" | "title" | "stage" | "value" | "created_at" | "updated_at" | "last_activity_at"
  sort?: string
}

export type FetchDealStatsParams = Omit<FetchDealsParams, "page" | "page_size">

export interface DealCreatePayload {
  title: string
  account_id: string
  contact_id: string
  lead_id?: string
  owner_id?: string
  presales_manager_id?: string
  bde_user_ids?: string[]
  // Decimal — send as string to preserve precision; backend coerces.
  value?: number | string
  expected_revenue?: number | string
  probability?: number
  estimated_closure_date?: string | null
  priority?: DealPriority
  channel_type?: DealChannelType
  tags?: DealTag[]
  // IMS category UUIDs. Omit (or pass null) to inherit from `lead_id`'s
  // category_ids when the deal is created from a lead — see DealService.create.
  category_ids?: string[]
  // IMS OEM UUIDs. Omit (or pass null) to inherit from `lead_id`'s oem_ids.
  oem_ids?: string[]
  // Backend rejects closed_won/closed_lost on create — non-terminal only.
  stage?: DealStage
  requirement?: string
  notes?: string
  // TODO(backend): pending Deal.location column. The form already sends this
  // (uppercased) so the moment backend accepts it the value will persist.
  location?: string | null
  // Lead-source label. Free text, max 100 chars.
  source?: string | null
}

export interface DealUpdatePayload {
  title?: string
  account_id?: string
  contact_id?: string
  lead_id?: string | null
  owner_id?: string | null
  presales_manager_id?: string | null
  bde_user_ids?: string[]
  value?: number | string
  expected_revenue?: number | string | null
  probability?: number
  estimated_closure_date?: string | null
  priority?: DealPriority
  channel_type?: DealChannelType | null
  tags?: DealTag[]
  // IMS category UUIDs. Send the full desired set on update (replaces).
  category_ids?: string[]
  // IMS OEM UUIDs. Send the full desired set on update (replaces).
  oem_ids?: string[]
  // Closed transitions allowed via PATCH; require crm:approve at backend.
  stage?: DealStage
  // Required by the backend when `stage` transitions into "Closed Lost";
  // rejected on any other stage. Server-stamps `closed_lost_at` alongside it.
  closed_lost_reason?: string | null
  requirement?: string | null
  notes?: string | null
  // TODO(backend): pending Deal.location column. The form already sends this
  // (uppercased) so the moment backend accepts it the value will persist.
  location?: string | null
  // Lead-source label. Free text, max 100 chars.
  source?: string | null
}

function decodeDealListItem(item: DealListItem): DealListItem {
  return { ...item, stage: dealStageFromWire(item.stage as unknown as string) }
}

function decodeDealResponse(item: DealResponse): DealResponse {
  return { ...item, stage: dealStageFromWire(item.stage as unknown as string) }
}

function decodeDealStats(stats: DealStats): DealStats {
  const remapped: Record<string, number> = {}
  for (const [key, value] of Object.entries(stats.by_stage)) {
    remapped[dealStageFromWire(key)] = value
  }
  return { ...stats, by_stage: remapped }
}

function encodeDealCreate(body: DealCreatePayload): Record<string, unknown> {
  const { stage, ...rest } = body
  return stage ? { ...rest, stage: dealStageToWire(stage) } : { ...rest }
}

function encodeDealUpdate(body: DealUpdatePayload): Record<string, unknown> {
  const { stage, ...rest } = body
  return stage ? { ...rest, stage: dealStageToWire(stage) } : { ...rest }
}

export async function fetchDeals(
  params: FetchDealsParams = {},
): Promise<DealsListResponse> {
  const response = await apiClient.get<DealsListResponse>(endpoints.crm.deals, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
      stage: dealStageToWire(params.stage),
      priority: params.priority,
      source: params.source || undefined,
      tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
      // Repeated query keys (?owner_id=a&owner_id=b) via axios indexes:null.
      owner_id:
        params.owner_id && params.owner_id.length > 0
          ? params.owner_id
          : undefined,
      unassigned: params.unassigned || undefined,
      mentioned_only: params.mentioned_only || undefined,
      lead_id: params.lead_id || undefined,
      account_id: params.account_id || undefined,
      // Repeated query keys (?pm_user_ids=a&pm_user_ids=b) — axios is
      // configured with paramsSerializer indexes:null so FastAPI reads a list.
      pm_user_ids:
        params.pm_user_ids && params.pm_user_ids.length > 0
          ? params.pm_user_ids
          : undefined,
      category_ids:
        params.category_ids && params.category_ids.length > 0
          ? params.category_ids
          : undefined,
      oem_ids:
        params.oem_ids && params.oem_ids.length > 0 ? params.oem_ids : undefined,
      channel_type:
        params.channel_type && params.channel_type.length > 0 ? params.channel_type : undefined,
      number_or_title: params.number_or_title?.trim() || undefined,
      closed_from: params.closed_from || undefined,
      closed_to: params.closed_to || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      // `?? undefined` (not `||`) so a legitimate 0 bound survives serialization.
      min_quote_value: params.min_quote_value ?? undefined,
      max_quote_value: params.max_quote_value ?? undefined,
      min_deal_value: params.min_deal_value ?? undefined,
      max_deal_value: params.max_deal_value ?? undefined,
      sort: params.sort,
    },
  })
  return {
    ...response,
    items: response.items.map(decodeDealListItem),
    stats: decodeDealStats(response.stats),
  }
}

export async function fetchDealStats(
  params: FetchDealStatsParams = {},
): Promise<DealStats> {
  const stats = await apiClient.get<DealStats>(endpoints.crm.dealStats, {
    params: {
      search: params.search?.trim() || undefined,
      stage: dealStageToWire(params.stage),
      priority: params.priority,
      source: params.source || undefined,
      tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
      // Repeated query keys (?owner_id=a&owner_id=b) via axios indexes:null.
      owner_id:
        params.owner_id && params.owner_id.length > 0
          ? params.owner_id
          : undefined,
      unassigned: params.unassigned || undefined,
      mentioned_only: params.mentioned_only || undefined,
      lead_id: params.lead_id || undefined,
      account_id: params.account_id || undefined,
      // Keep the KPI/stage counts in sync with the Product-Manager filter.
      pm_user_ids:
        params.pm_user_ids && params.pm_user_ids.length > 0
          ? params.pm_user_ids
          : undefined,
      category_ids:
        params.category_ids && params.category_ids.length > 0
          ? params.category_ids
          : undefined,
      oem_ids:
        params.oem_ids && params.oem_ids.length > 0 ? params.oem_ids : undefined,
      channel_type:
        params.channel_type && params.channel_type.length > 0 ? params.channel_type : undefined,
      // …and with the created-date range.
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      // …and with the quote-value range (0 preserved via `?? undefined`).
      min_quote_value: params.min_quote_value ?? undefined,
      max_quote_value: params.max_quote_value ?? undefined,
      min_deal_value: params.min_deal_value ?? undefined,
      max_deal_value: params.max_deal_value ?? undefined,
    },
  })
  return decodeDealStats(stats)
}

export async function fetchDeal(id: string): Promise<DealResponse> {
  const item = await apiClient.get<DealResponse>(endpoints.crm.deal(id))
  return decodeDealResponse(item)
}

// Per-deal relation counts for the detail-page tab badges. See CrmEntityStats.
export async function fetchDealEntityStats(id: string): Promise<CrmEntityStats> {
  return apiClient.get<CrmEntityStats>(endpoints.crm.dealEntityStats(id))
}

export async function createDeal(
  body: DealCreatePayload,
): Promise<DealResponse> {
  const item = await apiClient.post<DealResponse>(
    endpoints.crm.deals,
    encodeDealCreate(body),
  )
  return decodeDealResponse(item)
}

export async function updateDeal(
  id: string,
  body: DealUpdatePayload,
): Promise<DealResponse> {
  const item = await apiClient.patch<DealResponse>(
    endpoints.crm.deal(id),
    encodeDealUpdate(body),
  )
  return decodeDealResponse(item)
}

export async function deleteDeal(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.deal(id))
}

// Coerce wire `value` (Decimal as number|string) to a plain number for UI.
export function dealValueToNumber(
  value: DealListItem["value"] | DealResponse["value"] | null | undefined,
): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
