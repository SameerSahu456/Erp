import { apiClient, http } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import { withInferredMime } from "@shared/lib/file-mime"
import { roundMoneyFields } from "@shared/lib/money"

import {
  SO_ATTACHMENT_OTHERS,
  type SoAttachmentType,
} from "../constants/so-attachments"

import type { AccountStatus, AccountTagWire, AccountTypeWire } from "./accounts"
import type { ContactStatus } from "./contacts"
import type { BomChildAction } from "./quotes"

// ─── Sales Orders ────────────────────────────────────────────────────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/sales_order.py`.
// Decimal money/qty are serialized by the backend as JSON numbers
// (`DecimalAsFloat` annotation, schemas/sales_order.py:53) — type as `number`.
//
// v1 scope: CRUD + stateless calculate preview. The state-machine endpoints
// (status flip, /revise, per-line approve/reject/reassign, /me/pending) and
// the per-line `approver_id` picker land in a follow-up — backend already
// supports them; UI is deferred. Drafts can be created/updated/deleted
// without ever touching `approver_id` because the schema makes it optional
// at create/update (required only at Submit).

export type SOStatus =
  | "Draft"
  | "Submitted"
  | "PartiallyApproved"
  | "Approved"
  | "Rejected"
  // Amendment of an already-Approved SO supersedes the prior version: the old
  // row is archived (is_latest_order=false) and the new row carries "Amend".
  | "Amend"
  // Account-gate statuses — set when the linked account has not yet been KYC-
  // approved. Distinct from the PM-level "Rejected" so sales can tell "account
  // KYC failed" apart from "PM rejected a line". (Backend SO_STATUS_ACCOUNT_*.)
  | "Account Approval Pending"
  | "Account Rejected"
  | "Cancelled"
  // Fulfilment trail of a SALE order, written by the WMS dispatch/return
  // hooks. A RENTAL order's post-approval state lives on
  // `so_configure.status` instead — see `RentalStatus` in
  // `modules/rentals/api/sales-orders.ts` — so a rental never reaches these.
  //
  // Removing them from this union was the frontend half of collapsing the
  // two homes into one; it is DEFERRED with its backend counterpart
  // (`so_dispatch_rental_only_01`), because the sale flow still emits them.
  | "PartiallyDispatched"
  | "Dispatched"
  | "PartiallyReturned"
  | "Returned"
  // Set by `SalesOrderService.cancel()` when the parent lead is reversed.
  | "Cancelled"

export type SOLineStatus = "Pending" | "Approved" | "Rejected"
export type SOSellableType = "sales" | "rental_sales" | "demo"
export type SOConfigAction = "Standard" | "Add" | "Remove"
export type SORentalPeriod = "day" | "month"
export type SOOrderableType = "lead" | "deal" | "account"

// Order classification — backend `OrderType` literal, allow-list = CRM_TAGS.
// Stored backend-side as a JSONB array (`order_type: list[OrderType]`) for
// forward-compat with mixed orders; the FE captures a single value via a
// dropdown and sends it as a one-element array.
export type SOOrderType = "New" | "Refurb" | "Rental"

export const SO_ORDER_TYPES: readonly SOOrderType[] = [
  "New",
  "Refurb",
  "Rental",
] as const

// Per-LINE condition — a different value set from the header order type
// above, and NOT interchangeable with it. Mirrors the backend's
// `LineCondition` (schemas/sales_order.py) and the `condition_values` CHECK
// constraint on `sales_order_items`: lowercase, and no "Rental" (renting is
// an order type, never a physical condition). Values must match the IMS
// variant's `condition` exactly — on catalog rows the service compares them
// and rejects a disagreement with 400 SO_ITEM_CONDITION_MISMATCH.
export type SOLineCondition = "new" | "refurbished" | "new_pull"

export const SO_LINE_CONDITIONS: readonly SOLineCondition[] = [
  "new",
  "refurbished",
  "new_pull",
] as const

// ── Item wire shape (mirrors SalesOrderItemResponse) ────────────────────

export interface SalesOrderItemWire {
  id: string
  sales_order_id: string
  parent_sales_order_item_id: string | null
  sort_order: number
  config_action: SOConfigAction
  is_customer_visible: boolean
  part_variant_id: string | null
  sales_quote_item_id: string | null
  /** Demo→SO per-serial trace: the dispatched demo unit this line sells, its
   *  serial, and the demo request line item it fulfils (null for non-demo
   *  lines). All resolved from the source unit — no stored columns. */
  source_dispatch_request_item_id: string | null
  source_serial_number: string | null
  source_demo_request_item_id: string | null
  category_id: string
  oem_id: string | null
  // Per-line condition — the variant's own condition (new / refurbished /
  // new_pull), NOT the header order type. Optional: it post-dates the deployed
  // backend, so older servers omit it entirely. Read with `?? null`.
  condition?: SOLineCondition | null
  item_name: string
  description: string | null
  qty: number
  rate: number
  // Snapshot of IMS variant.sell_price at pick time; survives later catalog
  // sell_price changes. NULL on freeform rows + legacy rows. Optional for
  // backwards compatibility with older servers.
  list_price?: number | null
  // Server-computed money fields. `gross_amount` = qty*rate (or
  // qty*rate*rental_duration for rentals); `discount_amount` is resolved
  // per-line discount; `amount` = gross - discount; `tax_amount` = amount
  // * tax_rate / 100.
  gross_amount: number
  discount_percentage: number | null
  discount_amount: number
  amount: number
  tax_rate: number
  tax_amount: number
  is_rental: boolean
  rental_period: SORentalPeriod | null
  rental_start_date: string | null    // ISO "YYYY-MM-DD"
  rental_end_date: string | null
  rental_duration_units: number | null // computed; null when not rental
  // The actual duration as read: "1 month 5 days" (RM54). Units above may be
  // fractional for a part month (1 month 5 days = 1.1667).
  rental_duration_label?: string | null
  // Approval state (kept in wire layer for forward compatibility; UI ignores in v1)
  approver_id: string | null
  // Resolved server-side, so showing the approver needs no /users lookup
  // (which only `auth:users:read` holders may make).
  approver_name?: string | null
  line_status: SOLineStatus
  line_decided_by_id: string | null
  // Server-resolved decider name; null when undecided or auto-approved by the
  // system user — `line_auto_decided` tells the two apart.
  line_decided_by_name?: string | null
  line_auto_decided?: boolean
  line_decided_at: string | null
  line_decision_notes: string | null
  configuration_notes: string | null
  warranty_level: string | null
  // Viewer-scoped action gate (backend `can_approve`): true iff the CURRENT
  // caller may approve/reject this line right now — it already folds in the SO
  // state, the line being a Pending headline with an approver, and the caller
  // being superuser / the stamped approver / an eligible PM for the category.
  // The FE gates the per-line Approve/Reject/Reassign controls on this instead
  // of re-deriving PM scope from `approver_id`. Defaults false when absent.
  can_approve?: boolean
  // Server-maintained return/dispatch counters. The CRM return hook pro-rates
  // the money fields (gross/discount/amount/tax) when `returned_qty > 0`, so
  // the UI must surface both counters to explain any Amount drop.
  dispatched_qty?: number
  returned_qty?: number
  created_at: string
  updated_at: string
}

