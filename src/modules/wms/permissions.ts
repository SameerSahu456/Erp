// WMS permission catalog. Mirrors the backend `app/core/rbac/codes.py`
// WMS block so the shared RBAC API (`usePermission()`, `PermissionGuard`)
// can reference these codes.
//
// ⚠️ IMPORTANT — device-stage authority is NOT code-based.
// For the device operation stages (inspection / repair / service_job / qc /
// rack_assign / spares / devices_scrap) the backend gate
// `require_stage(stage, action)` resolves authority from the user's
// *warehouse_user_assignment* (role + capabilities at the device's
// warehouse), NOT from these global permission codes. Operators hold
// NONE of the `wms:*` codes below — their power comes entirely from
// their warehouse assignment. So gating a stage button with
// `can('wms:inspection_manage')` would WRONGLY hide it from the very
// operators who can do the work.
//
// The correct gate for stage actions is `useWmsStageAccess()` (see
// hooks/operations/useStageAccess.ts), which checks superuser →
// store_manager/mis → operator-with-capability at that warehouse via
// GET /wms/my-warehouses. These codes remain useful only for the
// device-less master stages (service_vendor) and for documentation parity
// with the backend.

export const wmsPermissions = {
  INSPECTION_READ: "wms:inspection_read",
  INSPECTION_MANAGE: "wms:inspection_manage",
  INSPECTION_COMPLETE: "wms:inspection_complete",

  REPAIR_READ: "wms:repair_read",
  REPAIR_MANAGE: "wms:repair_manage",
  REPAIR_COMPLETE: "wms:repair_complete",

  // Vendor services — ONE set for every third-party section (paint, display
  // repair, battery boost, …). There is deliberately no per-section code:
  // minting one would put the section back into the code, which is exactly
  // what this feature removes.
  SERVICE_JOB_READ: "wms:service_job_read",
  SERVICE_JOB_MANAGE: "wms:service_job_manage",
  SERVICE_JOB_COMPLETE: "wms:service_job_complete",

  QC_READ: "wms:qc_read",
  QC_MANAGE: "wms:qc_manage",
  QC_COMPLETE: "wms:qc_complete",

  RACK_ASSIGN: "wms:rack_assign",
  SPARES_READ: "wms:spares_read",
  SPARES_MANAGE: "wms:spares_manage",
  DEVICES_SCRAP: "wms:devices_scrap",
  REPORT_READ: "wms:report_read",
  SERVICE_VENDOR_READ: "wms:service_vendor_read",
  SERVICE_VENDOR_MANAGE: "wms:service_vendor_manage",
  // Create a NEW service section — store/warehouse manager tier only (not mis).
  // Editing an existing section stays on SERVICE_VENDOR_MANAGE.
  SERVICE_SECTION_CREATE: "wms:service_section_create",
  // View the checklist-template library from WMS without the broad ims:read
  // (which opens every IMS page). WM/SM/MIS. OR-ed with ims:read at the gate.
  CHECKLIST_READ: "wms:checklist_read",
  // Author checklist templates (create/edit/delete) without the broad
  // ims:manage. WM/SM. OR-ed with ims:write (ims:manage) at the gate.
  CHECKLIST_WRITE: "wms:checklist_write",

  // Warehouse-team management (the Team tab). Unlike the stage codes above,
  // these ARE real gates: viewing / editing the roster is governed globally,
  // not by a per-warehouse assignment.
  TEAM_READ: "wms:team_read",
  TEAM_MANAGE: "wms:team_manage",
  TEAM_APPOINT_STORE_MGR: "wms:team_appoint_store_mgr",

  // Document/master gates — like TEAM_*, these are REAL global gates on the
  // backend (require_permission), not assignment-based. The old umbrella
  // codes `wms:read` / `wms:manage` were DROPPED by the backend
  // (migration wms_rbac_drop_umbrella_01) — never gate anything on them.
  INWARD_READ: "wms:inward_read",
  INWARD_MANAGE: "wms:inward_manage",
  OUTWARD_READ: "wms:outward_read",
  OUTWARD_MANAGE: "wms:outward_manage",
  // Outward QC stage read — the material-issue list also accepts it.
  OUTWARD_QC_READ: "wms:outward_qc_read",
  TRANSIT_RECONCILE: "wms:transit_reconcile",
  STOCK_DISPOSE: "wms:stock_dispose",
  WAREHOUSE_READ: "wms:warehouse_read",
  WAREHOUSE_MANAGE: "wms:warehouse_manage",
  LOCATION_READ: "wms:location_read",
  LOCATION_MANAGE: "wms:location_manage",

  // Replacement Requests + Sales Returns are CRM-owned but surfaced under
  // /wms/*. These two dedicated codes let warehouse_manager / store_manager
  // reach them without the broad `crm:read` / `crm:manage` (which would open
  // all of CRM). The backend endpoints accept these OR the CRM codes, so CRM
  // users are unaffected; `mis` is deliberately NOT granted. (2026-09 RBAC
  // pass — real global gates, like TEAM_*/INWARD_*, not assignment-based.)
  RETURNS_READ: "wms:returns_read",
  RETURNS_MANAGE: "wms:returns_manage",

  // Inward exceptions (rental return-by-count): units the warehouse could not
  // inward cleanly — a foreign device, an unrequested model, a stock entry.
  INWARD_EXCEPTION_RESOLVE: "wms:inward_exception_resolve",
  INWARD_EXCEPTION_APPROVE: "wms:inward_exception_approve",
} as const;

