import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"

import type { CrmTag, CustomerType, Lead } from "../types"
import type { CrmEntityStats, CrmIdNameRef } from "./_shared"
import { fetchAccounts, type AccountListItem } from "./accounts"
import { fetchContacts, type ContactListItem } from "./contacts"

// ── Stage wire-format adapter ─────────────────────────────────────────────
// The running backend speaks lowercase + underscore for lead stages
// (`new`, `closed_won`, ...) while the entire FE — types, kanban columns,
// detail page, switch statements — is built around Title Case
// (`New`, `Closed Won`, ...). Translate at this single boundary so callers
// don't have to know the wire shape.
type WireStage =
  | "new"
  | "contacted"
  | "qualified"
  | "procurement"
  | "cold"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost"
  | "rejected"

const STAGE_TO_WIRE: Record<Lead["stage"], WireStage> = {
  New: "new",
  Contacted: "contacted",
  Qualified: "qualified",
  Procurement: "procurement",
  Cold: "cold",
  Proposal: "proposal",
  Negotiation: "negotiation",
  "Closed Won": "closed_won",
  "Closed Lost": "closed_lost",
  Rejected: "rejected",
}

const STAGE_FROM_WIRE: Record<WireStage, Lead["stage"]> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  procurement: "Procurement",
  cold: "Cold",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  rejected: "Rejected",
}

function stageToWire(stage: Lead["stage"] | undefined): WireStage | undefined {
  return stage ? STAGE_TO_WIRE[stage] : undefined
}

function stageFromWire(wire: string): Lead["stage"] {
  // If the backend ever flips back to Title Case, this still works because
  // values that don't match a known wire key fall through unchanged.
  return (STAGE_FROM_WIRE as Record<string, Lead["stage"]>)[wire] ?? (wire as Lead["stage"])
}

function decodeLeadItem(item: CrmLeadListItem): CrmLeadListItem {
  return { ...item, stage: stageFromWire(item.stage) }
}
export interface CrmLeadStats {
  total: number
  by_stage: Record<string, number>
}

export interface CrmLeadListItem {
  id: string
  lead_code: string
  external_id: string | null
  source: string | null
  company_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  location: string | null
  company_size: string | null
  employees: number | null
  lead_value: number | string | null
  // grand_total of this lead's latest quote (the chain head where
  // is_latest_quote = true). Backend defaults it to "0" when the lead has no
  // quote yet, so it is always present on the list response — list-only,
  // `LeadResponse` (detail) does not ship it. Decimal(18,2) → number | string.
  latest_quote_value: number | string
  estimated_close_date: string | null
  description: string | null
  stage: Lead["stage"]
  priority: Lead["priority"]
  channel_type: CustomerType | null
  tags: CrmTag[]
  categories: CrmIdNameRef[]
  oems: CrmIdNameRef[]
  bdes: CrmIdNameRef[]
  // Enriched `{id, name}` for the lead owner — list views can render the name
  // directly without a per-row /users round-trip. `null` when no owner.
  assigned_to: CrmIdNameRef | null
  presales_manager_id: string | null
  // Enriched `{id, name}` (or `null` when not rejected) so the FE can
  // render "Rejected by <name>" without a separate /users lookup.
  // `name` falls back to "(deleted)" if the user was soft-deleted after
  // rejection — mirrors the backend `IdNameRef` contract for this field.
  rejected_by: CrmIdNameRef | null
  rejection_reason: string | null
  rejected_at: string | null
  // Close-lost metadata — present once the lead enters "Closed Lost", cleared
  // on reopen. `closed_lost_at` is server-stamped; both are null otherwise.
  // Optional because the list endpoint may omit them on non-lost rows.
  closed_lost_reason?: string | null
  closed_lost_at?: string | null
  notes: Record<string, unknown>
  // Mention → view-only access. "view" = the viewer reaches this record ONLY
  // because they were @mentioned on it (read-only; every write 404s).
  // Optional so older payloads / fixtures stay valid — absent means "edit".
  access_level?: "edit" | "view"
  // The viewer is @mentioned in a live comment/note here — true for edit users
  // too (assignee, superadmin). Filled on detail and list rows.
  is_mentioned?: boolean
  created_at: string
  updated_at: string
}