// ── viewer_context (caller-relative metadata, mirrors ViewerContext) ────

export interface SalesOrderViewerContext {
  role: "creator" | "manager" | "approver" | "account_team"
  lines_hidden: number
  your_pending_lines: number
  your_acted_lines: number
}

// ── Header wire shape (mirrors SalesOrderResponse) ──────────────────────

/** Slim `{id, name}` projection of a user (backend `UserRef`), embedded next to
 *  the raw `*_by` UUID columns on both the SO list and detail responses.
 *
 *  This is what replaced the FE's own id → name resolution: the list used to
 *  batch every row's `submitted_by_id` through `useUsersByIds`, and the detail
 *  fired a `useUser(...)` per attribution, so a page of 20 SOs cost an extra
 *  request just to label two columns. The server already has the join.
 *
 *  `name` is "First Last", falling back to the user's email when both name
 *  parts are empty; null only when the user row is soft-deleted — the id is
 *  still surfaced so the UI can render a placeholder rather than nothing. */
export interface SalesOrderUserRef {
  id: string
  name: string | null
}

export interface SalesOrderWire {
  id: string
  order_number: string
  // `charge` = raised to bill a rental deficiency (return-by-count §9.4);
  // never dispatched. Absent on servers older than the field.
  order_kind?: "standard" | "charge"
  // Versioning chain — v1 has version_number=1, parent_so_id=null,
  // is_latest_order=true. /revise demotes the source row to status "Amend"
  // and spawns v(N+1) with the same order_number.
  version_number: number
  parent_so_id: string | null
  is_latest_order: boolean
  sellable_type: SOSellableType
  orderable_type: SOOrderableType
  orderable_id: string
  sales_quote_id: string | null
  /** Set when this SO was converted from a demo request. */
  source_demo_request_id: string | null
  account_id: string
  contact_id: string
  billing_address_id: string
  shipping_address_id: string
  // Linked account's KYC approval state ("Pending" | "Approved" | "Rejected"),
  // resolved server-side. A "Rejected" account forbids amendment regardless of
  // the SO's own status — see SoDetailHeader.canAmend. Optional because it
  // post-dates the deployed backend; older servers omit it entirely.
  account_approval_status?: "Pending" | "Approved" | "Rejected" | null
  status: SOStatus
  place_of_supply: string | null
  is_inter_state: boolean
  // Server-managed header rollups, recomputed on every item mutation.
  subtotal: number
  total_line_discount: number
  discount_percentage: number | null
  discount_amount: number
  taxable_amount: number
  total_tax: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  grand_total: number
  terms_conditions: string | null
  notes: string | null
  payment_terms: string | null
  warranty: string | null
  delivery: string | null
  order_pdf_url: string | null
  labels: string[]
  // Operator-chosen order classification (New / Refurb / Rental). JSONB
  // array on the wire; optional here because it post-dates the deployed
  // backend — older servers omit it entirely. Read with `?? []`.
  order_type?: string[]
  submitted_at: string | null
  submitted_by_id: string | null
  // Resolved `{id, name}` for `submitted_by_id` — null on any SO not yet
  // submitted. Optional because it post-dates the deployed backend.
  submitted_by_detail?: SalesOrderUserRef | null
  decided_at: string | null
  created_by: string
  // Resolved `{id, name}` for `created_by`. Always present on a current
  // server (every SO has a creator); optional for the same reason as above.
  created_by_detail?: SalesOrderUserRef | null
  created_at: string
  updated_at: string
  // Amendment audit — set when this row resulted from amending a prior
  // version (or on the demoted source row). Optional because they post-date
  // the deployed backend: older servers omit them entirely, so read with
  // `?? null` / a truthy guard. `amended_by` is a nested {id, name, email}
  // object for the acting user (null until a row is amended).
  amend_reason?: string | null
  amended_by?: { id: string; name: string | null; email: string | null } | null
  items: SalesOrderItemWire[]
  viewer_context: SalesOrderViewerContext | null
}

// ── List-row wire shape (mirrors SalesOrderListItem; no items[]) ────────

