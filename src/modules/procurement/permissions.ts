// Mirrors `comprint-erp-backend/app/core/rbac/codes.py` Procurement section.
// Every `/procurement/*` endpoint gates on `[fine_code, umbrella_code]` — holding
// either passes. Frontend bundles below encode the same pairs so gated UI hides
// exactly what the backend would 403.

export const procurementPermissions = {
  // Umbrella (legacy — kept as OR-fallback on every endpoint).
  READ: "procurement:read",
  RESPOND: "procurement:respond",
  APPROVE: "procurement:approve",

  // Vendor master.
  VENDOR_READ: "procurement:vendor_read",
  VENDOR_WRITE: "procurement:vendor_write",
  VENDOR_DELETE: "procurement:vendor_delete",

  // Purchase Order.
  PO_READ: "procurement:po_read",
  PO_WRITE: "procurement:po_write",
  PO_DELETE: "procurement:po_delete",
  PO_APPROVE: "procurement:po_approve",

  // Purchase Request — codes seeded on the backend, endpoints not shipped yet.
  PR_READ: "procurement:pr_read",
  PR_WRITE: "procurement:pr_write",
  PR_DELETE: "procurement:pr_delete",
  PR_APPROVE: "procurement:pr_approve",

  // Purchase Return — separate namespace, unchanged.
  PO_RETURN_READ: "procurement:po_return_read",
  PO_RETURN_WRITE: "procurement:po_return_write",
  PO_RETURN_SETTLE: "procurement:po_return_settle",
} as const;

const P = procurementPermissions;

// DRY helper — read bundles keep the backend's `[fine, umbrella]` OR shape.
// Write / delete bundles below intentionally drop the umbrella `respond` so
// only the fine code opens the UI (see comment on `procurementCan`).
const orUmbrella = <F extends string, U extends string>(
  fine: F,
  umbrella: U,
): readonly [F, U] => [fine, umbrella] as const;

// OR-bundles for gated UI. Read bundles honour both fine and umbrella codes
// (matches the backend gate), but WRITE / DELETE bundles list ONLY the fine
// code — the umbrella `procurement:respond` is deliberately excluded so that
// removing a fine code (e.g. `vendor_write` from a role) actually hides the
// button, even when the role still carries `respond` for other endpoints
// (MI vendor responses, legacy roles mid-migration).
//
// Trade-off: this diverges from the backend OR-list — a user holding only
// `procurement:respond` will see the FE hide the button but the API would
// still accept a direct call. Acceptable for the transition window because
// nobody is granted `respond` without also being granted the fine codes on
// the roles that need vendor/PO/PR write. Revisit if that stops being true.
export const procurementCan = {
  // Legacy umbrella bundles — retained for callers that still gate on the
  // coarse code (MI response endpoints, PM inquiry queue).
  read: [P.READ],
  respond: [P.READ, P.RESPOND],
  approve: [P.APPROVE],

  // Vendor.
  readVendor: orUmbrella(P.VENDOR_READ, P.READ),
  writeVendor: [P.VENDOR_WRITE],
  deleteVendor: [P.VENDOR_DELETE],

  // Purchase Order.
  readPo: orUmbrella(P.PO_READ, P.READ),
  writePo: [P.PO_WRITE],
  deletePo: [P.PO_DELETE],
  approvePo: orUmbrella(P.PO_APPROVE, P.APPROVE),

  // Purchase Request.
  readPr: orUmbrella(P.PR_READ, P.READ),
  writePr: [P.PR_WRITE],
  deletePr: [P.PR_DELETE],
  approvePr: orUmbrella(P.PR_APPROVE, P.APPROVE),

  // Purchase Return (unchanged).
  returnView: [P.PO_RETURN_READ, P.PO_RETURN_WRITE, P.PO_RETURN_SETTLE],
  returnWrite: [P.PO_RETURN_WRITE],
  returnSettle: [P.PO_RETURN_SETTLE],
} as const satisfies Record<string, readonly string[]>;

// Union of all procurement read bundles — for the module dashboard entry
// (visible when the user can read ANY procurement resource).
export const procurementCanAnyRead = [
  ...procurementCan.readVendor,
  ...procurementCan.readPo,
  ...procurementCan.readPr,
] as const;

// AND-of-OR-bundles for flows requiring multiple permissions. Approve flows
// need read too — you can't responsibly approve what you can't see, and the
// detail page GET is gated on read. Pass to `<RouteGuard requiredAll={…}>`.
export const procurementCanAll = {
  approvePo: [procurementCan.approvePo, procurementCan.readPo],
  approvePr: [procurementCan.approvePr, procurementCan.readPr],
} as const;
