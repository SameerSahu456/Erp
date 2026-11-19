import type { RentalSalesOrderActionKind } from "./api/agreements"

// Rentals permission catalog. Mirrors `src/modules/ims/permissions.ts` so
// the shared RBAC API (`<Can />`, `usePermission()`, `PermissionGuard`,
// `RouteGuard`) consumes rentals codes the same way.
//
// Backend source of truth: `app/core/rbac/codes.py` (the `RENTALS_*`
// constants) and `app/modules/auth/rbac_seed.py`. Finer-grained than the
// IMS read/manage pair because two rentals actions carry consequences a
// general "manage" grant should not imply:
//
//   rentals:run_billing     raises real invoices against real customers
//   rentals:invoice_delete  removes a FINANCIAL record — granted to NO
//                           role by default; superusers reach it via the
//                           is_superuser bypass
//
// There is deliberately no `rentals:invoice_edit`. An invoice is never
// amended in place — a first invoice raised wrong is deleted and
// regenerated, which is delete + create.

export const rentalsPermissions = {
  /** Read rental orders, tracked units, invoices and billing settings. */
  READ: "rentals:read",
  /** Edit billing defaults and unit details. */
  MANAGE: "rentals:manage",
  /** Set or amend a sales order's rental billing cadence. */
  CONFIGURE: "rentals:configure",
  /** Put units on hold and unholds. */
  HOLD: "rentals:hold",
  /** Raise a return for rented units, and read the return register.
   *
   *  Carved out of `crm:manage`, which is what the WMS return form's
   *  route and endpoints were gated on — so the device menu's Return
   *  action landed on No Access for a rentals operator who had no
   *  business editing leads, accounts or quotes.
   *
   *  RAISING only: approving or cancelling a return is `RETURN_APPROVE`
   *  (or `crm:manage`), the same split `AGREEMENT_APPROVE` draws against
   *  `CONFIGURE`. */
  RETURN: "rentals:return",
  /** Approve / reject, cancel or reassign a rental return — the rental
   *  manager, alongside the category PM (who comes in through crm:manage). */
  RETURN_APPROVE: "rentals:return_approve",
  /** Approve / reject a RATE CHANGE made by amending a rental sales order.
   *  Role-based: any holder decides it; the category PM does not. */
  RATE_CHANGE_APPROVE: "rentals:rate_change_approve",
  /** Raise a replacement on a rental order (WMS replacement request). */
  REPLACE: "rentals:replace",
  /** Approve / reject a replacement line on a rental order. */
  REPLACE_APPROVE: "rentals:replace_approve",
  /** Edit a pending replacement request on a rental order. */
  REPLACE_EDIT: "rentals:replace_edit",
  /** Reassign a replacement line's approver on a rental order. */
  REPLACE_REASSIGN: "rentals:replace_reassign",
  /** Write off a replacement line's outstanding return on a rental order. */
  REPLACE_WAIVE_RETURN: "rentals:replace_waive_return",
  /** Extend a rental order's period, or one unit's. Device extend moved
   *  here from MANAGE (`rentals_rbac_split_01`). */
  EXTEND: "rentals:extend",
  /** Decide a rate-changing extend — a PM's call, not the requester's. */
  EXTEND_APPROVE: "rentals:extend_approve",
  /** Request an early termination — it waits for TERMINATE_APPROVE. */
  TERMINATE: "rentals:terminate",
  /** Decide a termination request; approving terminates the order. */
  TERMINATE_APPROVE: "rentals:terminate_approve",
  /** Raise rental invoices by hand, including the one-time first invoice. */
  INVOICE_CREATE: "rentals:invoice_create",
  /** Request an invoice's deletion — it waits for INVOICE_DELETE_APPROVE. */
  INVOICE_DELETE: "rentals:invoice_delete",
  /** Decide an invoice deletion request; approving deletes the invoice. */
  INVOICE_DELETE_APPROVE: "rentals:invoice_delete_approve",
  /** Trigger a billing run by hand. */
  RUN_BILLING: "rentals:run_billing",
  /** Turn SCHEDULED billing on or off and set when it runs. Split out of
   *  RUN_BILLING (`rentals_rbac_split_01`): one run by hand and switching
   *  every future run off are different authorities. */
  AUTO_BILLING_MANAGE: "rentals:auto_billing_manage",
  /** Record a signature on an agreement version, and file or remove the
   *  signed scan. Split out of AGREEMENT_APPROVE: filing the paperwork is
   *  not deciding the contract. */
  SIGNATURE_RECORD: "rentals:signature_record",
  /** Mark a unit delivered, which moves the date its billing starts. */
  DELIVERY_RECORD: "rentals:delivery_record",
  /** Download invoices or the invoice register as files. */
  INVOICE_EXPORT: "rentals:invoice_export",
  /** Open a rental agreement's page. It reads the sales order, and the
   *  backend opens that read for rental orders only to this code — so the
   *  page needs no CRM sales-order code (2026-11-16). */
  AGREEMENT_VIEW: "rentals:agreement_view",
  /**
   * Put a rental agreement IN FORCE — the authority to SHIP. WMS refuses
   * to create a dispatch request for an agreement that is not `Active`,
   * so this is the grant that unblocks the warehouse. Distinct from
   * CONFIGURE, which only fixes the billing terms.
   */
  AGREEMENT_APPROVE: "rentals:agreement_approve",
  /**
   * Record money given back on an invoice that STANDS. Separate from
   * INVOICE_DELETE: a void is only possible on an order's newest invoice
   * and rewinds the period, a credit note works on any invoice and
   * rewinds nothing.
   */
  CREDIT_NOTE_CREATE: "rentals:credit_note_create",
  /** Approve a serial swap between two of a customer's orders. */
  SWAP_APPROVE: "rentals:swap_approve",
  /** Issue the credit note a billing adjustment asks for. */
  ADJUSTMENT_ISSUE: "rentals:adjustment_issue",
  /** Ask to waive an early-exit charge or exempt an account from it. */
  EARLY_EXIT_WAIVE: "rentals:early_exit_waive",
  /** Approve an early-exit waiver. Never the requester. */
  EARLY_EXIT_WAIVE_APPROVE: "rentals:early_exit_waive_approve",
  /** Record a customer PO and Extend PO — the rental manager and accounts;
   *  sales reach the same endpoints through `crm:manage`. */
  PO_MANAGE: "rentals:po_manage",
  /** Approve / reject an Extend PO that carries new rates. Never the
   *  requester. */
  PO_EXTEND_APPROVE: "rentals:po_extend_approve",
} as const