export interface FetchLeadsParams {
  page?: number
  page_size?: number
  search?: string
  stage?: Lead["stage"]
  priority?: Lead["priority"]
  /** Exact-match on the lead's source label (free text, e.g. "Website"). */
  source?: string
  tags?: CrmTag[]
  /** Multi-select: returns leads assigned to ANY of these user ids. */
  assigned_to?: string[]
  /** Multi-select filter by Product Manager(s): returns leads whose own
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
  /** Include leads with no assignee (ORed with `assigned_to`). Drives the Unassigned tab. */
  unassigned?: boolean
  /** Only leads the viewer sees solely because they were @mentioned (view-only). */
  mentioned_only?: boolean
  /** Created-date range (IST calendar days, both bounds inclusive). Send as
   *  `YYYY-MM-DD` via `toDateParam` — NOT `toISOString()`. */
  date_from?: string
  date_to?: string
  /** Rejected-date range (same IST-day semantics as the created range). Used by
   *  the Rejected Leads list. */
  rejected_from?: string
  rejected_to?: string
  /** Rejected-list only: leads rejected by ANY of these user ids. */
  rejected_by?: string[]
  /** Rejected-list only: leads whose stored reason starts with ANY of these
   *  presets (the stored text is `preset` or `preset — notes`). */
  rejection_reasons?: string[]
  /** Quote-value range: returns leads whose latest-quote grand_total falls
   *  within [min, max] (inclusive; either bound optional). NOT the lead's own
   *  `lead_value` — this filters on the attached latest quote. */
  min_quote_value?: number
  max_quote_value?: number
  /** Deal-value range on the row's own value field (inclusive; either bound optional). */
  min_deal_value?: number
  max_deal_value?: number
}

// GET /crm/leads/stats accepts the same visibility + filter knobs as the list
// endpoint, but never paginates. The page passes whatever filters are active
// (minus `stage` — the cards are the per-stage breakdown, so filtering by one
// stage would zero out every other card).
export type FetchLeadStatsParams = Omit<FetchLeadsParams, "page" | "page_size">

export interface CrmLeadsListResponse {
  items: CrmLeadListItem[]
  total: number
  page: number
  page_size: number
  stats: CrmLeadStats
}

export interface CrmLeadUpsertPayload {
  // Optional because this payload doubles as a partial PATCH body (e.g. the
  // move-stage mutation sends only `{ stage }`). Create-time requiredness is
  // enforced by the Zod schema, not this type.
  description?: string
  company_name?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  estimated_close_date?: string | null
  website?: string | null
  location?: string | null
  company_size?: string | null
  employees?: number | null
  lead_value?: number | null
  priority?: Lead["priority"]
  stage?: Lead["stage"]
  channel_type?: CustomerType | null
  tags?: CrmTag[]
  category_ids?: string[]
  oem_ids?: string[]
  bde_user_ids?: string[]
  assigned_to?: string | null
  presales_manager_id?: string | null
  notes?: Record<string, unknown>
  // Required by the backend when `stage` transitions into "Closed Lost";
  // rejected on any other stage. Server-stamps `closed_lost_at` alongside it.
  closed_lost_reason?: string | null
}