export interface SalesOrderListItemWire {
  id: string
  order_number: string
  // `charge` = raised to bill a rental deficiency (return-by-count §9.4);
  // never dispatched. Absent on servers older than the field.
  order_kind?: "standard" | "charge"
  // Versioning chain — v1 is the original; /revise spawns v(N+1) and demotes
  // the prior row to status "Amend". Shared `order_number` across versions.
  version_number: number
  sellable_type: SOSellableType
  orderable_type: SOOrderableType
  orderable_id: string
  // Human-readable code for the upstream entity (Account.code / Deal.deal_number /
  // Lead.lead_code), resolved server-side by SalesOrderService._lookup_orderable_numbers.
  // Null only when the upstream row is soft-deleted or the FK is orphaned.
  orderable_number: string | null
  // Source Lead/Deal channel type (server-resolved); null for account-sourced SOs.
  channel_type?: string | null
  sales_quote_id: string | null
  /** Set when this SO was converted from a demo request. */
  source_demo_request_id: string | null
  account_id: string
  // 2026-05-27: resolved server-side via `accounts.name`. Null only when
  // the account FK is orphaned (rare).
  account_name: string | null
  contact_id: string
  status: SOStatus
  grand_total: number
  labels: string[]
  // 2026-05-27: live count of non-deleted SO items, batched server-side.
  items_count: number
  submitted_at: string | null
  submitted_by_id: string | null
  // See `SalesOrderWire` — same `{id, name}` projection, batched server-side
  // across the whole page in one query.
  submitted_by_detail?: SalesOrderUserRef | null
  // Distinct users who approved at least one line (approval is per line, so
  // there is no single header approver). Empty until a line is approved.
  approved_by?: SalesOrderUserRef[]
  /** Distinct category names across the order's line items (sorted). */
  categories?: string[]
  decided_at: string | null
  created_by: string
  // Embedded {id, name} for the creator, resolved server-side (batched) so the
  // list can show the creator's name without a second user fetch. Null/absent
  // only if the creating user row can't be resolved (e.g. soft-deleted).
  //
  // NAMED `created_by_detail`, not `created_by_user`: that is what the backend
  // sends (`SalesOrderListItem.created_by_detail`, and verified on the live
  // response), and it matches `submitted_by_detail` beside it. The `dev` branch
  // carried a `created_by_user` spelling here that no SO endpoint ever emits —
  // it would have read "—" in every row.
  created_by_detail?: SalesOrderUserRef | null
  created_at: string
  updated_at: string
}

export interface SalesOrdersListResponse {
  items: SalesOrderListItemWire[]
  total: number
  page: number
  page_size: number
}

export interface FetchSalesOrdersParams {
  page?: number
  page_size?: number
  search?: string
  /** Narrow search on the sales order's OWN number only (max 100 chars). `search` is wider. */
  order_number?: string
  /** Inclusive bounds on the order's grand total (inc. tax). */
  min_total?: number
  max_total?: number
  // Backend accepts repeated `?status=` query params — pass an array to
  // filter on multiple statuses in a single request. A single string
  // value still works (FastAPI converts it to a one-element list).
  status?: SOStatus | SOStatus[]
  // Multi-select: returns sales orders linked to ANY of these account ids. Sent
  // as repeated query keys (?account_id=a&account_id=b) via axios `indexes: null`.
  // A single string value also works (FastAPI unwraps a 1-element list).
  account_id?: string | string[]
  lead_id?: string
  /** Orders raised against this DEAL. Resolves server-side to
   *  `orderable_type='deal' AND orderable_id=<id>` — there is no
   *  `sales_orders.deal_id` column. The deal spec planned one (section 6,
   *  "Sales Order linkage — ON HOLD") and the SO v4 polymorphic redesign
   *  dropped the per-entity columns before it was added, which is why a
   *  deal's orders were unreachable until now. */
  deal_id?: string
  // Multi-select: returns sales orders created by ANY of these user ids. Sent
  // as repeated query keys (?created_by=a&created_by=b) via axios `indexes: null`.
  created_by?: string[]
  // Multi-select: returns sales orders submitted by ANY of these user ids.
  // Draft rows have no submitter and are excluded. Repeated-key serialization.
  submitted_by?: string[]
  // Multi-select: returns sales orders where AT LEAST ONE non-deleted line is
  // assigned to one of these approver user ids. Repeated-key serialization.
  approver_id?: string[]
  // Multi-select channel of the upstream lead/deal. Values: "End Customer",
  // "Channel Partner", "Cloud / Data Center", "End User". Account-sourced SOs
  // are excluded while this is active (no channel). Repeated-key serialization.
  channel_type?: string[]
  /** Rows with at least one LINE ITEM in ANY of these IMS categories. */
  category_ids?: string[]
  /** Rows with at least one LINE ITEM carrying ANY of these IMS OEMs (same line as category_ids). */
  oem_ids?: string[]
  /** Created-date range (IST calendar days, inclusive). `YYYY-MM-DD`. */
  date_from?: string
  date_to?: string
  /** Submitted-date range (IST calendar days, inclusive). `YYYY-MM-DD`. Draft
   *  rows have no submitted_at and drop out whenever either bound is set. */
  submitted_from?: string
  submitted_to?: string
  sort?: string
}

// ── Create / Update payloads (mirror SalesOrderCreate / SalesOrderUpdate) ─

export interface SalesOrderAddressData {
  line1: string
  line2?: string | null
  city: string
  state: string
  pincode: string
  label?: string | null
}

