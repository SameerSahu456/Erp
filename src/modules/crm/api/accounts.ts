import { apiClient, compactParams, http } from "@/shared/api/client";
import { ApiError } from "@/shared/api/envelope";
import { endpoints } from "@/shared/api/endpoints";
import type { PageResponse } from "@/shared/api/pagination";
import type { components } from "@/shared/api/schema.gen";
import { PAGINATION } from "@/shared/constants";
import { withInferredMime } from "@shared/lib/file-mime";

import type { CrmIdNameRef } from "./_shared";
import type { ContactStatus } from "./contacts";

// ─── Accounts ────────────────────────────────────────────────────────────
// Wire types mirror app/modules/crm/schemas/account.py (verified 2026-05-04).
// All status/tag/type values are Capitalized on the wire — no casing adapter.

export type AccountStatus = "Active" | "Inactive";
export type AccountTagWire = "Hunting" | "Farming" | "Cold";
// Account-creation approval lifecycle. The backend will return this on the
// account response once the approval workflow lands; it is optional/nullable
// until then. The detail page reads it to show a pending banner / status pill —
// no mock data, purely driven by this field.
export type AccountApprovalStatus = "Pending" | "Approved" | "Rejected";
// 2026-05-19 enum shift: `account_type` now describes the channel
// relationship. The old segmentation values moved to `company_size`. Backend
// backfilled every existing row to "End Customer" — see Fields_changes.md §2.
// 2026-05-25: the "Channel" value renamed to "Cloud / Data Center" (spaces
// around the slash, matching the leads/deals/role-channel-tag enum). Backend
// migration `crm_acct_cloud_dc_001` backfills existing rows.
export type AccountTypeWire =
  "End Customer" | "Channel Partner" | "Cloud / Data Center" | "End User";
// 2026-05-19: `company_size` is now a typed enum (was free text). Backend
// hard-validates against this exact set.
export type CompanySizeWire =
  "Startup" | "SMB" | "Mid-Market" | "Large Enterprise";
export type AddressType = "Billing" | "Shipping" | "Both";
export type AddressStatus = "Active" | "Inactive";

export const ACCOUNT_STATUSES: readonly AccountStatus[] = [
  "Active",
  "Inactive",
] as const;

export const ACCOUNT_TAGS: readonly AccountTagWire[] = [
  "Hunting",
  "Farming",
  "Cold",
] as const;

export const ACCOUNT_TYPE_VALUES: readonly AccountTypeWire[] = [
  "Cloud / Data Center",
  "Channel Partner",
  "End Customer",
  "End User",
] as const;

// Industry stays free-text on the backend; we surface a hint list so the
// form Select isn't blank. Saved values that aren't in this list are
// merged in at render time on the form page so they still display.
export const INDUSTRY_OPTIONS: readonly string[] = [
  "IT Services",
  "Manufacturing",
  "Banking",
  "Telecom",
  "Retail",
  "Healthcare",
  "Education",
  "Media",
  "Shipping & Logistics",
  "Oil & Gas",
  "Insurance",
  "Electricity & power",
  "Hospitality",
  "Infrastructure & Urban",
  "Atomic & research",
  "Real Estate",
  "PSU & government",
] as const;

export const COMPANY_SIZE_OPTIONS: readonly CompanySizeWire[] = [
  "Startup",
  "SMB",
  "Mid-Market",
  "Large Enterprise",
] as const;