export async function fetchLeads(params: FetchLeadsParams = {}): Promise<CrmLeadsListResponse> {
  const response = await apiClient.get<CrmLeadsListResponse>(endpoints.crm.leads, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search || undefined,
      stage: stageToWire(params.stage),
      priority: params.priority,
      source: params.source || undefined,
      tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
      // Repeated query keys (?assigned_to=a&assigned_to=b) — axios is
      // configured with paramsSerializer indexes:null so FastAPI reads a list.
      assigned_to:
        params.assigned_to && params.assigned_to.length > 0
          ? params.assigned_to
          : undefined,
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
      unassigned: params.unassigned || undefined,
      mentioned_only: params.mentioned_only || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      rejected_from: params.rejected_from || undefined,
      rejected_to: params.rejected_to || undefined,
      rejected_by:
        params.rejected_by && params.rejected_by.length > 0 ? params.rejected_by : undefined,
      rejection_reasons:
        params.rejection_reasons && params.rejection_reasons.length > 0
          ? params.rejection_reasons
          : undefined,
      // `?? undefined` (not `||`) so a legitimate 0 bound survives serialization.
      min_quote_value: params.min_quote_value ?? undefined,
      max_quote_value: params.max_quote_value ?? undefined,
      min_deal_value: params.min_deal_value ?? undefined,
      max_deal_value: params.max_deal_value ?? undefined,
    },
  })
  return {
    ...response,
    items: response.items.map(decodeLeadItem),
    stats: decodeStats(response.stats),
  }
}

function decodeStats(stats: CrmLeadStats): CrmLeadStats {
  // Re-key by_stage from wire labels back to Title Case so consumers can
  // index it with the same stage strings they use in the UI.
  const remapped: Record<string, number> = {}
  for (const [key, value] of Object.entries(stats.by_stage)) {
    remapped[stageFromWire(key)] = value
  }
  return { ...stats, by_stage: remapped }
}

export async function fetchLeadStats(
  params: FetchLeadStatsParams = {},
): Promise<CrmLeadStats> {
  const stats = await apiClient.get<CrmLeadStats>(endpoints.crm.leadStats, {
    params: {
      search: params.search || undefined,
      stage: stageToWire(params.stage),
      priority: params.priority,
      source: params.source || undefined,
      tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
      // Keep stats in sync with the Assigned-To filter (repeated query keys).
      assigned_to:
        params.assigned_to && params.assigned_to.length > 0
          ? params.assigned_to
          : undefined,
      // Keep stats in sync with the Product-Manager filter too.
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
      unassigned: params.unassigned || undefined,
      mentioned_only: params.mentioned_only || undefined,
      // …and with the created-date range, so the KPI/stage counts narrow
      // alongside the board (otherwise the cards show unfiltered totals).
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      // …and with the quote-value range (0 preserved via `?? undefined`).
      min_quote_value: params.min_quote_value ?? undefined,
      max_quote_value: params.max_quote_value ?? undefined,
      min_deal_value: params.min_deal_value ?? undefined,
      max_deal_value: params.max_deal_value ?? undefined,
    },
  })
  return decodeStats(stats)
}

export async function fetchLead(id: string): Promise<CrmLeadListItem> {
  const item = await apiClient.get<CrmLeadListItem>(endpoints.crm.lead(id))
  return decodeLeadItem(item)
}

// Per-lead relation counts for the detail-page tab badges. See CrmEntityStats.
export async function fetchLeadEntityStats(id: string): Promise<CrmEntityStats> {
  return apiClient.get<CrmEntityStats>(endpoints.crm.leadEntityStats(id))
}

function normalizeLeadDuplicateValue(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase()
}

export interface LeadDuplicateCheckResult {
  account?: AccountListItem
  contact?: ContactListItem
}

export async function checkLeadDuplicates({
  companyName,
  email,
}: {
  companyName?: string | null
  email?: string | null
}): Promise<LeadDuplicateCheckResult> {
  const normalizedCompany = normalizeLeadDuplicateValue(companyName)
  const normalizedEmail = normalizeLeadDuplicateValue(email)

  const [accountResponse, contactResponse] = await Promise.all([
    normalizedCompany
      ? // Only an APPROVED account counts as a name clash — a Pending/Rejected
        // account with the same name is not treated as an existing duplicate.
        fetchAccounts({
          search: normalizedCompany,
          page: 1,
          page_size: 1,
          approval_statuses: ["Approved"],
        })
      : Promise.resolve(null),
    normalizedEmail
      ? fetchContacts({
          search: normalizedEmail,
          page: 1,
          page_size: 1,
          has_email: true,
        })
      : Promise.resolve(null),
  ])

  return {
    account: accountResponse?.items.find(
      (account) => normalizeLeadDuplicateValue(account.name) === normalizedCompany,
    ),
    contact: contactResponse?.items.find(
      (contact) => normalizeLeadDuplicateValue(contact.email) === normalizedEmail,
    ),
  }
}