// Inline find-or-create account block on SalesOrderCreate (mirrors backend
// `AccountInlineData`). The cascade orchestrator looks up the account by
// exact `name` first; if present it reuses, otherwise it creates a new
// account from this payload. Used by the Lead-cascade branch of
// `POST /sales-orders`. Ignored on Deal/Account branches (account is
// resolved from the deal row / direct `account_id`).
export interface SalesOrderAccountInlineData {
  name: string
  account_type: AccountTypeWire
  status: AccountStatus
  tag: AccountTagWire
  // Primary owner for the account the lead-cascade creates. Closed-Won sends
  // the lead's `assigned_to` user id so the new account is owned by the lead's
  // salesperson, not whoever completed the wizard. Backend falls back to the
  // cascade actor when null/omitted, and ignores it when an existing account
  // is reused by name. (Mirrors backend `AccountInlineData.owner_id`.)
  owner_id?: string | null
  industry?: string | null
  // String | number — the Close-Won wizard sends the raw digit string to
  // preserve precision past the ~17-digit JS Number ceiling; Pydantic parses
  // either into the backend's `Decimal(max_digits=18, decimal_places=2)`.
  revenue?: number | string | null
  website?: string | null
  company_size?: string | null
  employees?: number | null
  categories_interested?: string[]
  categories_bought?: string[]
  // Tax / compliance identifiers — backend regex-validates both.
  // PAN: ^[A-Z]{5}[0-9]{4}[A-Z]{1}$  (e.g. ABCDE1234F)
  // GST: ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
  //      (e.g. 27ABCDE1234F1Z5)
  pan_number?: string | null
  gst_number?: string | null
}

// Optional document files uploaded alongside the lead-cascade SO create.
// Backend route accepts each as a separate multipart File part named
// `account_doc_<key>`; staged on the cascade-created Account only when
// orderable_type='lead' (silently ignored on deal/account branches).
// Allowed MIMEs: application/pdf, image/jpeg, image/png. Per-file cap: 20 MB.
// See app/shared/policies/attachment_policy.py CRM_ACCOUNT_DOCUMENT_TYPES.
export interface SalesOrderAccountDocuments {
  pan_card?: File
  gst_certificate?: File
  aadhaar?: File
  msme?: File
  bank_statement?: File
}

// Inline find-or-create contact block on SalesOrderCreate (mirrors backend
// `ContactInlineData`). Service searches by email (case-insensitive) first,
// then phone; updates the name if found-but-different; creates otherwise.
// At least one of `email` / `phone` must be set (backend-side invariant).
export interface SalesOrderContactInlineData {
  name: string
  email?: string | null
  phone?: string | null
  alt_phone?: string | null
  designation?: string | null
  department?: string | null
  status?: ContactStatus
}

// SO BOM child payload (SO-BOM). Sent inline under a parent
// `SalesOrderItemCreatePayload.children`. Mirrors backend
// `schemas/sales_order.py:SalesOrderBomChildCreate`. Differences vs a
// headline:
//   - `config_action` required ('Add' | 'Remove')
//   - `category_id` required on every row
//   - No `approver_id` (children inherit parent's; server-managed cascade)
//   - No `sales_quote_item_id` (quote→SO BOM copy is server-driven)
//   - No `is_customer_visible` (server sets per action)
//   - Rental fields NOT exposed on children
export interface SalesOrderBomChildCreatePayload {
  config_action: BomChildAction
  part_variant_id?: string
  category_id: string
  // Per-child Brand/OEM + Condition. Same snapshot-and-assert rule as the
  // parent line: on a catalog child the service fills both from the variant
  // and 400s if what we send disagrees. Absent from the Quote's child schema.
  oem_id?: string
  condition?: SOLineCondition
  item_name?: string
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

export interface SalesOrderItemCreatePayload {
  part_variant_id?: string
  category_id?: string
  // Per-line Brand/OEM + Condition (both optional). FK to /ims/oems and the
  // variant's condition set respectively. The service DOES consume both: on a
  // catalog row it snapshots them from the variant/parent part and 400s if the
  // value sent disagrees; on a freeform row it stores them as-is. `null`
  // explicitly clears on PATCH (the service dumps with `exclude_unset=True`,
  // so an omitted field keeps whatever is stored).
  oem_id?: string | null
  condition?: SOLineCondition | null
  item_name?: string
  description?: string | null
  qty: number
  rate?: number
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  discount_percentage?: number
  discount_amount?: number
  // Snapshot of IMS variant.sell_price at pick time; never auto-refreshed.
  list_price?: number | null
  // Per-line approver. Optional on Draft create/update; backend enforces
  // presence at Submit-time (SO_LINE_MISSING_APPROVER) and validates the
  // picked user holds crm:so_approve (SO_APPROVER_LACKS_PERMISSION).
  approver_id?: string
  // Quote-item lineage. Set per-line when this SO line is consuming
  // from a specific quote line — used by the account-quote-driven flow
  // (lead/deal use `quote_line_quantities` on the header instead).
  // Backend validates:
  //   • SO must have sales_quote_id      → else SO_QUOTE_LINK_REQUIRES_QUOTE_ID
  //   • quote_item belongs to that quote → else SO_QUOTE_LINE_MISMATCH /
  //                                         QUOTE_ITEM_NOT_FOUND
  //   • qty <= remaining_qty             → else QUOTE_LINE_QTY_EXCEEDED
  // On success backend decrements remaining_qty.
  sales_quote_item_id?: string | null
  is_rental?: boolean
  rental_period?: SORentalPeriod
  rental_start_date?: string
  rental_end_date?: string
  // Inline BOM children (SO-BOM) — max 20 per parent. Children inherit
  // the headline's `approver_id` server-side; FE doesn't set it on
  // children. Atomic with the headline.
  children?: SalesOrderBomChildCreatePayload[]
}

// PATCH-flavour BOM child shape used inside SalesOrderItemUpsertPayload.children.
// Mirrors QuoteBomChildUpsertPayload: backend dispatches on `id` presence —
// present → update the existing child by id (part_variant_id / qty / rate /
// etc. all mutable); absent → create a new child (requires `config_action:
// 'Add'`). A persisted child whose id is omitted from the array is removed
// (full-replace reconciliation, same as the quote BOM upsert path).
export interface SalesOrderBomChildUpsertPayload {
  id?: string
  config_action?: BomChildAction        // required when id absent (new child → 'Add')
  // Catalog child → variant id. Pass `null` (not omit) on an EXISTING child
  // whose variant was cleared in the editor — omitting keeps the old variant
  // on a PATCH; explicit null tells the backend to drop it (row → freeform).
  part_variant_id?: string | null
  category_id?: string
  // Per-child Brand/OEM + Condition. Same null-vs-omit rule as
  // `part_variant_id`: `null` clears on an existing child, omitting keeps
  // what's stored. On a catalog child both must echo the variant or the
  // service 400s (SO_ITEM_OEM_MISMATCH / SO_ITEM_CONDITION_MISMATCH).
  oem_id?: string | null
  condition?: SOLineCondition | null
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

// Inline upsert shape used inside SalesOrderUpdatePayload.items[]. Mirrors
// `SalesOrderItemUpsert` in schemas/sales_order.py: every field is optional
// — backend dispatches on `id` presence (update existing row) vs absence
// (create new row).
//
// SO-BOM: `children` is an upsert array on both branches (mirrors the quote
// BOM upsert). On an existing parent (id present) the backend reconciles by
// child id — update existing children, insert new ones (no child id), and
// remove persisted children absent from the array. This lets sales edit a
// saved BOM in place (change a child's variant, qty, or drop it) without
// deleting and re-adding the whole parent line.
export interface SalesOrderItemUpsertPayload {
  id?: string
  // Catalog line → variant id. Pass `null` (not omit) on an EXISTING line
  // whose variant was cleared — omitting keeps the old variant on a PATCH;
  // explicit null clears it and the line becomes freeform (item_name +
  // category_id then required).
  part_variant_id?: string | null
  category_id?: string
  // Per-line Brand/OEM (optional) — see SalesOrderItemCreatePayload. Pass
  // `null` to clear on an existing row; sent ahead of backend support.
  oem_id?: string | null
  // Per-line condition (optional) — New / Refurb / Rental. Sent ahead of
  // backend support.
  condition?: string | null
  item_name?: string
  description?: string | null
  qty?: number
  rate?: number
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  discount_percentage?: number
  discount_amount?: number
  // Snapshot of IMS variant.sell_price at pick time; never auto-refreshed.
  list_price?: number | null
  approver_id?: string
  // Same semantics as on SalesOrderItemCreatePayload — only meaningful
  // on rows that are creating a new SO item linked to a quote line
  // (id absent, sales_quote_item_id set). Existing rows' linkage is
  // preserved by the backend; don't re-send it on edits.
  sales_quote_item_id?: string | null
  is_rental?: boolean
  rental_period?: SORentalPeriod
  rental_start_date?: string
  rental_end_date?: string
  children?: SalesOrderBomChildUpsertPayload[]
}

export interface SalesOrderCreatePayload {
  /** Rental window — sent ONLY when `sellable_type` is `rental_sales`.
   *  Stored on the rentals module's `so_configure` row, because
   *  `sales_orders` has no date columns of its own. The backend fills them
   *  down onto every line (is_rental + period + dates), which is what makes
   *  the order's units provision as tracked devices. */
  rental_order_date?: string
  rental_start_date?: string
  /** INCLUSIVE last rental day. */
  rental_end_date?: string