export interface AccountAddressWire {
  id: string;
  account_id: string | null;
  address_type: AddressType;
  status: AddressStatus;
  is_default: boolean;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  /** GSTIN registered at this location; null = the account's applies. */
  gstin?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Viewer's access-request status for an account, mirrored from the backend
// `AccessRequestStatus` literal. `null` (on the account types) means the
// viewer never raised a request for that account.
export type AccessRequestStatusWire = "Pending" | "Approved" | "Rejected";

// Record from GET /accounts list. Includes sales-facing category JSONB
// arrays and an enriched owner embed so the FE can render the list view
// without a follow-up call per row. See AccountListItem in
// schemas/account.py (2026-05-27 enhancement).
export interface AccountListItem {
  id: string;
  code: string;
  name: string;
  industry: string | null;
  account_type: AccountTypeWire;
  // Decimal(18,2) — backend may serialize as string. Keep both shapes.
  revenue: number | string | null;
  status: AccountStatus;
  // KYC approval state — surfaced as an "Approval" column on the list.
  approval_status: AccountApprovalStatus;
  // 2026-05-27: tag is now nullable on the backend (sales can leave it
  // blank at create time and classify later via PATCH).
  tag: AccountTagWire | null;
  website: string | null;
  // 2026-05-19: 12-digit Aadhaar (optional). Validated server-side.
  aadhaar_number: string | null;
  parent_account_id: string | null;
  // True when this account has ≥ 1 live child account. Drives the FE's
  // 2-level policy (e.g. "linking this also moves its sub-accounts").
  has_children: boolean;
  // Backend returns `CategoryEmbed = {id, name}` on responses (categories are
  // derived from deals/SOs and carry the IMS category id). Write paths still
  // accept bare-name `string[]` — see CreateAccountRequest below.
  categories_interested: CrmIdNameRef[];
  categories_bought: CrmIdNameRef[];
  // Backend embeds `{id, name}` per live owner so the FE doesn't round-trip
  // /users for each label. Soft-deleted owners drop out — `name` falls
  // back to "(deleted)" if a user was soft-deleted after assignment.
  account_owners: CrmIdNameRef[]
  primary_owner_id: string | null
  // Who approved the account (KYC); null until an approver acts.
  approval_by?: CrmIdNameRef | null
  // Backend-computed: `false` when the viewer already has a Pending/Approved
  // access request for this account. Drives whether the "Request Access" cell
  // renders (combined with the owner check). Defaults true on the backend.
  can_request_access: boolean;
  // Backend-computed: the viewer's most-recent access-request status for this
  // account, or `null` if they never requested. Drives the per-row status pill.
  access_request_status: AccessRequestStatusWire | null;
  created_at: string;
  updated_at: string;
  /** Rentals › Accounts only (`has_rentals`): when the account's earliest
   *  live rental sales order was created. `null` elsewhere. */
  first_rental_order_at?: string | null;
  /** Rentals › Accounts only (`has_rentals`): live rental sales orders of
   *  any status, closed and terminated included. `null` elsewhere. */
  rental_order_count?: number | null;
}

// Full shape from GET /accounts/{id}, POST /accounts, PATCH /accounts/{id}.
// AccountResponse in schemas/account.py.
export interface AccountResponse {
  id: string;
  code: string;
  name: string;
  industry: string | null;
  account_type: AccountTypeWire;
  revenue: number | string | null;
  status: AccountStatus;
  // 2026-06-16: account-creation approval state + decision metadata. Drives the
  // detail-page banner + status pill. `approval_by` is an embedded `{id, name}`
  // (the decider) so the banner can render "Approved/Rejected by {name}" without
  // a /users round-trip; `approval_at` / `approval_reason` are the when + why.
  approval_status: AccountApprovalStatus;
  approval_by: CrmIdNameRef | null;
  approval_at: string | null;
  approval_reason: string | null;
  // 2026-05-27: nullable — see AccountListItem.tag for rationale.
  tag: AccountTagWire | null;
  website: string | null;
  company_size: CompanySizeWire | null;
  employees: number | null;
  // 2026-05-19: 12-digit Aadhaar (optional). Backend returns raw value.
  aadhaar_number: string | null;
  // Tax / compliance identifiers — backend regex-validates both.
  // PAN: ^[A-Z]{5}[0-9]{4}[A-Z]{1}$ (e.g. ABCDE1234F)
  // GST: ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$ (e.g. 27ABCDE1234F1Z5)
  pan_number: string | null;
  gst_number: string | null;
  parent_account_id: string | null;
  // True when this account has ≥ 1 live child account (2-level policy).
  has_children: boolean;
  // Backend returns `CategoryEmbed = {id, name}` on responses (categories are
  // derived from deals/SOs and carry the IMS category id). Write paths still
  // accept bare-name `string[]` — see CreateAccountRequest below.
  categories_interested: CrmIdNameRef[];
  categories_bought: CrmIdNameRef[];
  created_by: string;
  // Backend embeds `{id, name}` per owner so the FE doesn't round-trip to
  // /users for each label. Field name is unchanged for wire-compat with the
  // existing AccountResponse contract — see UserEmbed in schemas/account.py.
  account_owner_ids: CrmIdNameRef[];
  primary_owner_id: string | null;
  default_billing_address: AccountAddressWire | null;
  default_shipping_address: AccountAddressWire | null;
  // Embedded contact summaries (link rows) — returned on create + GET.
  contacts: AccountInlineContactSummary[];
  // Viewer's access state for this account (same semantics as on
  // AccountListItem): whether they may raise a request, and their most-recent
  // request status ("Pending" | "Approved" | "Rejected" | null).
  can_request_access: boolean;
  access_request_status: AccessRequestStatusWire | null;
  created_at: string;
  updated_at: string;
}

export interface AccountsListResponse {
  items: AccountListItem[];
  total: number;
  page: number;
  page_size: number;
}

// Account hierarchy-role filter (GET /accounts?hierarchy_role=…):
//   "parent" → root account (no parent_account_id)
//   "child"  → non-root account (has a parent_account_id)
export const ACCOUNT_HIERARCHY_ROLES = ["parent", "child"] as const;
export type AccountHierarchyRole = (typeof ACCOUNT_HIERARCHY_ROLES)[number];

// Access filter (GET /accounts?access=…) — the Access column as a filter:
//   "has"  → accounts the caller can already open (owner / team / deal /
//            approved access / channel / admin)
//   "none" → accounts they would have to request access to (a pending or
//            rejected request still counts as no access)
export const ACCOUNT_ACCESS_FILTERS = ["has", "none"] as const;
export type AccountAccessFilter = (typeof ACCOUNT_ACCESS_FILTERS)[number];

export interface FetchAccountsParams {
  page?: number
  page_size?: number
  search?: string
  status?: AccountStatus
  tag?: AccountTagWire
  // Single value or array — repeated `?account_type=` keys (axios indexes:null).
  account_type?: AccountTypeWire | AccountTypeWire[]
  // 2026-05-19: company_size is now a typed enum + filterable.
  company_size?: CompanySizeWire;
  industry?: string;
  parent_account_id?: string;
  /** Multi-select owner filter — accounts where ANY of these users is a live
   *  owner. Serialized as repeated `?owner_ids=…` keys (paramsSerializer
   *  `indexes: null`) so FastAPI reads a list. */
  owner_ids?: string[]
  /** Multi-select "approved by" filter — accounts approved by ANY of these
   *  users. Serialized as repeated `?approved_by=…` keys. */
  approved_by?: string[]
  /** Hierarchy-role filter: `"parent"` = root accounts (no parent),
   *  `"child"` = non-root accounts (have a parent). */
  hierarchy_role?: AccountHierarchyRole;
  /** Access filter: `"has"` = accounts the caller can already open, `"none"` =
   *  accounts they'd have to request. Omit for no filter. */
  access?: AccountAccessFilter;
  /** Multi-select KYC approval filter. Serialized as repeated
   *  `?approval_statuses=…` keys (paramsSerializer `indexes: null`) so FastAPI
   *  reads a list. Omit to inherit the backend default (Approved + Rejected;
   *  Pending is hidden — use /accounts/pending-approvals for that queue). */
  approval_statuses?: AccountApprovalStatus[];
  /** Created-date range (IST calendar days, inclusive). `YYYY-MM-DD`. */
  date_from?: string;
  date_to?: string;
  // Cycle-safe candidate filters (server-side, recursive-CTE). Mutually the
  // inverse of each other — pass at most one:
  //  - eligible_parent_for=<A>: accounts that may become A's parent (excludes
  //    A and its whole subtree — a descendant can't be the parent).
  //  - eligible_child_for=<A>: accounts that may become A's child (excludes A
  //    and its ancestor chain — an ancestor can't be a child).
  // Use these to populate the parent/child pickers so the cycle 400 can't fire.
  eligible_parent_for?: string;
  eligible_child_for?: string;
  // "name" | "-name" | "created_at" | "-created_at" | …
  sort?: string;
  /** Narrow to accounts with rental involvement — a rental sales order in
   *  any state, or rental billing defaults set. Under it, `date_from` /
   *  `date_to` filter on the FIRST rental order's creation date. */
  has_rentals?: boolean;
}

/** One option of the accounts list's Owner filter
 *  (GET /crm/accounts/owner-options): a user who owns a listed account. */
export interface AccountOwnerOption {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  is_active: boolean;
}

export type AccountOwnerOptionsResponse = PageResponse<AccountOwnerOption>;

export interface FetchAccountOwnerOptionsParams {
  page?: number;
  page_size?: number;
  search?: string;
  has_rentals?: boolean;
}

export async function fetchAccountOwnerOptions(
  params: FetchAccountOwnerOptionsParams = {},
): Promise<AccountOwnerOptionsResponse> {
  return apiClient.get<AccountOwnerOptionsResponse>(
    endpoints.crm.accountOwnerOptions,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        search: params.search?.trim() || undefined,
        has_rentals: params.has_rentals ? true : undefined,
      },
    },
  );
}

