// Mirrors `comprint-erp-backend/app/core/rbac/codes.py` character-for-character.
// Drift between this map and the backend's `ALL_CODES` frozenset will surface
// as buttons that do nothing (FE allows, BE 403s) or buttons that are
// silently absent (FE denies, BE would have allowed). Keep the ordering
// matched to the backend file so diffs are easy.

export const crmPermissions = {
  // ── Broad (day-1) ─────────────────────────────────────────────────
  READ: "crm:read",
  MANAGE: "crm:manage",
  APPROVE: "crm:approve",
  LEAD_CONVERT: "crm:lead_convert",

  // ── Lead ──────────────────────────────────────────────────────────
  LEAD_READ: "crm:lead_read",
  LEAD_WRITE: "crm:lead_write",
  LEAD_DELETE: "crm:lead_delete",
  LEAD_VIEW_UNASSIGNED: "crm:lead_view_unassigned",

  // ── Account (with approval gate) ──────────────────────────────────
  ACCOUNT_READ: "crm:account_read",
  ACCOUNT_WRITE: "crm:account_write",
  ACCOUNT_DELETE: "crm:account_delete",
  ACCOUNT_APPROVE: "crm:account_approve",
  ACCOUNT_REQUEST_APPROVE: "crm:account_request_approve",
  // Gate on the Account 360° tab (FE-only). Seeded to `product_manager` and
  // `asst_product_manager` in the backend by migration
  // `crm_account_360_view_perm_01`; admin/superadmin bypass permission
  // checks entirely and see the tab regardless.
  ACCOUNT_360_VIEW: "crm:account_360_view",

  // ── Contact ───────────────────────────────────────────────────────
  CONTACT_READ: "crm:contact_read",
  CONTACT_WRITE: "crm:contact_write",
  CONTACT_DELETE: "crm:contact_delete",

  // ── Deal ──────────────────────────────────────────────────────────
  DEAL_READ: "crm:deal_read",
  DEAL_WRITE: "crm:deal_write",
  DEAL_DELETE: "crm:deal_delete",
  DEAL_VIEW_UNASSIGNED: "crm:deal_view_unassigned",

  // ── Quote (document — has approve) ────────────────────────────────
  QUOTE_READ: "crm:quote_read",
  QUOTE_WRITE: "crm:quote_write",
  QUOTE_DELETE: "crm:quote_delete",
  QUOTE_APPROVE: "crm:quote_approve",

  // ── Material Inquiry (document — has approve) ─────────────────────
  MI_READ: "crm:mi_read",
  MI_WRITE: "crm:mi_write",
  MI_DELETE: "crm:mi_delete",
  MI_APPROVE: "crm:mi_approve",

  // ── Demo Request (document — has approve) ─────────────────────────
  DR_READ: "crm:dr_read",
  DR_WRITE: "crm:dr_write",
  DR_DELETE: "crm:dr_delete",
  DR_APPROVE: "crm:dr_approve",

  // ── Task (relational — no approve; complete/cancel are write transitions) ──
  TASK_READ: "crm:task_read",
  TASK_WRITE: "crm:task_write",
  TASK_DELETE: "crm:task_delete",

  // ── Meeting (relational — no approve; complete/cancel are write transitions) ──
  MEETING_READ: "crm:meeting_read",
  MEETING_WRITE: "crm:meeting_write",
  MEETING_DELETE: "crm:meeting_delete",

  // ── User Activity Log (GET /api/v1/crm/activity-log) ──────────────
  // Seeded but ungranted; only is_superuser bypasses today (see backend
  // codes.py CRM_USER_LOG_READ). Grant to a finer role via seed migration.
  USER_LOG_READ: "crm:user_log_read",

  // ── User Sales Target (FY-scoped revenue targets) ─────────────────
  // Single endpoint gate — scope resolution (self / team / all) and
  // approval routing (whether the target subject's roles grant
  // USER_TARGET_REQUIRES_APPROVAL) live in the service. Admin / superadmin
  // bypass via is_superuser. Day-1 grant: product_manager + asst_product_manager.
  USER_TARGET: "crm:user_target",
  // Gate on POST /crm/user-targets/ — separate from USER_TARGET so a role can
  // view the Sale Targets page without seeing the "Set target" CTA.
  USER_TARGET_CREATE: "crm:user_target_create",
  // Flag-style permission held by the TARGET SUBJECT (not the actor). When
  // a target is created for a user whose roles grant this permission, the
  // service routes the row to PendingApproval; otherwise auto-approve.
  USER_TARGET_REQUIRES_APPROVAL: "crm:user_target_requires_approval",

  // ── Sales Order (already shipped, unchanged) ──────────────────────
  SO_READ: "crm:so_read",
  SO_WRITE: "crm:so_write",
  SO_APPROVE: "crm:so_approve",
  SO_REASSIGN: "crm:so_reassign",
  SO_MANAGE: "crm:so_manage",

  // ── Customer deficiencies (return-by-count recovery queue) ────────
  DEFICIENCY_MANAGE: "crm:deficiency_manage",
  DEFICIENCY_WAIVE_APPROVE: "crm:deficiency_waive_approve",
  // Write off a replacement's outstanding return.
  RR_WAIVE_RETURN: "crm:rr_waive_return",
} as const;