// OR-bundles for the code-gated (non-stage) WMS surfaces — mirrors the
// `crmCan` pattern. Each bundle lists every code the backend gate accepts,
// so `canAny(bundle)` matches `require_permission(*bundle)` exactly.
export const wmsCan = {
  /** See GRN batches / the Inward area. */
  inwardView: [wmsPermissions.INWARD_READ, wmsPermissions.INWARD_MANAGE],
  /** Create / stage / finalize GRN batches. */
  inwardManage: [wmsPermissions.INWARD_MANAGE],
  /** See the inward exceptions queue. */
  inwardExceptionView: [wmsPermissions.INWARD_READ, wmsPermissions.INWARD_EXCEPTION_RESOLVE],
  /** Link / void / send back an inward exception. */
  inwardExceptionResolve: [wmsPermissions.INWARD_EXCEPTION_RESOLVE],
  /** Linking a foreign or unrequested box additionally needs this (checked
   *  in the service, so it is a hint here, not a route gate). */
  inwardExceptionApprove: [wmsPermissions.INWARD_EXCEPTION_APPROVE],
  /** See dispatch requests / material issues / the Outward area. */
  outwardView: [wmsPermissions.OUTWARD_READ, wmsPermissions.OUTWARD_MANAGE],
  /** List material issues — exactly the codes `GET /wms/material-issues`
   *  accepts (outward read, or the outward-QC stage read). */
  materialIssueList: [wmsPermissions.OUTWARD_READ, wmsPermissions.OUTWARD_QC_READ],
  /** Create / issue / cancel / return material issues (outward writes). */
  outwardManage: [wmsPermissions.OUTWARD_MANAGE],
  /** Read warehouses/locations (engineers hold the read codes too). */
  warehouseView: [wmsPermissions.WAREHOUSE_READ, wmsPermissions.WAREHOUSE_MANAGE],
  /** Warehouse ADMINISTRATION (masters + team). Managers (warehouse_manager /
   *  store_manager / mis) each hold at least one of these; engineers hold only
   *  the *read* codes, so this bundle correctly keeps the Locations admin
   *  surface off an engineer's sidebar (per the confirmed access model). */
  masters: [
    wmsPermissions.WAREHOUSE_MANAGE,
    wmsPermissions.LOCATION_MANAGE,
    wmsPermissions.TEAM_READ,
    wmsPermissions.TEAM_MANAGE,
  ],
  serviceVendorView: [
    wmsPermissions.SERVICE_VENDOR_READ,
    wmsPermissions.SERVICE_VENDOR_MANAGE,
  ],
  /** View the Vendor Jobs QUEUE. service_job_read holders (warehouse_manager /
   *  store_manager / mis) see the warehouse-wide queue; an engineer gets in on
   *  warehouse_read and the backend scopes them to the jobs THEY raised, so they
   *  have their own Vendor Jobs page without the warehouse-wide view (CP-605). */
  serviceJobView: [wmsPermissions.SERVICE_JOB_READ, wmsPermissions.WAREHOUSE_READ],
  serviceVendorManage: [wmsPermissions.SERVICE_VENDOR_MANAGE],
  /** Create a new service section. WM/SM only (mis excluded), mirrors the BE
   *  `require_permission(wms:service_section_create)`. Editing a section uses
   *  serviceVendorManage. */
  serviceSectionCreate: [wmsPermissions.SERVICE_SECTION_CREATE],
  /** View the checklist-template library. OR-ed with imsCan.view at the
   *  route/nav so an ims:read holder (WM, ims_manager) and a checklist_read
   *  holder (SM, MIS) both pass — without opening other IMS pages to SM/MIS. */
  checklistView: [wmsPermissions.CHECKLIST_READ],
  /** Author checklist templates (create / edit / delete). OR-ed with
   *  imsCan.write at the gate so an ims:manage holder and a checklist_write
   *  holder (WM / SM) both pass — without opening the rest of IMS to WM/SM. */
  checklistManage: [wmsPermissions.CHECKLIST_WRITE],
  /** Warehouse reports. Manager-tier only. Unlike the device STAGES above,
   *  this is correctly a code gate rather than `requiredWmsStage`: the report
   *  is a warehouse-wide list with no device in the path, and its audience is
   *  the manager deciding what to reorder — not the floor working a stage.
   *  store_manager / warehouse_manager hold this code; engineers hold no
   *  `wms:report_read` at all, which is the intent. */
  reportView: [wmsPermissions.REPORT_READ],
  /** Work assignments — inward workforce allocation.
   *
   *  A CODE gate, not a StageRouteGuard, and deliberately so: the list is a
   *  warehouse-wide document view with no device in the path, so there is
   *  nothing for a stage guard to resolve a warehouse FROM. It mirrors the
   *  backend route gate exactly — hold any of the three inward stages and you
   *  may see the screen; the per-stage decision on a specific lot is made
   *  server-side once the warehouse and stage are known. */
  workAssignmentView: [
    wmsPermissions.INSPECTION_READ,
    wmsPermissions.INSPECTION_MANAGE,
    wmsPermissions.REPAIR_READ,
    wmsPermissions.REPAIR_MANAGE,
    wmsPermissions.QC_READ,
    wmsPermissions.QC_MANAGE,
  ],
  /** Issue / close / cancel / withdraw / reassign a lot. */
  workAssignmentManage: [
    wmsPermissions.INSPECTION_MANAGE,
    wmsPermissions.REPAIR_MANAGE,
    wmsPermissions.QC_MANAGE,
  ],
  /** View Replacement Requests + Sales Returns (the WMS-surfaced CRM returns).
   *  OR-ed with the CRM read code at the route/nav so both audiences pass. */
  returnsView: [wmsPermissions.RETURNS_READ, wmsPermissions.RETURNS_MANAGE],
  /** Act on Replacement Requests + Sales Returns (create / approve / reject /
   *  waive / logistics). OR-ed with the CRM manage code at the route. */
  returnsManage: [wmsPermissions.RETURNS_MANAGE],
} as const;

/** The device operation stages whose authority is warehouse-assignment based. */
export type WmsStage =
  | "inspection"
  | "repair"
  | "service_job"
  | "qc"
  | "rack_assign"
  | "spares"
  // Condemning a device (device-scrap D5) — ANY assigned ops worker at the
  // device's warehouse, same breadth as the manager-tier stages. Mirrors the
  // backend's `_assignment_grants` devices_scrap branch exactly (see
  // useStageAccess.ts `grants()`). Placing / un-scrapping / disposing are
  // narrower (store/warehouse manager, or a global permission code) and are
  // NOT gated through this stage — see `canManageScrap` and
  // `wmsPermissions.STOCK_DISPOSE`.
  | "devices_scrap"
  // Recording what is inside a device — a component found inside it, or one
  // marked missing that turned up after all — by whoever works it at
  // inspection, repair or QC. The backend narrows engineers to a device with a
  // live op assigned to them; this warehouse-level gate only hides the buttons
  // from users with no standing at all.
  | "device_contents";