export interface AddressUpsertPayload {
  address_type: AddressType;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  label?: string | null;
  line2?: string | null;
  status?: AddressStatus;
  is_default?: boolean;
  gstin?: string | null;
}

// ── Inline contacts on AccountCreate (create-only) ──────────────────────
// Discriminated by presence of `contact_id`: link an existing contact, or
// create a brand-new one inline. Mirrors ContactInline in schemas/account.py.
export interface ContactLinkRefPayload {
  contact_id: string;
  is_primary?: boolean;
}
export interface ContactCreateInlinePayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  designation?: string | null;
  department?: string | null;
  status?: ContactStatus;
  is_primary?: boolean;
}
export type AccountInlineContactPayload =
  ContactLinkRefPayload | ContactCreateInlinePayload;

// Embedded contact summary returned on POST /accounts and GET /accounts/{id}.
export interface AccountInlineContactSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  is_primary: boolean;
}

export interface AccountUpsertPayload {
  // Required on Create only — backend rejects empty name on either path.
  name?: string;
  account_type?: AccountTypeWire;
  status?: AccountStatus;
  tag?: AccountTagWire;
  industry?: string | null;
  revenue?: number | string | null;
  website?: string | null;
  company_size?: CompanySizeWire | null;
  employees?: number | null;
  // 2026-05-19: 12-digit Aadhaar (optional). Regex `^[0-9]{12}$` server-side.
  aadhaar_number?: string | null;
  // Tax / compliance identifiers — backend regex-validates both (PAN 10 chars,
  // GST 15 chars). Sent uppercased.
  pan_number?: string | null;
  gst_number?: string | null;
  parent_account_id?: string | null;
  // Create-only: "Create new parent account" — the new (Pending) account adopts
  // this existing account (and flattens its sub-accounts) as its child.
  adopt_child_account_id?: string | null;
  categories_interested?: string[];
  categories_bought?: string[];
  account_owner_ids?: string[];
  primary_owner_id?: string | null;
  // Create-only. Backend rejects on PATCH.
  addresses?: AddressUpsertPayload[];
  // Create-only. Backend rejects on PATCH. Link existing contacts and/or
  // create new ones in the same atomic POST /accounts call.
  contacts?: AccountInlineContactPayload[];
}

