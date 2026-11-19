// Central map from an entity kind to its detail-page route AND the RBAC codes
// that route requires. This is the single source of truth that lets any
// identifier shown anywhere (a WA number in a timeline, a dispatch number in a
// table, a barcode on a card) link to the record's own detail page — see the
// shared <EntityRef> primitive.
//
// `permission` is an OR-bundle mirroring the target route's RouteGuard
// `required` (holding ANY code grants access; superuser bypasses). <EntityRef>
// only navigates when the current user satisfies it — otherwise it degrades to
// copy-only, so a user is never redirected to a page they'd be denied. A `null`
// permission means the route is not statically gated (a dynamic guard, or none)
// and is treated as navigable.
//
// The codes are written as literals rather than imported from each module's
// permission bundle on purpose: importing a module barrel into this shared lib
// would risk an import cycle (many module components import <EntityRef>). Each
// line names the bundle it mirrors so drift is easy to catch.

export type EntityKind =
  | "device"
  | "work_assignment"
  | "dispatch"
  | "material_issue"
  | "replacement"
  | "sales_return"
  | "purchase_return"
  | "transfer"
  | "grn"
  | "sales_order"
  | "stock_adjustment"
  | "purchase_order"
  | "account"
  | "lead"
  | "quote"
  | "material_inquiry"
  | "demo_request"

interface EntityRoute {
  build: (id: string) => string
  permission: readonly string[] | null
}

const ROUTES: Record<EntityKind, EntityRoute> = {
  // Dynamic StageRouteGuard (warehouse membership), not a static code — so it
  // can't be pre-checked here; treat as navigable.
  device: { build: (id) => `/wms/devices/${id}`, permission: null },
  // wmsCan.workAssignmentView
  work_assignment: {
    build: (id) => `/wms/work-assignments/${id}`,
    permission: [
      "wms:inspection_read",
      "wms:inspection_manage",
      "wms:repair_read",
      "wms:repair_manage",
      "wms:qc_read",
      "wms:qc_manage",
    ],
  },
  // wmsCan.outwardView
  dispatch: {
    build: (id) => `/wms/dispatches/${id}`,
    permission: ["wms:outward_read", "wms:outward_manage"],
  },
  // OutwardViewGuard is dynamic (QC engineers included), so the route decides — like `device`.
  material_issue: {
    build: (id) => `/wms/material-issue/${id}`,
    permission: null,
  },
  // [crmPermissions.READ, ...wmsCan.returnsView]
  replacement: {
    build: (id) => `/wms/replacements/${id}`,
    permission: ["crm:read", "wms:returns_read", "wms:returns_manage"],
  },
  // [crmPermissions.READ, ...wmsCan.returnsView]
  sales_return: {
    build: (id) => `/wms/sales-returns/${id}`,
    permission: ["crm:read", "wms:returns_read", "wms:returns_manage"],
  },
  // procurementCan.returnView
  purchase_return: {
    build: (id) => `/wms/purchase-returns/${id}`,
    permission: [
      "procurement:po_return_read",
      "procurement:po_return_write",
      "procurement:po_return_settle",
    ],
  },
  // wmsCan.outwardView
  transfer: {
    build: (id) => `/wms/transfers/${id}`,
    permission: ["wms:outward_read", "wms:outward_manage"],
  },
  // A device / timeline `grn` id is a WMS grn_batches id, so it opens the real
  // inward-batch page — NOT the mock procurement GRN-matching screen, which
  // only knows fabricated ids and rendered "GRN Entry Not Found".
  // wmsCan.inwardView (RouteGuard on inward/:id/devices).
  grn: {
    build: (id) => `/wms/inward/${id}/devices`,
    permission: ["wms:inward_read", "wms:inward_manage"],
  },
  // crmCan.readSo
  sales_order: {
    build: (id) => `/crm/sales-orders/${id}`,
    permission: ["crm:so_read"],
  },
  // imsCan.stockAdjustView (admin / superadmin; superuser bypasses)
  stock_adjustment: {
    build: (id) => `/ims/stock-adjustments/${id}`,
    permission: ["ims:stock_adjust", "ims:stock_adjust_approve"],
  },
  // procurementCan.readPo
  purchase_order: {
    build: (id) => `/procurement/po/${id}`,
    permission: ["procurement:po_read", "procurement:read"],
  },
  // crmCan.readAccount
  account: { build: (id) => `/crm/accounts/${id}`, permission: ["crm:read", "crm:account_read"] },
  // crmCan.readLead
  lead: { build: (id) => `/crm/leads/${id}`, permission: ["crm:read", "crm:lead_read"] },
  // crmCan.readQuote
  quote: { build: (id) => `/crm/quotes/${id}`, permission: ["crm:read", "crm:quote_read"] },
  // crmCan.readMi
  material_inquiry: {
    build: (id) => `/crm/material-inquiries/${id}`,
    permission: ["crm:read", "crm:mi_read"],
  },
  // crmCan.readDr
  demo_request: { build: (id) => `/crm/demo-requests/${id}`, permission: ["crm:read", "crm:dr_read"] },
}

/** The detail-page path for one record, or null when the kind isn't routable
 *  (unknown kind, or a missing id). Callers render plain text on null. */
export function entityPath(
  kind: EntityKind,
  id: string | null | undefined,
): string | null {
  if (!id) return null
  const route = ROUTES[kind]
  return route ? route.build(id) : null
}

/** The OR-bundle of RBAC codes the detail route AT `path` requires, or null
 *  when it isn't a known/statically-gated route. Matching on the resolved path
 *  (not the kind) means an explicit-`href` <EntityRef> is gated the same as a
 *  kind-based one — so a cross-module link (a WMS page pointing at a CRM record,
 *  say) is access-checked without the caller having to name the kind. */
export function entityPermissionForPath(
  path: string,
): readonly string[] | null {
  for (const route of Object.values(ROUTES)) {
    const prefix = route.build("").replace(/\/+$/, "")
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return route.permission
    }
  }
  return null
}