  sellable_type?: SOSellableType
  status?: Extract<SOStatus, "Draft" | "Submitted">
  orderable_type: SOOrderableType
  orderable_id: string
  sales_quote_id?: string | null
  account_id?: string
  contact_id?: string
  billing_address_id?: string
  shipping_address_id?: string
  // Lead-cascade payload: find-or-create the account+contact in one POST
  // instead of chaining two requests. `account_id` on the parent payload
  // wins if both are provided. Deal branch ignores both.
  account_data?: SalesOrderAccountInlineData
  contact_data?: SalesOrderContactInlineData
  // REQUIRED on Lead branch (lead carries no structured address). Deal
  // branch may also use these in place of an existing `billing_address_id`.
  billing_address_data?: SalesOrderAddressData
  shipping_address_data?: SalesOrderAddressData
  place_of_supply?: string  // 2-letter state code, regex ^[A-Z]{2}$
  terms_conditions?: string | null
  notes?: string | null
  payment_terms?: string | null
  warranty?: string | null
  delivery?: string | null
  // Order classification. Backend field is `order_type: list[OrderType]`
  // (optional, defaults to []). The FE dropdown captures one value and
  // sends it as a one-element array; omit the key to leave it unset.
  order_type?: SOOrderType[]
  discount_percentage?: number
  discount_amount?: number
  items?: SalesOrderItemCreatePayload[]
  // Multi-SO-from-one-Quote: when sales_quote_id is set, FE controls how
  // much of each quote line this SO draws down.
  //   omitted / null → take the FULL remaining_qty on every line (first
  //                    SO "give me everything" default)
  //   { quote_item_id: qty } → only the listed quote lines are copied;
  //                            absent lines are skipped on THIS SO.
  // Each qty must satisfy `0 < qty <= quote_item.remaining_qty`; the
  // backend FOR-UPDATE-locks the quote line during validation so
  // concurrent SOs can't both consume the same qty. Ignored on the
  // Direct path (no sales_quote_id).
  quote_line_quantities?: Record<string, number> | null
  // Type metadata for the `so_attachment_files` parts, matched BY POSITION:
  // attachments[i] describes so_attachment_files[i]. Do not set this by
  // hand — pass `attachments` to createSalesOrder() and let it build both
  // sides together, so the two can never drift out of step.
  attachments?: SalesOrderAttachmentMetaPayload[]
}

// One SO attachment on create: its type plus the file itself. createSalesOrder
// splits this into the `data.attachments` metadata array and the repeated
// `so_attachment_files` parts.
export interface SalesOrderAttachmentUpload {
  document_type: SoAttachmentType
  // Required (non-blank) when document_type is 'others' — it's what names the
  // custom type. Ignored by the backend on the fixed slots.
  document_label?: string | null
  file: File
}

export interface SalesOrderAttachmentMetaPayload {
  document_type: SoAttachmentType
  document_label?: string | null
}

// PATCH /sales-orders/{id}. All fields optional. `items` is upsert array
// (Option B semantics — never implicitly deletes; caller hits DELETE
// /sales-orders/{id}/lines/{line_id} for line removal). orderable_type +
// orderable_id are NOT editable post-create.
export interface SalesOrderUpdatePayload {
  sales_quote_id?: string | null
  account_id?: string
  contact_id?: string
  billing_address_id?: string
  shipping_address_id?: string
  place_of_supply?: string | null
  terms_conditions?: string | null
  notes?: string | null
  payment_terms?: string | null
  warranty?: string | null
  delivery?: string | null
  discount_percentage?: number | null
  discount_amount?: number | null
  // Order classification. Backend `SalesOrderUpdate.order_type` is
  // `list[OrderType] | None` — the FE dropdown captures one value and sends it
  // as a one-element array. Used by the amend flow (the edit form locks it).
  order_type?: SOOrderType[]
  items?: SalesOrderItemUpsertPayload[]
}

// ── Calculate preview (POST /sales-orders/calculate, stateless) ─────────
//
// SO-BOM (backend f3e8b18, 2026-05-29): `/sales-orders/calculate` accepts
// the SAME nested-children shape as `POST /sales-orders` — one form-state
// shape across calculate / POST / PATCH. Header discount stays on the
// request root for SO (unlike Quote, which dropped it).

// BOM child shape for the calculate request. Mirrors backend
// `SalesOrderBomChildCalculate`. Differences from a headline:
//   - `config_action` required ('Add' | 'Remove'); 'Standard' rejected.
//   - `category_id` required on every row.
//   - No rental fields, no approver_id, no sales_quote_item_id.
export interface SalesOrderCalculateChildPayload {
  config_action: BomChildAction
  part_variant_id?: string
  category_id: string
  item_name?: string
  // `description` is intentionally absent — not a pricing input, so it never
  // goes to /calculate (keeps the query key stable on Description edits).
  qty: number
  rate?: number
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  discount_percentage?: number
  discount_amount?: number
}

export interface SalesOrderCalculateLinePayload {
  part_variant_id?: string
  category_id?: string
  item_name?: string
  // `description` is intentionally absent — see SalesOrderCalculateChildPayload.
  qty: number
  rate?: number
  tax_rate?: number
  sort_order?: number
  configuration_notes?: string | null
  warranty_level?: string | null
  discount_percentage?: number
  discount_amount?: number
  is_rental?: boolean
  rental_period?: SORentalPeriod
  rental_start_date?: string
  rental_end_date?: string
  // Inline BOM children — max 20 per parent. Remove children are
  // excluded from the rollup server-side (mirrors persist).
  children?: SalesOrderCalculateChildPayload[]
}

export interface SalesOrderCalculateRequest {
  discount_percentage?: number
  discount_amount?: number
  items: SalesOrderCalculateLinePayload[]
}

export interface SalesOrderCalculateLineResponseWire {
  sort_order: number
  // BOM tree echo (backend f3e8b18). Headlines come back with
  // `config_action='Standard'` + `is_customer_visible=true`; children
  // carry their action (Remove → is_customer_visible=false).
  config_action: SOConfigAction
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
  rental_period: SORentalPeriod | null
  rental_start_date: string | null
  rental_end_date: string | null
  rental_duration_units: number | null
  configuration_notes: string | null
  warranty_level: string | null
  // Self-referential — depth-1 by construction; child rows have `[]`.
  children: SalesOrderCalculateLineResponseWire[]
}

export interface SalesOrderCalculateResponseWire {
  subtotal: number
  total_line_discount: number
  discount_percentage: number | null
  discount_amount: number
  taxable_amount: number
  total_tax: number
  grand_total: number
  labels: string[]
  items: SalesOrderCalculateLineResponseWire[]
}

// ── Endpoint wrappers ───────────────────────────────────────────────────

export async function fetchSalesOrders(
  params: FetchSalesOrdersParams = {},
): Promise<SalesOrdersListResponse> {
  return apiClient.get<SalesOrdersListResponse>(endpoints.crm.salesOrders, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
      order_number: params.order_number?.trim() || undefined,
      min_total: params.min_total,
      max_total: params.max_total,
      status: params.status,
      // Multi-select: array → repeated `?account_id=…` keys. A single string
      // still works unchanged. An empty array is dropped so the URL stays clean.
      account_id: Array.isArray(params.account_id)
        ? params.account_id.length > 0
          ? params.account_id
          : undefined
        : params.account_id,
      lead_id: params.lead_id,
      deal_id: params.deal_id,
      // Repeated query keys (?created_by=a&created_by=b) via axios indexes:null.
      created_by:
        params.created_by && params.created_by.length > 0
          ? params.created_by
          : undefined,
      submitted_by:
        params.submitted_by && params.submitted_by.length > 0
          ? params.submitted_by
          : undefined,
      approver_id:
        params.approver_id && params.approver_id.length > 0
          ? params.approver_id
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
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      submitted_from: params.submitted_from || undefined,
      submitted_to: params.submitted_to || undefined,
      sort: params.sort,
    },
  })
}