// 2026-05-19: Optional KYC document files accepted alongside the create
// payload as multipart fields. Each file ≤ 20 MB, PDF / JPEG / PNG only.
// See Fields_changes.md §1.
export interface CreateAccountFiles {
  account_doc_pan_card?: File;
  account_doc_gst_certificate?: File;
  account_doc_aadhaar?: File;
  account_doc_msme?: File;
  account_doc_bank_statement?: File;
}

export interface AccountOwnerWire {
  id: string;
  user_id: string;
  user_name: string;
  is_primary: boolean;
}

export interface AccountOwnerAddPayload {
  user_id: string;
  is_primary?: boolean;
}

export async function fetchAccounts(
  params: FetchAccountsParams = {},
): Promise<AccountsListResponse> {
  // `compactParams` drops empty values and empty arrays (arrays go out as
  // repeated keys — axios indexes:null).
  return apiClient.get<AccountsListResponse>(endpoints.crm.accounts, {
    params: compactParams({
      ...params,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim(),
      // Omitted rather than sent as `false`, so the default listing's URL
      // (and its cache key) is unchanged for callers that don't ask for
      // the rentals scope; `false` here means "no filter".
      has_rentals: params.has_rentals || undefined,
    }),
  });
}

// Tab-badge counts for the account detail page (schema `AccountStatsResponse`).
// The parent visibility guard runs first, so a viewer who can't see the
// account gets a 403/404 rather than zeros.
export interface AccountStats {
  addresses: number
  contacts: number
  deals: number
  quotes: number
  sales_orders: number
  notes: number
}

