// IMS permission catalog. Mirrors the structure of
// `src/modules/crm/permissions.ts` so the shared RBAC API (`<Can />`,
// `usePermission()`, `PermissionGuard`, `RouteGuard`) consumes IMS
// codes the same way it consumes CRM codes.
//
// Two codes drive the entire module:
//
//   ims:read    → user can list / view / preview IMS resources
//   ims:manage  → user can also create / edit / delete
//
// Superusers bypass these checks at `usePermission()` level
// (`isSuperuser` short-circuit). Any role the backend grants both
// codes to gets full IMS CRUD; any role granted only `ims:read` sees
// read-only IMS UI; any role with neither code can't see the Inventory
// sidebar group or load IMS routes at all. The FE never gates on role
// name — only on these two codes.
//
// History: the previous catalog was a per-resource matrix
// (`ims.category.view`, `ims.part.delete`, etc.) — never wired into a
// guard. Replaced with the simpler read/manage pair so the call sites
// stay declarative.

export const imsPermissions = {
  /** Read everything in IMS (lists, detail pages, dropdown options). */
  READ: "ims:read",
  /** Create / edit / delete IMS resources. Implies READ on the API gate. */
  MANAGE: "ims:manage",
  /**
   * See variant `sell_price` and its change history.
   *
   * NOT implied by MANAGE — deliberately. The `ims_manager` role holds
   * `ims:manage` and is precisely who sell price is hidden from, so no
   * pricing gate can be built on that code.
   *
   * Prefer keying price UI off payload shape (the backend omits the field
   * for callers without this code) rather than checking this directly —
   * an independent FE check can drift from the API gate. This constant
   * exists for the cases where no payload signal is available.
   */
  PRICE_READ: "ims:price_read",
  /**
   * Change a variant's `sell_price`. Layer-2 only — the API additionally
   * requires a `manage` `pm_assignments` row covering the variant's
   * (category, oem, condition), so holding this code does not guarantee a
   * given save will succeed.
   */
  PRICE_WRITE: "ims:price_write",
  /** Draft, edit, submit and cancel stock adjustments (maker). */
  STOCK_ADJUST: "ims:stock_adjust",
  /** Approve / reject someone else's submitted stock adjustment (checker). */
  STOCK_ADJUST_APPROVE: "ims:stock_adjust_approve",
  /** Approve one's OWN adjustment too (super admin exception, spec D9). */
  STOCK_ADJUST_SELF_APPROVE: "ims:stock_adjust_self_approve",
  /** Request IMS exports and download one's own export files. */
  EXPORT: "ims:export",
  /** See and download every user's exports, not only one's own. */
  EXPORT_VIEW_ALL: "ims:export_view_all",
} as const;

// ─── Ergonomic per-action helpers ────────────────────────────────────────────
//
// Each entry is an OR-bundle the `can()` helper unwraps. Use these
// (not the raw codes) in sidebar `requiredPermissions`, RouteGuard
// `required`, and PermissionGuard `required` props — they keep call
// sites readable and let the read/manage hierarchy evolve in one place
// rather than at every call site.

export const imsCan = {
  /**
   * Read access — list pages, detail pages, dropdown options.
   * Any user whose token carries `ims:read` OR `ims:manage` passes
   * (manage implies read on the API gate, so the OR-bundle is safe).
   * Superusers bypass via `usePermission().isSuperuser`.
   */
  view: [imsPermissions.READ, imsPermissions.MANAGE] as const,

  /**
   * Write access — create / edit form pages, save buttons, inline
   * pencil/trash actions in tables. Only `ims:manage` holders pass;
   * `ims:read` users see data without action affordances.
   */
  write: [imsPermissions.MANAGE] as const,

  /**
   * Alias for `write` — kept distinct so destructive confirmations
   * could later require a separate `ims:delete` code without touching
   * every call site.
   */
  delete: [imsPermissions.MANAGE] as const,

  /** Stock adjustments list + detail — makers and checkers both see them. */
  stockAdjustView: [
    imsPermissions.STOCK_ADJUST,
    imsPermissions.STOCK_ADJUST_APPROVE,
  ] as const,
  /** Create / edit / submit / cancel a draft adjustment. */
  stockAdjust: [imsPermissions.STOCK_ADJUST] as const,
  /** Approve / reject a submitted adjustment. */
  stockAdjustApprove: [imsPermissions.STOCK_ADJUST_APPROVE] as const,
  /** Export menus + the My exports page. */
  export: [imsPermissions.EXPORT] as const,
  /** "Requested by" column — every user's export jobs. */
  exportViewAll: [imsPermissions.EXPORT_VIEW_ALL] as const,
} as const;