export async function fetchSalesOrder(id: string): Promise<SalesOrderWire> {
  return apiClient.get<SalesOrderWire>(endpoints.crm.salesOrder(id))
}

export interface FetchMyPendingSalesOrdersParams {
  page?: number
  page_size?: number
  /** PM Approvals toolbar filters — server-side, applied before paging. */
  search?: string
  account_id?: string[]
  /** SOs created OR submitted by one of these users. */
  user_id?: string[]
  /** SO submitted_at, inclusive IST days (YYYY-MM-DD). */
  date_from?: string
  date_to?: string
  /** Server sort, `field` or `-field` (desc). */
  sort?: string
}

// GET /crm/sales-orders/me/pending — personal approver queue. Returns only SOs
// where the caller is the assigned `approver_id` on ≥1 Pending line AND the
// header is Submitted/PartiallyApproved. This is the intended data source for
// the SO tab of the PM Approvals page — NOT the generic status-filtered list
// (which is an admin "all in-flight SOs" view). Same `SalesOrdersListResponse`
// envelope + item shape as `fetchSalesOrders`. Permission: crm:so_approve.
export async function fetchMyPendingSalesOrders(
  params: FetchMyPendingSalesOrdersParams = {},
): Promise<SalesOrdersListResponse> {
  return apiClient.get<SalesOrdersListResponse>(
    endpoints.crm.salesOrdersMyPending,
    {
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
    },
  )
}