// ─── Ergonomic per-action helpers ────────────────────────────────────
//
// Each entry is an OR-bundle the `can()` helper unwraps. Use these — not
// the raw codes — in sidebar `requiredPermissions`, RouteGuard `required`
// and PermissionGuard `required` props.

export const rentalsCan = {
  /** Read access — list pages, detail cards, the account Billings tab. */
  // READ alone: every rentals GET is gated on `rentals:read` and nothing
  // else, so a MANAGE- or CONFIGURE-only holder shown these pages would
  // land on a wall of 403s.
  view: [rentalsPermissions.READ] as const,

  /** The agreement detail page — exactly the code the backend's sales-order
   *  read accepts for a rental order. */
  viewAgreement: [rentalsPermissions.AGREEMENT_VIEW] as const,

  /** Edit an account's billing defaults. */
  manage: [rentalsPermissions.MANAGE] as const,

  /** The Configure / Amend button and page. Exactly the backend gate
   *  (`require_permission(rentals:configure)`): `manage` used to ride along
   *  here, which showed rental_manager a form whose save then 403'd. */
  configure: [rentalsPermissions.CONFIGURE] as const,

  /** Hold / un-hold an order or a tracked unit. */
  hold: [rentalsPermissions.HOLD] as const,

  /** Extend an order or one of its units. */
  extend: [rentalsPermissions.EXTEND] as const,

  /** Approve or reject a queued rate-changing extend. */
  approveExtend: [rentalsPermissions.EXTEND_APPROVE] as const,

  /** Request a termination; it waits for approval (2026-11-14). */
  terminate: [rentalsPermissions.TERMINATE] as const,
  /** Decide a termination request — the rental manager, own ones included. */
  approveTermination: [rentalsPermissions.TERMINATE_APPROVE] as const,

  /** Raise an invoice by hand. */
  createInvoice: [rentalsPermissions.INVOICE_CREATE] as const,

  /**
   * Request an invoice's deletion; it waits for approval (2026-11-14).
   * Deliberately NOT bundled with `manage` — deleting a financial record is
   * an explicit grant.
   */
  deleteInvoice: [rentalsPermissions.INVOICE_DELETE] as const,
  /** Decide an invoice deletion request — the rental manager. */
  approveInvoiceDelete: [rentalsPermissions.INVOICE_DELETE_APPROVE] as const,

  /** Trigger a billing run by hand. */
  runBilling: [rentalsPermissions.RUN_BILLING] as const,

  /**
   * Approve an agreement. Deliberately NOT bundled with `configure` —
   * configuring says what the order would bill, approving says the
   * contract is agreed and the goods may go out, and the business wanted
   * those separable. Held by the `accounts` role (2026-10-20).
   */
  approveAgreement: [rentalsPermissions.AGREEMENT_APPROVE] as const,

  /** Record a credit note. Not bundled with `deleteInvoice`. */
  createCreditNote: [rentalsPermissions.CREDIT_NOTE_CREATE] as const,

  /** Propose a serial swap; record a lost device or reverse it. */
  returnUnits: [rentalsPermissions.RETURN] as const,
  /** Decide (approve / reject) or cancel a rental return — the rental manager. */
  decideReturn: [rentalsPermissions.RETURN_APPROVE] as const,
  // Opens the PM Approvals sales-order queue for rental rate changes only.
  approveRateChange: [rentalsPermissions.RATE_CHANGE_APPROVE] as const,
  /** Read the replacement register — rental orders only, unless the viewer
   *  also holds a CRM / warehouse read code. */
  replacementView: [
    rentalsPermissions.REPLACE,
    rentalsPermissions.REPLACE_APPROVE,
  ] as const,
  /** Raise a replacement on a rental order. */
  raiseReplacement: [rentalsPermissions.REPLACE] as const,
  /** Decide a replacement line on a rental order — the rental manager. */
  decideReplacement: [rentalsPermissions.REPLACE_APPROVE] as const,
  /** Write off a replacement line's outstanding return on a rental order. */
  waiveReplacementReturn: [rentalsPermissions.REPLACE_WAIVE_RETURN] as const,
  /** Edit a pending replacement request on a rental order. */
  editReplacement: [rentalsPermissions.REPLACE_EDIT] as const,
  /** Reassign a replacement line's approver on a rental order. */
  reassignReplacement: [rentalsPermissions.REPLACE_REASSIGN] as const,
  /** Approve / reject a serial swap — the rental product manager. */
  approveSwap: [rentalsPermissions.SWAP_APPROVE] as const,
  /** Issue a billing adjustment's credit note — accounts. */
  issueAdjustment: [rentalsPermissions.ADJUSTMENT_ISSUE] as const,
  /** Request an early-exit waiver / account exemption — sales. */
  requestEarlyExitWaiver: [rentalsPermissions.EARLY_EXIT_WAIVE] as const,
  /** Decide an early-exit waiver — a manager, their own request included. */
  approveEarlyExitWaiver: [rentalsPermissions.EARLY_EXIT_WAIVE_APPROVE] as const,
  /** Record a customer PO / Extend PO. Exactly the backend gate:
   *  `require_permission(crm:manage, rentals:po_manage)`. */
  managePurchaseOrders: ["crm:manage", rentalsPermissions.PO_MANAGE] as const,
  /** Decide an Extend PO that waits (new rates, or a lapsed PO) — the
   *  rental manager, accounts, or a sales manager given the code; the raiser
   *  may approve their own. */
  approvePurchaseOrders: [rentalsPermissions.PO_EXTEND_APPROVE] as const,
  /** Edit the PO renewal email — the billing-settings gate. */
  poRenewalSettings: [rentalsPermissions.RUN_BILLING] as const,
  /** Edit `/rentals/settings` (scheduler, policy, agreement defaults) —
   *  exactly the backend's `PUT /rentals/settings` gate, which is
   *  AUTO_BILLING_MANAGE: running billing once is not the authority to
   *  switch every future run off (RBAC audit 2026-10-30). */
  editSettings: [rentalsPermissions.AUTO_BILLING_MANAGE] as const,

  /** Record a signature, and upload or remove the signed document. */
  recordSignature: [rentalsPermissions.SIGNATURE_RECORD] as const,

  /** Mark a unit delivered. */
  recordDelivery: [rentalsPermissions.DELIVERY_RECORD] as const,

  /** Download an invoice or the register as a file. */
  exportInvoices: [rentalsPermissions.INVOICE_EXPORT] as const,
} as const