export async function fetchAccountStats(id: string): Promise<AccountStats> {
  return apiClient.get<AccountStats>(endpoints.crm.accountStats(id))
}

// ─── Account 360° KPI strip ──────────────────────────────────────────────
// Backs the KPI strip at the top of the Account 360° tab. Presets are
// calendar-current (WTD / MTD / QTD / YTD); `custom` takes caller-supplied
// `start` / `end` so the tile tracks the toolbar's date-range picker.
// Narrows by the same Category / OEM facets the widgets below use — one
// endpoint per account, one query per tab.

export type AccountKpisResponse = components["schemas"]["AccountKpisResponse"];
export type AccountKpisPeriodType =
  "weekly" | "monthly" | "quarterly" | "yearly" | "custom";

export interface AccountKpisParams {
  period: AccountKpisPeriodType;
  /** Required (and only meaningful) when `period === "custom"`. ISO `YYYY-MM-DD`. */
  start?: string;
  end?: string;
  category_ids?: string[];
  oem_ids?: string[];
  /** Same facets the dashboard sends. `conditions` narrows every tile;
   *  `months` (`YYYY-MM`) narrows the Period tile only. */
  conditions?: string[];
  months?: string[];
  /** Contract-parity with the dashboard endpoints — every widget on the 360°
   *  tab sends the same flag so the params objects on that tab are one
   *  shape. Currently a no-op on the backend for this endpoint (it is
   *  already path-scoped to one account and applies no visibility lanes),
   *  but the field is accepted so the FE contract stays uniform. */
  bypass_visibility?: boolean;
}

export async function fetchAccountKpis(
  id: string,
  params: AccountKpisParams,
): Promise<AccountKpisResponse> {
  // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
  return apiClient.get<AccountKpisResponse>(endpoints.crm.accountKpis(id), {
    params: {
      period: params.period,
      // Only send `start`/`end` for custom — the backend ignores them for
      // presets, but omitting them keeps the URL clean.
      start: params.period === "custom" ? params.start : undefined,
      end: params.period === "custom" ? params.end : undefined,
      category_ids: params.category_ids?.length
        ? params.category_ids
        : undefined,
      oem_ids: params.oem_ids?.length ? params.oem_ids : undefined,
      conditions: params.conditions?.length ? params.conditions : undefined,
      months: params.months?.length ? params.months : undefined,
      bypass_visibility: params.bypass_visibility,
    },
  });
}