// ─── Fulfillment (SO detail progress counts) ───────────────────────────────
//
// Mirrors `comprint-erp-backend/app/modules/crm/schemas/sales_order_fulfillment.py`.
// `ordered` is the CRM demand; the five stage counts come from WMS (via the
// DispatchedUnitLookup contract). Buckets are NON-overlapping — the UI "Issued"
// umbrella is `issued + ready + qc_failed` (all in the issued custody state).

export interface StageRollupWire {
  ordered: number
  issued: number
  ready: number
  qc_failed: number
  dispatched: number
  returned: number
}

export interface LineFulfillmentWire extends StageRollupWire {
  sales_order_item_id: string
}

export interface SalesOrderFulfillmentWire {
  lines: LineFulfillmentWire[]
  rollup: StageRollupWire
}

export async function fetchSalesOrderFulfillment(
  id: string,
): Promise<SalesOrderFulfillmentWire> {
  return apiClient.get<SalesOrderFulfillmentWire>(endpoints.crm.salesOrderFulfillment(id))
}

// POST /api/v1/crm/sales-orders is multipart/form-data only — the backend
// declares `data` as a Form field and 5 optional `account_doc_*` File fields.
// Sending JSON returns 422. `documents` is honored only on the lead-cascade
// branch (orderable_type='lead'); other branches accept multipart but the
// service drops any docs they receive.
//
// We send via FormData with the SO payload JSON-encoded under `data`, then
// append each provided File under its `account_doc_<key>` name. Using the
// `http` axios instance directly (not `apiClient.post`) is intentional: the
// instance default `Content-Type: application/json` would otherwise survive
// onto the multipart request and the backend would 422. By passing FormData
// as data and explicitly clearing `Content-Type`, axios v1's adapter sets
// `multipart/form-data; boundary=…` itself. The response interceptor lives
// on `http` so envelope unwrapping still happens.
export async function createSalesOrder(
  payload: SalesOrderCreatePayload,
  documents?: SalesOrderAccountDocuments,
  attachments?: SalesOrderAttachmentUpload[],
): Promise<SalesOrderWire> {
  const form = new FormData()
  // The backend pairs `data.attachments[i]` with the i-th `so_attachment_files`
  // part and 400s (SO_ATTACHMENT_METADATA_MISMATCH) if the counts disagree.
  // Build both from the same array in one pass so the ordering is guaranteed
  // by construction rather than by the caller remembering to keep two lists
  // aligned — anything the caller put in `payload.attachments` is discarded.
  const attachmentList = attachments ?? []
  const body: SalesOrderCreatePayload = {
    ...payload,
    attachments: attachmentList.map((a) => ({
      document_type: a.document_type,
      // Send the label only where it means something; the backend nulls it
      // on fixed slots anyway, but no reason to put noise on the wire.
      ...(a.document_type === SO_ATTACHMENT_OTHERS && a.document_label
        ? { document_label: a.document_label }
        : {}),
    })),
  }
  form.append("data", JSON.stringify(roundMoneyFields(body)))
  for (const attachment of attachmentList) {
    // Same `withInferredMime` guard as the account docs below — an empty
    // file.type would otherwise land as application/octet-stream and trip
    // the backend's MIME allow-list.
    form.append(
      "so_attachment_files",
      withInferredMime(attachment.file),
      attachment.file.name,
    )
  }
  if (documents) {
    for (const [key, file] of Object.entries(documents)) {
      if (file instanceof File) {
        // `withInferredMime` is a belt-and-suspenders guard: if `file.type`
        // is empty (some browsers drop it for extensionless files), it
        // re-wraps the bytes as a Blob carrying the MIME inferred from the
        // filename, so the part never lands as `application/octet-stream`
        // and the backend's allow-list never bites.
        form.append(`account_doc_${key}`, withInferredMime(file), file.name)
      }
    }
  }
  // Axios v1: when Content-Type is set to "multipart/form-data" (no
  // boundary) and data is a FormData, axios appends the boundary itself.
  // We must override the http-instance default of "application/json"
  // explicitly — leaving the header off would let the default leak through.
  const response = await http.post<SalesOrderWire>(
    endpoints.crm.salesOrders,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  )
  return response.data
}

export async function updateSalesOrder(
  id: string,
  body: SalesOrderUpdatePayload,
): Promise<SalesOrderWire> {
  return apiClient.patch<SalesOrderWire>(endpoints.crm.salesOrder(id), roundMoneyFields(body))
}

export async function deleteSalesOrder(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.salesOrder(id))
}

export async function calculateSalesOrderPreview(
  body: SalesOrderCalculateRequest,
): Promise<SalesOrderCalculateResponseWire> {
  return apiClient.post<SalesOrderCalculateResponseWire>(
    endpoints.crm.salesOrderCalculate,
    roundMoneyFields(body),
  )
}