/**
 * The code(s) each order-menu action's ENDPOINT accepts. The server builds
 * the menu from the order's state alone, not the viewer's grants, so
 * without this a viewer saw entries — even the primary "Approve agreement"
 * button — whose click could only 403. Each bundle mirrors the backend's
 * `require_permission(...)` on that action exactly.
 */
export const rentalsActionPermissions: Record<
  RentalSalesOrderActionKind,
  readonly string[]
> = {
  approve: rentalsCan.approveAgreement,
  // Approve's other outcome (`POST .../reject`): same authority, same gate.
  reject: rentalsCan.approveAgreement,
  // `POST /rentals/sales-orders/{id}/first-invoice`.
  first_invoice: rentalsCan.createInvoice,
  amend: rentalsCan.configure,
  extend: [rentalsPermissions.EXTEND],
  // `POST /rentals/sales-orders/{id}/purchase-orders/extend`.
  extend_po: rentalsCan.managePurchaseOrders,
  hold: rentalsCan.hold,
  unhold: rentalsCan.hold,
  // `POST /crm/replacement-requests` — raised in WMS; rentals:replace opens
  // it for rental orders.
  replacement: ["crm:manage", "wms:outward_manage", rentalsPermissions.REPLACE],
  // The return FORM (`/wms/rental-returns/new`): crm:manage | rentals:return.
  // The create endpoint also takes wms:outward_manage, but the form's
  // customer picker needs CRM read, so the warehouse is not offered it.
  return: ["crm:manage", rentalsPermissions.RETURN],
  terminate: rentalsCan.terminate,
}