export async function fetchAccount(
  id: string,
  opts?: { bypassAccess?: boolean },
): Promise<AccountResponse> {
  // `bypass_access=true` tells the backend to skip the per-record `_can_view`
  // gate on GET /accounts/{id} (which otherwise 403s ACCOUNT_ACCESS_DENIED).
  // Used ONLY by create/prefill flows that need the account's details to seed
  // a new Deal / Sales Order / etc. even when the operator lacks per-record
  // access — never by the account detail page (that keeps the access-request
  // UX). Only sent when explicitly requested.
  return apiClient.get<AccountResponse>(endpoints.crm.account(id), {
    params: opts?.bypassAccess ? { bypass_access: true } : undefined,
  });
}

// 2026-05-19: POST /accounts is now multipart/form-data. The full account
// payload travels as a JSON-string `data` field; up to 5 optional KYC files
// travel as named file fields. Bypass apiClient.post so axios builds the
// boundary instead of leaking the default JSON Content-Type. Pattern mirrors
// uploadAttachment() in modules/attachments/api.ts.
export async function createAccount(
  body: AccountUpsertPayload,
  files?: CreateAccountFiles,
): Promise<AccountResponse> {
  const form = new FormData();
  form.append("data", JSON.stringify(body));
  if (files) {
    for (const [field, file] of Object.entries(files) as [
      keyof CreateAccountFiles,
      File | undefined,
    ][]) {
      if (file) form.append(field, withInferredMime(file), file.name);
    }
  }
  const response = await http.post<AccountResponse>(
    endpoints.crm.accounts,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
}

export async function updateAccount(
  id: string,
  body: AccountUpsertPayload,
): Promise<AccountResponse> {
  // Backend rejects `addresses` on PATCH (extra='forbid'). Strip defensively.
  const rest = { ...body };
  delete rest.addresses;
  delete rest.contacts;
  return apiClient.patch<AccountResponse>(endpoints.crm.account(id), rest);
}

export async function deleteAccount(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.account(id));
}

// ── Parent ⇄ child hierarchy (bulk) ─────────────────────────────────────
// Slim row returned per child by PATCH /accounts/parent-child-relationships
// (AccountParentChildAssignItem in schemas/account.py), in request order.
export interface AccountParentChildAssignItem {
  id: string;
  account_name: string;
  status: AccountStatus;
  account_type: AccountTypeWire;
}

// Bulk-assign `parentId` as the parent_account_id of every account in
// `childIds`. All-or-nothing: a single failed child (missing, not visible,
// cycle, depth exceeded) rolls back the whole batch with a 4xx. Cycle/depth
// guards are enforced server-side (ACCOUNT_HIERARCHY_CYCLE /
// ACCOUNT_DEPTH_EXCEEDED). This is the single hierarchy-assignment path for
// both "Add Child" and "Add Parent" — the latter inverts the direction by
// passing the picked account as parent and this account as the lone child.
export async function assignParentToChildren(
  parentId: string,
  childIds: string[],
): Promise<AccountParentChildAssignItem[]> {
  return apiClient.patch<AccountParentChildAssignItem[]>(
    endpoints.crm.accountParentChild,
    { parent_id: parentId, child_ids: childIds },
  );
}

// Flatten an account's subtree up one level: move `accountId` AND all its live
// descendants under `newParentId` in a single backend transaction. Used when a
// parent is set on an account that already has children — the children can't
// stay (a child can't keep its own children under the 2-level policy), so they
// ride up to the same new parent. Cycle/depth still enforced server-side.
export async function reparentWithChildren(
  accountId: string,
  newParentId: string,
): Promise<AccountParentChildAssignItem[]> {
  return apiClient.patch<AccountParentChildAssignItem[]>(
    endpoints.crm.accountReparentWithChildren(accountId),
    { new_parent_id: newParentId },
  );
}