// PATCH /sales-orders/{id}/status — Draft → Submitted. Backend rejects:
//   - SO not in Draft         → 400 SO_INVALID_TRANSITION
//   - SO has 0 live items     → 422 SO_EMPTY
//   - Any line missing approver_id → 422 SO_LINE_MISSING_APPROVER
//   - Any approver doesn't hold crm:so_approve → 422 SO_APPROVER_LACKS_PERMISSION
// Other transitions (Approved / Rejected / PartiallyApproved) are derived
// from per-line decisions; Rejected → Draft uses POST /revise.
export async function submitSalesOrder(id: string): Promise<SalesOrderWire> {
  return apiClient.patch<SalesOrderWire>(endpoints.crm.salesOrderStatus(id), {
    status: "Submitted",
  })
}

// POST /crm/sales-orders/{so_id}/revise — Rejected → Draft (spec §B9).
// Permission: crm:so_write. Backend rejects with:
//   - 400 SO_REVISE_FROM_NON_REJECTED — SO isn't in Rejected status
// Side effects: header back to Draft (clears submitted_at/submitted_by_id/
// decided_at); every decided line reset to Pending (approver_id retained);
// parent quote remaining_qty recomputed.
// `amend_reason` is required in the body (backend ReviseSalesOrderRequest,
// 1..1000 chars, extra keys forbidden); it's stamped on the source row when
// it's demoted to status "Amend". The amend dialog always supplies a non-empty
// reason, so `trimmed` is present at every real call site.
//
// Optional customer-FK swap on /revise. Supplying `accountId` (different from
// the source SO's account) retargets the new revision onto another account —
// the backend then REQUIRES contactId + both address ids (each FK is NOT NULL
// and the source's contact/addresses belong to the OLD account). Used by the
// "Account Rejected" amend flow to move the SO onto an approved account.
//
// Optional `items` full-replace. When provided, the new revision's line set is
// built explicitly from this payload (same `SalesOrderItemCreatePayload` shape
// as create, incl. inline BOM `children`) instead of deep-copying the source's
// items; the backend recomputes header totals from it. When omitted, the source
// items + BOM tree are deep-copied (legacy behaviour). The "Account Rejected"
// amend form sends the user's edited lines here.
export interface ReviseSalesOrderInput {
  reason?: string
  accountId?: string | null
  contactId?: string | null
  billingAddressId?: string | null
  shippingAddressId?: string | null
  items?: SalesOrderItemCreatePayload[]
}

export async function reviseSalesOrder(
  id: string,
  input?: string | ReviseSalesOrderInput,
): Promise<SalesOrderWire> {
  const norm: ReviseSalesOrderInput =
    typeof input === "string" || input == null ? { reason: input ?? undefined } : input
  const body: Record<string, unknown> = {}
  const trimmed = norm.reason?.trim()
  if (trimmed) body.amend_reason = trimmed
  if (norm.accountId) body.account_id = norm.accountId
  if (norm.contactId) body.contact_id = norm.contactId
  if (norm.billingAddressId) body.billing_address_id = norm.billingAddressId
  if (norm.shippingAddressId) body.shipping_address_id = norm.shippingAddressId
  // Send `items` only when the caller passes an array (full-replace). `undefined`
  // omits the key → backend deep-copies the source items.
  if (norm.items) body.items = norm.items
  return apiClient.post<SalesOrderWire>(
    endpoints.crm.salesOrderRevise(id),
    Object.keys(body).length > 0 ? body : undefined,
  )
}

// ── Per-line approval surface (spec §B7/B8/B10) ────────────────────────
//
// Hard limits mirror the backend Pydantic schemas (LineApproveRequest,
// LineRejectRequest, LineReassignRequest). The dialogs enforce these
// client-side so the user gets immediate feedback instead of a 422
// round-trip.

export const SO_LINE_NOTES_MAX = 1000
export const SO_REASSIGN_REASON_MAX = 500

export interface LineApproveBody {
  notes?: string
}
export interface LineRejectBody {
  notes: string
}
export interface LineReassignBody {
  new_approver_id: string
  reason: string
}

// PATCH /crm/sales-orders/{so_id}/lines/{line_id}/approve
// Body: { notes?: ≤1000 }. Permission: crm:so_approve. Backend rejects with:
//   - 403 LINE_NOT_OWNED_BY_CALLER     — caller isn't the line's approver
//   - 409 LINE_ALREADY_DECIDED         — line isn't Pending anymore
// Side effects: line_status='Approved'; header recomputes (Approved on last,
// PartiallyApproved otherwise).
export async function approveSalesOrderLine(
  soId: string,
  lineId: string,
  body: LineApproveBody = {},
): Promise<SalesOrderWire> {
  return apiClient.patch<SalesOrderWire>(
    endpoints.crm.salesOrderLineApprove(soId, lineId),
    body,
  )
}

// PATCH /crm/sales-orders/{so_id}/lines/{line_id}/reject
// Body: { notes: 1..1000 } REQUIRED. Permission: crm:so_approve.
// First-rejection-wins — SO header flips to Rejected and freezes other
// Pending lines until POST /revise.
export async function rejectSalesOrderLine(
  soId: string,
  lineId: string,
  body: LineRejectBody,
): Promise<SalesOrderWire> {
  return apiClient.patch<SalesOrderWire>(
    endpoints.crm.salesOrderLineReject(soId, lineId),
    body,
  )
}

// PATCH /crm/sales-orders/{so_id}/lines/{line_id}/reassign
// Body: { new_approver_id, reason: 1..500 }. Permission: crm:so_reassign.
// Only Pending lines can be reassigned. Backend rejects with:
//   - 409 LINE_NOT_PENDING / LINE_ALREADY_DECIDED
//   - 422 SO_APPROVER_LACKS_PERMISSION — target lacks crm:so_approve
export async function reassignSalesOrderLine(
  soId: string,
  lineId: string,
  body: LineReassignBody,
): Promise<SalesOrderWire> {
  return apiClient.patch<SalesOrderWire>(
    endpoints.crm.salesOrderLineReassign(soId, lineId),
    body,
  )
}