// Ready-made OR-bundles matching each backend endpoint's
// `require_permission(broad, finer)` call. Broad code is listed first to
// match the backend gate order. Pass directly to `<PermissionGuard required={…}>`,
// `<RouteGuard required={…}>`, or `usePermission().can(…)`.
const P = crmPermissions;

export const crmCan = {
  // ── Lead ──────────────────────────────────────────────────────────
  readLead: [P.READ, P.LEAD_READ],
  writeLead: [P.MANAGE, P.LEAD_WRITE],
  deleteLead: [P.MANAGE, P.LEAD_DELETE],
  convertLead: [P.MANAGE, P.LEAD_CONVERT],

  // ── Account ───────────────────────────────────────────────────────
  readAccount: [P.READ, P.ACCOUNT_READ],
  writeAccount: [P.MANAGE, P.ACCOUNT_WRITE],
  deleteAccount: [P.MANAGE, P.ACCOUNT_DELETE],
  // Account KYC approval + access-request review. The backend gates every
  // pending-approval / access-request endpoint on `crm:account_approve`
  // (admin/superadmin pass via the is_superuser bypass), so the FE must gate
  // the Approval + Access tabs and the detail-page approve/reject on the same
  // code — not the broad `crm:approve` — or the two drift (FE shows a tab the
  // API 403s, or hides one the user is allowed).
  approveAccount: [P.ACCOUNT_APPROVE],
  // View the Account 360° tab on the account detail page. Not folded into
  // `readAccount` — the account itself is readable more widely; the 360°
  // view is a whole-account revenue lens gated to a smaller set of roles.
  viewAccount360: [P.ACCOUNT_360_VIEW],
  // Account access-request approval — a DISTINCT gate from KYC approval. The
  // backend gates `/accounts/access-requests` (+ approve/reject) ONLY on the
  // finer `crm:account_request_approve` code (no broad `crm:approve` fallback),
  // so this bundle is finer-only too.
  approveAccountRequest: [P.ACCOUNT_REQUEST_APPROVE],

  // ── Contact ───────────────────────────────────────────────────────
  readContact: [P.READ, P.CONTACT_READ],
  writeContact: [P.MANAGE, P.CONTACT_WRITE],
  deleteContact: [P.MANAGE, P.CONTACT_DELETE],

  // ── Deal ──────────────────────────────────────────────────────────
  readDeal: [P.READ, P.DEAL_READ],
  writeDeal: [P.MANAGE, P.DEAL_WRITE],
  deleteDeal: [P.MANAGE, P.DEAL_DELETE],

  // ── Quote ─────────────────────────────────────────────────────────
  readQuote: [P.READ, P.QUOTE_READ],
  writeQuote: [P.MANAGE, P.QUOTE_WRITE],
  deleteQuote: [P.MANAGE, P.QUOTE_DELETE],
  approveQuote: [P.APPROVE, P.QUOTE_APPROVE],

  // ── Customer deficiencies (recovery queue) ────────────────────────
  readDeficiency: [P.READ, P.DEFICIENCY_MANAGE],
  manageDeficiency: [P.DEFICIENCY_MANAGE],
  approveDeficiencyWaiver: [P.DEFICIENCY_WAIVE_APPROVE],

  // ── Material Inquiry ──────────────────────────────────────────────
  readMi: [P.READ, P.MI_READ],
  writeMi: [P.MANAGE, P.MI_WRITE],
  deleteMi: [P.MANAGE, P.MI_DELETE],
  approveMi: [P.APPROVE, P.MI_APPROVE],

  // ── Demo Request ──────────────────────────────────────────────────
  readDr: [P.READ, P.DR_READ],
  writeDr: [P.MANAGE, P.DR_WRITE],
  deleteDr: [P.MANAGE, P.DR_DELETE],
  approveDr: [P.APPROVE, P.DR_APPROVE],

  // ── Task ──────────────────────────────────────────────────────────
  // Endpoints OR-gate the finer code alongside the broad code:
  //   GET    /tasks, /tasks/{id}, …        → require_permission(crm:read,   crm:task_read)
  //   POST   /tasks + PATCH/complete/cancel → require_permission(crm:manage, crm:task_write)
  //   DELETE /tasks/{id}                   → require_permission(crm:manage, crm:task_delete)
  readTask: [P.READ, P.TASK_READ],
  writeTask: [P.MANAGE, P.TASK_WRITE],
  deleteTask: [P.MANAGE, P.TASK_DELETE],

  // ── Meeting ───────────────────────────────────────────────────────
  // Endpoints OR-gate the finer code alongside the broad code:
  //   GET    /meetings, /meetings/{id}          → require_permission(crm:read,   crm:meeting_read)
  //   POST   /meetings + PATCH/complete/cancel   → require_permission(crm:manage, crm:meeting_write)
  //   DELETE /meetings/{id}                      → require_permission(crm:manage, crm:meeting_delete)
  readMeeting: [P.READ, P.MEETING_READ],
  writeMeeting: [P.MANAGE, P.MEETING_WRITE],
  deleteMeeting: [P.MANAGE, P.MEETING_DELETE],

  // ── Activity ──────────────────────────────────────────────────────
  // Activities carry no finer-grained codes — endpoints gate on the broad
  // bundle only: GET activities → crm:read, POST activity → crm:manage.
  readActivity: [P.READ],
  writeActivity: [P.MANAGE],

  // ── Note (polymorphic — lead / deal / account / contact) ──────────
  // Notes carry no finer-grained codes — every endpoint gates on the broad
  // bundle only, regardless of the entity the note hangs off:
  //   GET    /{entity}/{id}/notes  → require_permission(crm:read)
  //   POST   /{entity}/{id}/notes  → require_permission(crm:manage)
  //   PATCH  /notes/{id}           → require_permission(crm:manage)
  //   DELETE /notes/{id}           → require_permission(crm:manage)
  // So the FE write gate is `crm:manage` (broad) only — matching the API, so
  // the composer / edit / delete affordances never render for a user the
  // endpoint would 403.
  readNote: [P.READ],
  writeNote: [P.MANAGE],

  // ── Comment (polymorphic — lead / deal / account / contact / MI) ──
  // Same shape as notes — broad-bundle-only gate on every endpoint:
  //   GET    /{entity}/{id}/comments → require_permission(crm:read)
  //   POST   /{entity}/{id}/comments → require_permission(crm:manage)
  //   DELETE /comments/{id}          → require_permission(crm:manage)
  readComment: [P.READ],
  writeComment: [P.MANAGE],

  // ── User Activity Log ─────────────────────────────────────────────
  // Backend gate: require_permission(crm:user_target). Scope + approval
  // decisions happen inside UserSalesTargetService; this bundle only
  // controls whether the endpoint is reachable at all.
  readWriteUserTarget: [P.USER_TARGET],

  // Backend gate: require_permission(crm:user_log_read) with is_superuser
  // bypass. Finer-only (no broad fallback) — mirrors the AUDIT_READ pattern.
  readUserLog: [P.USER_LOG_READ],

  // ── Sales Order ───────────────────────────────────────────────────
  readSo: [P.SO_READ],
  writeSo: [P.SO_WRITE],
  approveSo: [P.SO_APPROVE],
  reassignSo: [P.SO_REASSIGN],
  manageSo: [P.SO_MANAGE],

  // ── Cross-resource transitions (destination-resource gate, spec §"Resolved Decisions" #2) ──
  drConvertToSo: [P.MANAGE, P.SO_WRITE],
  quoteAcceptToSo: [P.MANAGE, P.SO_WRITE],

  // ── Any CRM access ────────────────────────────────────────────────
  // Every `crm:*` code, broad and finer. Gates the CRM sidebar group and the
  // CRM dashboard routes: a user holding no CRM code sees neither. Built from
  // the map above (not hardcoded) so a new code is covered automatically.
  anyCrm: Object.values(P),
} as const satisfies Record<string, readonly string[]>;