// ── Account approval ────────────────────────────────────────────────────

// Slim row for the Approvals tab — GET /crm/accounts/pending-approvals.
// `created_by` is an embedded {id, name} (the submitter) so the table renders
// "Submitted By" without a /users round-trip. Root accounts only.
export interface PendingApprovalListItem {
  id: string;
  code: string;
  name: string;
  account_type: AccountTypeWire;
  industry: string | null;
  gst_number: string | null;
  pan_number: string | null;
  parent_account_id: string | null;
  created_by: CrmIdNameRef;
  created_at: string;
}

export interface AccountPendingApprovalListResponse {
  items: PendingApprovalListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface FetchPendingApprovalsParams {
  page?: number;
  page_size?: number;
  // Case-insensitive search over account name + code (mirrors the list).
  search?: string;
  industry?: string;
  account_type?: AccountTypeWire;
}

export async function fetchPendingApprovals(
  params: FetchPendingApprovalsParams = {},
): Promise<AccountPendingApprovalListResponse> {
  return apiClient.get<AccountPendingApprovalListResponse>(
    endpoints.crm.accountsPendingApprovals,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        search: params.search?.trim() || undefined,
        industry: params.industry || undefined,
        account_type: params.account_type,
      },
    },
  );
}

export async function approveAccount(
  id: string,
  reason?: string,
): Promise<AccountResponse> {
  return apiClient.post<AccountResponse>(endpoints.crm.accountApprove(id), {
    reason: reason?.trim() ? reason.trim() : null,
  });
}

export async function rejectAccount(
  id: string,
  reason: string,
): Promise<AccountResponse> {
  return apiClient.post<AccountResponse>(endpoints.crm.accountReject(id), {
    reason,
  });
}

// ── Account access requests ─────────────────────────────────────────────
// A non-owner requests access to view an account; an approver
// (crm:account_approve) decides on the pending queue. Mirrors the backend
// `AccountAccessRequestResponse` schema.

export type AccountAccessStatus = "Pending" | "Approved" | "Rejected";

export interface AccountAccessRequest {
  id: string;
  status: AccountAccessStatus;
  requested_at: string;
  // `account_type` is the channel relationship (End Customer / Channel Partner
  // / Cloud / Data Center) so the access queue can show the account's type.
  account: CrmIdNameRef & { account_type: AccountTypeWire }
  // `roles` = the requester's system role names (same list `/users` returns).
  requested_by: CrmIdNameRef & { roles?: string[] }
  // The requester's justification (required at raise time).
  requested_notes: string;
  reviewed_by: CrmIdNameRef | null;
  reviewed_at: string | null;
  // The approver's decision note (set on approve/reject).
  notes: string | null;
}

export interface AccountAccessRequestListResponse {
  items: AccountAccessRequest[];
  total: number;
  page: number;
  page_size: number;
}

export interface FetchAccessRequestsParams {
  status?: AccountAccessStatus;
  account_id?: string;
  // Explicit account channel-type filter (narrows the caller's channel scope).
  account_type?: AccountTypeWire;
  // Case-insensitive search over the request's account name + code.
  search?: string
  // Multi-select: requests raised by ANY of these user ids (repeated keys).
  requested_by?: string[]
  page?: number
  page_size?: number
}

// Raise an access request for an account. The requester's justification is
// required and sent as `requested_notes` (the field the backend reads + stores
// + returns on the queue).
export async function requestAccountAccess(
  accountId: string,
  requestedNotes: string,
): Promise<AccountAccessRequest> {
  return apiClient.post<AccountAccessRequest>(
    endpoints.crm.accountAccessRequests(accountId),
    { requested_notes: requestedNotes.trim() },
  );
}

export async function fetchAccessRequests(
  params: FetchAccessRequestsParams = {},
): Promise<AccountAccessRequestListResponse> {
  return apiClient.get<AccountAccessRequestListResponse>(
    endpoints.crm.accountAccessRequestsList,
    {
      params: {
        status: params.status,
        account_id: params.account_id,
        account_type: params.account_type,
        search: params.search?.trim() || undefined,
        requested_by:
          params.requested_by && params.requested_by.length > 0
            ? params.requested_by
            : undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      },
    },
  );
}