function encodeUpsertBody(body: CrmLeadUpsertPayload): CrmLeadUpsertPayload {
  if (!body.stage) return body
  // Cast: the wire stage is a string in transit, but the request type is
  // declared in Title Case to keep the public API ergonomic.
  return { ...body, stage: stageToWire(body.stage) as unknown as Lead["stage"] }
}

export async function createLead(body: CrmLeadUpsertPayload): Promise<CrmLeadListItem> {
  const item = await apiClient.post<CrmLeadListItem>(endpoints.crm.leads, encodeUpsertBody(body))
  return decodeLeadItem(item)
}

export async function updateLead(id: string, body: CrmLeadUpsertPayload): Promise<CrmLeadListItem> {
  const item = await apiClient.patch<CrmLeadListItem>(endpoints.crm.lead(id), encodeUpsertBody(body))
  return decodeLeadItem(item)
}

export interface CrmLeadRejectPayload {
  rejection_reason: string
}

export async function rejectLead(
  id: string,
  body: CrmLeadRejectPayload,
): Promise<CrmLeadListItem> {
  const item = await apiClient.post<CrmLeadListItem>(endpoints.crm.leadReject(id), {
    stage: stageToWire("Rejected"),
    rejection_reason: body.rejection_reason,
  })
  return decodeLeadItem(item)
}

export async function deleteLead(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.lead(id))
}

function toNumber(value: number | string | null): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function getLeadNotesSummary(notes: Record<string, unknown>): string | undefined {
  const directSummary = notes.summary
  if (typeof directSummary === "string" && directSummary.trim()) {
    return directSummary.trim()
  }

  const text = notes.text
  if (typeof text === "string" && text.trim()) {
    return text.trim()
  }

  return undefined
}


export function mapCrmLead(item: CrmLeadListItem): Lead {
  const primaryBde = item.bdes[0]?.name
  const ownerName = item.assigned_to?.name ?? "Unassigned"

  return {
    id: item.id,
    leadCode: item.lead_code,
    name: item.contact_name?.trim() || "-",
    company: item.company_name?.trim() || "-",
    hasContactName: Boolean(item.contact_name?.trim()),
    hasCompanyName: Boolean(item.company_name?.trim()),
    email: item.email ?? "",
    phone: item.phone ?? "",
    stage: item.stage,
    value: toNumber(item.lead_value),
    latestQuoteValue: toNumber(item.latest_quote_value),
    source: item.source?.trim() || "Unknown",
    closureDate: item.estimated_close_date ?? undefined,
    owner: ownerName,
    bde: primaryBde ?? "Unassigned",
    assignedTo: ownerName,
    assignedToId: item.assigned_to?.id ?? undefined,
    presalesManager: undefined,
    priority: item.priority,
    companySize: item.company_size ?? undefined,
    employees: item.employees ?? undefined,
    location: item.location ?? undefined,
    website: item.website ?? undefined,
    customerType: item.channel_type ?? undefined,
    tags: item.tags ?? [],
    lastContact: item.updated_at,
    createdAt: item.created_at,
    notes: getLeadNotesSummary(item.notes),
    description: item.description ?? "",
    categories: item.categories.map((category) => category.name),
    oems: item.oems.map((oem) => oem.name),
    rejectedAt: item.rejected_at ?? undefined,
    rejectedBy: item.rejected_by?.name ?? undefined,
    rejectionReason: item.rejection_reason ?? undefined,
    closedLostReason: item.closed_lost_reason ?? undefined,
    accessLevel: item.access_level ?? "edit",
    isMentioned: item.is_mentioned ?? false,
  }
}