// AND-of-OR-bundles for multi-step flows. Each inner array is an OR-bundle
// (broad-OR-finer), and the user must satisfy every bundle to access the
// flow. Pass directly to `<RouteGuard requiredAll={…}>` /
// `<PermissionGuard requiredAll={…}>`.
//
// `closeWonLead` / `closeWonDeal` / `closeWonDr` route through the
// Closed-Won wizard which:
//   1. Picks (or creates) an Account → needs `account_read` minimum
//   2. Picks an Accepted Quote (Lead/Deal only — Demo skips quote step)
//      → needs `quote_read`
//   3. Creates a Sales Order → needs `so_write` (destination gate, spec
//      §"Resolved Decisions" #2)
//   4. Source-resource convert authority → `lead_convert` / `deal_write`
//      / `dr_write`
export const crmCanAll = {
  // Lead close-won always creates a brand-new account from the lead's
  // company details (no existing account on a Lead by definition), so
  // requires write — not read — on Account.
  closeWonLead: [
    crmCan.convertLead,
    crmCan.writeAccount,
    crmCan.readQuote,
    crmCan.writeSo,
  ],
  // Deal already has an account; the wizard reads but does not create it.
  closeWonDeal: [
    crmCan.writeDeal,
    crmCan.readAccount,
    crmCan.readQuote,
    crmCan.writeSo,
  ],
  // Demo close-won has no Quote step (DR is itself an alternate to Quote → SO).
  closeWonDr: [crmCan.writeDr, crmCan.readAccount, crmCan.writeSo],

  // Approve flows require read too — you can't responsibly approve what
  // you can't see. The backend's approve endpoint gates only on the
  // approve code, but its GET (rendering the detail page) gates on read,
  // so without read the user gets a 403 on data fetch and a blank screen.
  // Spec §"Role × resource permission matrix" already guarantees this
  // pairing for every seeded role — this bundle just makes the FE
  // requirement explicit in case a role bundle ever drifts.
  approveMi: [crmCan.approveMi, crmCan.readMi],
  approveDr: [crmCan.approveDr, crmCan.readDr],
  approveSo: [crmCan.approveSo, crmCan.readSo],
  approveQuote: [crmCan.approveQuote, crmCan.readQuote],
} as const;