export async function approveAccessRequest(
  requestId: string,
  notes?: string,
): Promise<AccountAccessRequest> {
  // The approve endpoint requires a JSON body; `notes` is optional, so send
  // `null` when the approver didn't add a note.
  return apiClient.post<AccountAccessRequest>(
    endpoints.crm.accountAccessRequestApprove(requestId),
    { notes: notes?.trim() ? notes.trim() : null },
  );
}

export async function rejectAccessRequest(
  requestId: string,
  notes: string,
): Promise<AccountAccessRequest> {
  return apiClient.post<AccountAccessRequest>(
    endpoints.crm.accountAccessRequestReject(requestId),
    { notes },
  );
}

// ── Account owners ──────────────────────────────────────────────────────

export async function listAccountOwners(
  accountId: string,
): Promise<AccountOwnerWire[]> {
  return apiClient.get<AccountOwnerWire[]>(
    endpoints.crm.accountOwners(accountId),
  );
}

export async function addAccountOwner(
  accountId: string,
  body: AccountOwnerAddPayload,
): Promise<AccountOwnerWire> {
  return apiClient.post<AccountOwnerWire>(
    endpoints.crm.accountOwners(accountId),
    body,
  );
}

export async function removeAccountOwner(
  accountId: string,
  userId: string,
): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.accountOwner(accountId, userId));
}

export async function promoteAccountOwnerPrimary(
  accountId: string,
  userId: string,
): Promise<AccountOwnerWire> {
  return apiClient.patch<AccountOwnerWire>(
    endpoints.crm.accountOwnerPrimary(accountId, userId),
  );
}

// ── Account addresses ───────────────────────────────────────────────────

export interface FetchAccountAddressesParams {
  address_type?: AddressType;
  status?: AddressStatus;
}

export async function listAccountAddresses(
  accountId: string,
  params: FetchAccountAddressesParams = {},
): Promise<AccountAddressWire[]> {
  try {
    return await apiClient.get<AccountAddressWire[]>(
      endpoints.crm.accountAddresses(accountId),
      {
        params: {
          address_type: params.address_type,
          status: params.status,
        },
      },
    );
  } catch (err) {
    // A 404 here means the account (or its address collection) isn't found —
    // semantically "this account has no addresses", not a failure to show the
    // user. Swallow it into an empty list so consumers render the empty state
    // instead of a red error. Any other status is a real error → rethrow.
    if (err instanceof ApiError && err.statusCode === 404) {
      return [];
    }
    throw err;
  }
}

export async function createAccountAddress(
  accountId: string,
  body: AddressUpsertPayload,
): Promise<AccountAddressWire> {
  return apiClient.post<AccountAddressWire>(
    endpoints.crm.accountAddresses(accountId),
    body,
  );
}

export async function updateAccountAddress(
  accountId: string,
  addressId: string,
  body: Partial<AddressUpsertPayload>,
): Promise<AccountAddressWire> {
  return apiClient.patch<AccountAddressWire>(
    endpoints.crm.accountAddress(accountId, addressId),
    body,
  );
}

export async function setAccountAddressDefault(
  accountId: string,
  addressId: string,
): Promise<AccountAddressWire> {
  return apiClient.patch<AccountAddressWire>(
    endpoints.crm.accountAddressDefault(accountId, addressId),
  );
}

export async function deleteAccountAddress(
  accountId: string,
  addressId: string,
): Promise<void> {
  return apiClient.delete<void>(
    endpoints.crm.accountAddress(accountId, addressId),
  );
}

// Coerce wire `revenue` (Decimal as number|string|null) to a plain number for UI.
export function accountRevenueToNumber(
  value: AccountListItem["revenue"],
): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
