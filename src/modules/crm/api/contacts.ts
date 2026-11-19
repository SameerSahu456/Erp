import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"

// ─── Contacts ────────────────────────────────────────────────────────────
// Wire types mirror app/modules/crm/schemas/contact.py (verified 2026-05-04).
// Status values are Capitalized on the wire — no casing adapter.

export type ContactStatus = "Active" | "Inactive"

export const CONTACT_STATUSES: readonly ContactStatus[] = [
  "Active",
  "Inactive",
] as const

// Hint list — backend stores `department` as a free string ≤100 chars. Same
// "merge saved value if not in list" trick applies on the form (see industry).
export const CONTACT_DEPARTMENT_OPTIONS: readonly string[] = [
  "Executive",
  "Technology",
  "Engineering",
  "IT",
  "Procurement",
  "Finance",
  "Sales",
  "Marketing",
  "Operations",
  "Infrastructure",
  "Network Engineering",
  "HR",
  "Legal",
  "Other",
] as const

// Slim account reference embedded inside ContactListItem so the FE can
// render every linked account on the row without a follow-up call. Full
// link metadata (linked_at / linked_by) lives on ContactAccountEmbed for
// the detail view. See ContactAccountListEmbed in schemas/contact.py.
export interface ContactAccountListEmbedWire {
  account_id: string
  account_name: string
  account_code: string
  is_primary: boolean
}

// Record from GET /contacts list. Carries an enriched `accounts` array
// (built via two batched SELECTs server-side, no N+1). See ContactListItem
// in schemas/contact.py (2026-05-27 enhancement).
export interface ContactListItem {
  id: string
  name: string
  email: string | null
  phone: string | null
  designation: string | null
  department: string | null
  status: ContactStatus
  created_at: string
  updated_at: string
  accounts: ContactAccountListEmbedWire[]
  primary_account_id: string | null
}

// Account-link summary embedded in ContactResponse.
export interface ContactAccountEmbed {
  account_id: string
  account_name: string
  account_code: string
  is_primary: boolean
  linked_at: string
  linked_by: string
}

// Full shape from GET /contacts/{id}, POST /contacts, PATCH /contacts/{id}.
export interface ContactResponse {
  id: string
  name: string
  email: string | null
  phone: string | null
  alt_phone: string | null
  designation: string | null
  department: string | null
  status: ContactStatus
  created_by: string
  created_at: string
  updated_at: string
  accounts: ContactAccountEmbed[]
  account_count: number
  primary_account_id: string | null
}

export interface ContactsListResponse {
  items: ContactListItem[]
  total: number
  page: number
  page_size: number
}

export interface FetchContactsParams {
  page?: number
  page_size?: number
  search?: string
  status?: ContactStatus
  designation?: string
  department?: string
  has_email?: boolean
  has_phone?: boolean
  account_id?: string
  include_descendants?: boolean
  is_orphan?: boolean
  // Created-date range (IST, inclusive), YYYY-MM-DD.
  date_from?: string
  date_to?: string
  // "name" | "-name" | "email" | "-email" | "created_at" | "-created_at" | "updated_at" | "-updated_at"
  sort?: string
}

export interface ContactUpsertPayload {
  name?: string
  email?: string | null
  phone?: string | null
  alt_phone?: string | null
  designation?: string | null
  department?: string | null
  status?: ContactStatus
  // Create-only. PATCH rejects via extra='forbid'.
  account_ids?: string[]
  primary_account_id?: string | null
}

// Sub-route shapes.
export interface ContactAccountWire {
  id: string
  contact_id: string
  account_id: string
  is_primary: boolean
  linked_by: string
  linked_at: string
}

export interface ContactAccountAddPayload {
  account_id: string
  is_primary?: boolean
}

// Shape of the 409 CONTACT_EMAIL_EXISTS response body (in `data` on failure).
export interface ContactEmailExistsDetail {
  existing_contact_id: string
  existing_contact_name: string
}

export async function fetchContacts(
  params: FetchContactsParams = {},
): Promise<ContactsListResponse> {
  const wireParams = {
    page: params.page ?? 1,
    page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    search: params.search?.trim() || undefined,
    status: params.status,
    designation: params.designation || undefined,
    department: params.department || undefined,
    has_email: params.has_email,
    has_phone: params.has_phone,
    account_id: params.account_id,
    include_descendants: params.include_descendants,
    is_orphan: params.is_orphan,
    date_from: params.date_from,
    date_to: params.date_to,
    sort: params.sort,
  }
  return apiClient.get<ContactsListResponse>(endpoints.crm.contacts, {
    params: wireParams,
  })
}

export async function fetchContact(
  id: string,
  opts?: { bypassAccess?: boolean },
): Promise<ContactResponse> {
  // `bypass_access=true` tells the backend to skip the per-record access gate on
  // GET /contacts/{id} (which otherwise 403s CONTACT_ACCESS_DENIED). Used by
  // detail/dropdown DISPLAY flows that need the contact's info even when the
  // operator lacks per-record access — never by the contact detail/edit page
  // itself (that keeps the access-request UX). Only sent when explicitly requested.
  return apiClient.get<ContactResponse>(endpoints.crm.contact(id), {
    params: opts?.bypassAccess ? { bypass_access: true } : undefined,
  })
}

export async function createContact(
  body: ContactUpsertPayload,
): Promise<ContactResponse> {
  return apiClient.post<ContactResponse>(endpoints.crm.contacts, body)
}

export async function updateContact(
  id: string,
  body: ContactUpsertPayload,
): Promise<ContactResponse> {
  // PATCH rejects account_ids / primary_account_id (extra='forbid'). Strip
  // defensively so callers don't need to remember.
  const rest = { ...body }
  delete rest.account_ids
  delete rest.primary_account_id
  return apiClient.patch<ContactResponse>(endpoints.crm.contact(id), rest)
}

export async function deleteContact(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.contact(id))
}

// Contact ↔ Account links (CNT-2)

export async function listContactAccounts(
  contactId: string,
): Promise<ContactAccountWire[]> {
  return apiClient.get<ContactAccountWire[]>(
    endpoints.crm.contactAccounts(contactId),
  )
}

export async function addContactAccountLink(
  contactId: string,
  body: ContactAccountAddPayload,
): Promise<ContactAccountWire> {
  return apiClient.post<ContactAccountWire>(
    endpoints.crm.contactAccounts(contactId),
    body,
  )
}

export async function removeContactAccountLink(
  contactId: string,
  accountId: string,
): Promise<void> {
  return apiClient.delete<void>(
    endpoints.crm.contactAccount(contactId, accountId),
  )
}

export async function promoteContactAccountPrimary(
  contactId: string,
  accountId: string,
): Promise<ContactAccountWire> {
  return apiClient.patch<ContactAccountWire>(
    endpoints.crm.contactAccountPrimary(contactId, accountId),
  )
}

// ── Backwards-compat aliases ────────────────────────────────────────────
// AccountDetailPage's Contacts tab (and the hook `useAccountContacts` it
// depends on) was wired before contacts had a full slice. Keep the old
// names exported as type aliases / a thin wrapper so we don't break that
// page on the way through this work.

export type AccountContactItem = ContactListItem

export interface AccountContactsListResponse {
  items: AccountContactItem[]
  total: number
  page: number
  page_size: number
}

export async function fetchAccountContacts(
  accountId: string,
  params: { page?: number; page_size?: number } = {},
): Promise<AccountContactsListResponse> {
  return fetchContacts({
    account_id: accountId,
    page: params.page,
    page_size: params.page_size,
  })
}
