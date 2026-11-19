import { useCallback } from "react";

import { usePermission } from "@shared/rbac";
import { useAuth } from "@shared/auth/use-auth";

import type { MyWarehouse } from "../../api";
import type { WmsStage } from "../../permissions";
import { useWarehouseScope } from "../../context/warehouse-scope";

// FE mirrors BE exactly (realigned 2026-07-06): the backend's only global
// bypass for device-stage authority is the `is_superuser` FLAG — role NAMES
// (admin / superadmin) carry no power there, so they must not carry any here.
// The old ADMIN_ROLES name-bypass showed admin-role users every stage tab
// while the backend 403'd every click.
const MANAGER_ROLES = new Set(["warehouse_manager", "store_manager", "mis"]);

// Per-device work stages any engineer (any level) may act on. Dynamic
// assignment (2026-09): mirrors the backend `_assignment_grants` engineer
// branch (app/core/rbac/dependencies.py) — no capability filter; the per-device
// assignee check is enforced server-side. Paint and rack_assign are
// deliberately NOT here (managers / MIS only). Outward QC is not a per-device
// stage here.
const ENGINEER_STAGES = new Set<WmsStage>(["inspection", "repair", "qc"]);

// Levels whose engineers carry the Spares WRITE grant (raise/cancel/fulfil) —
// `display` is excluded (view-only). Mirrors the backend
// `_SPARES_OPERATOR_LEVELS`. Spares VIEW is gated separately on the
// `wms:spares_read` permission (route + nav), so display engineers still see
// the page; they just can't manage.
const SPARES_LEVELS = new Set(["l1", "l2", "l3"]);

/** Does one warehouse assignment grant `stage`? Mirrors the backend
 *  `_assignment_grants` in app/core/rbac/dependencies.py EXACTLY (dynamic
 *  assignment, 2026-09):
 *    warehouse_manager / store_manager / mis  → every stage
 *    engineer             → any per-device stage (inspection/repair/qc), any
 *                           level, NO capability filter — the per-device
 *                           assignee check is enforced server-side and the
 *                           worklist self-scopes via useEngineerScope; spares
 *                           only for levels l1/l2/l3 (display excluded); NEVER
 *                           paint / rack_assign
 *  NB: role value renamed `operator` → `engineer` (backend 2026-06-23).
 *      `warehouse_manager` added as a 4th assignment role (backend 2026-07-07). */
function grants(assignment: MyWarehouse, stage: WmsStage): boolean {
  if (MANAGER_ROLES.has(assignment.role)) return true;
  // devices_scrap (device-scrap D5): the manager-tier check above already
  // covers warehouse_manager/store_manager/mis; an engineer of ANY level may
  // also condemn a device — no capability filter, mirroring the backend's
  // `_assignment_grants` devices_scrap branch exactly.
  if (stage === "devices_scrap") return assignment.role === "engineer";
  if (assignment.role === "engineer") {
    if (ENGINEER_STAGES.has(stage)) return true;
    if (stage === "spares" && SPARES_LEVELS.has(assignment.level ?? "")) return true;
    // service_job re-granted to engineers (CP-464): raise a vendor request +
    // withdraw it before dispatch for a device they work. DISPATCH (send) and
    // RECEIVE stay manager-only on the backend, and the dialog's vendor section
    // is gated on the static wms:service_job_manage permission (which engineers
    // don't hold), so it auto-hides for them. Mirrors backend _assignment_grants.
    if (stage === "service_job") return true;
    // device_contents: any engineer may record a find inside a device they
    // work — mirrors backend _assignment_grants (per-device check is server-side).
    if (stage === "device_contents") return true;
  }
  return false;
}

/** Capability gate for WMS device-operation stage actions.
 *
 *  Device-stage authority is warehouse-scoped (the user's
 *  `warehouse_user_assignment` at the device's warehouse), NOT global
 *  permission codes — so this is the correct way to show/hide stage
 *  buttons. Superusers bypass. Returns `canStage(stage, warehouseId)`.
 *
 *  `isLoading` lets call sites avoid flicker: hide actions until the
 *  user's assignments have loaded (superusers are known immediately). */
export function useWmsStageAccess() {
  const { isSuperuser } = usePermission();
  // Only the is_superuser FLAG bypasses stage authority — mirroring the
  // backend's require_stage. A user whose ROLE is named "admin"/"superadmin"
  // but who isn't flagged is treated like anyone else: assignments decide.
  const isAdmin = isSuperuser;

  // Read the user's warehouse assignments from the app-wide
  // WarehouseScopeProvider (mounted in AppShell, wrapping every route) instead
  // of fetching my-warehouses here. This hook runs in ~17 places (sidebar,
  // every page body, child cards, useEngineerScope); each used to be its own
  // query observer, and under the global staleTime:0 + refetchOnMount:"always"
  // policy every mount refired GET /wms/my-warehouses (3-5x per page, more for
  // manager-heavy screens). One observer in the provider now serves them all.
  const { warehouses: assignments, isLoading } = useWarehouseScope();

  /** Can the user DO `stage` at a specific device's warehouse? (button gate) */
  const canStage = useCallback(
    (stage: WmsStage, warehouseId: string | null | undefined): boolean => {
      if (isAdmin) return true;
      if (!warehouseId) return false;
      return assignments.some(
        (a) => a.warehouse_id === warehouseId && a.is_active && grants(a, stage),
      );
    },
    [isAdmin, assignments],
  );

  /** Can the user do OUTWARD QC at a device's warehouse? (button gate)
   *
   *  Dynamic now (CP-193 #10): like inspection/repair/qc, ANY engineer with a
   *  live assignment at the warehouse may run outward QC — no `outward_qc`
   *  capability required — plus managers/mis blanket and superuser bypass.
   *  Mirrors the backend `_assignment_grants` outward_qc branch (dependencies.py).
   *  The Material Issue worklist still scopes a QC-only engineer to the MIs
   *  issued to them, so an engineer only sees (and acts on) their own units. */
  const canOutwardQc = useCallback(
    (warehouseId: string | null | undefined): boolean => {
      if (isAdmin) return true;
      if (!warehouseId) return false;
      return assignments.some(
        (a) =>
          a.warehouse_id === warehouseId &&
          a.is_active &&
          (MANAGER_ROLES.has(a.role) || a.role === "engineer"),
      );
    },
    [isAdmin, assignments],
  );

  /** Can the user work `stage` at ANY of their warehouses? (sidebar-tab gate) */
  const canSeeStage = useCallback(
    (stage: WmsStage): boolean => {
      if (isAdmin) return true;
      return assignments.some((a) => a.is_active && grants(a, stage));
    },
    [isAdmin, assignments],
  );

  // Is the user a warehouse manager (store_manager / mis) anywhere — or admin?
  // Managers + admin own the Devices assignment hub and can assign engineers.
  const isManager =
    isAdmin || assignments.some((a) => a.is_active && MANAGER_ROLES.has(a.role));

  // Does the user belong to ANY warehouse team at all (any role) — or admin?
  // This is the device-dossier read boundary: a member may open device detail
  // pages for their warehouses; a user with no assignment anywhere may not.
  const isMember = isAdmin || assignments.some((a) => a.is_active);

  /** Can the user ASSIGN an engineer for a device's warehouse? Managers + admin
   *  only — an L1/L2 engineer can DO inspection but not hand work out. */
  const canAssign = useCallback(
    (warehouseId: string | null | undefined): boolean => {
      if (isAdmin) return true;
      if (!warehouseId) return false;
      return assignments.some(
        (a) => a.warehouse_id === warehouseId && a.is_active && MANAGER_ROLES.has(a.role),
      );
    },
    [isAdmin, assignments],
  );

  /** STORE MANAGER or WAREHOUSE MANAGER at a specific warehouse — the shared
   *  predicate behind `canReturnSpare` and `canCorrectDevice`. Kept as ONE
   *  callback so the two gates cannot drift apart.
   *
   *  Original rationale (spare return, widened 2026-08-18): STORE MANAGER or
   *  WAREHOUSE MANAGER at that warehouse — narrower than `isManager`, which also
   *  admits mis. Mirrors the backend `store_or_warehouse_manager_only=True` on
   *  require_stage: the spare return has no time window, so the authority to put
   *  stock back into the available pool sits with the store manager who owns the
   *  racks and the warehouse manager who oversees them. mis and engineers are
   *  excluded — do not fold this into MANAGER_ROLES. */
  const isStoreOrWarehouseManagerAt = useCallback(
    (warehouseId: string | null | undefined): boolean => {
      if (isAdmin) return true;
      if (!warehouseId) return false;
      return assignments.some(
        (a) =>
          a.warehouse_id === warehouseId &&
          a.is_active &&
          (a.role === "store_manager" || a.role === "warehouse_manager"),
      );
    },
    [isAdmin, assignments],
  );

  const canReturnSpare = isStoreOrWarehouseManagerAt;
  /** May the user link a described device component to its IMS part
   *  (component tracking D5)? A store decision — mirrors the backend's
   *  `store_or_warehouse_manager_only=True` on the identify route. */
  const canIdentifyComponent = isStoreOrWarehouseManagerAt;

  /** May the user PLACE a scrapped unit's location or UN-SCRAP it
   *  (device-scrap D5/D6/D9)? Store manager or warehouse manager at that
   *  warehouse only — mirrors the backend's
   *  `require_stage("devices_scrap", "manage", store_or_warehouse_manager_only=True)`,
   *  which excludes mis and the engineer who may condemn the device (see
   *  `canStage('devices_scrap', ...)`) but not reverse or shelve it. Disposal
   *  itself is a separate, global permission code (`wmsPermissions.STOCK_DISPOSE`),
   *  not this stage check. */
  const canManageScrap = isStoreOrWarehouseManagerAt;

  /** Can the user RE-IDENTIFY a device's part, RE-LINK its PO line, or
   *  OVERWRITE an already-recorded manufacturer serial? Same tier as the spare
   *  return, and for the same reason: these move stock valuation and PO
   *  figures, so they sit above the bench (device-identity spec D5).
   *
   *  NOT this gate: filling a BLANK serial. That is a stage action — whoever
   *  holds the device right now — see `canStage`. */
  const canCorrectDevice = isStoreOrWarehouseManagerAt;

  return {
    canStage,
    canOutwardQc,
    canSeeStage,
    canAssign,
    canReturnSpare,
    canIdentifyComponent,
    canCorrectDevice,
    canManageScrap,
    isManager,
    isMember,
    isAdmin,
    isSuperuser,
    isLoading,
  };
}

/** "Show only the devices allocated to me" filter for the stage worklists.
 *
 *  A plain engineer (L1/L2/L3 — caps-scoped, NOT a store_manager/mis/admin) sees
 *  only the devices assigned to them on the live op; managers + admin see
 *  everything. Mirrors the backend split: the device list is warehouse-scoped for
 *  everyone, and we additionally narrow engineers to their own assignee_id.
 *
 *  Spread the result straight into a device list/stats query — it's `{}` (a
 *  no-op) for managers/admin:
 *    `useDevices({ workflow_status: …, ...useEngineerScope() })`
 *
 *  While assignments are still loading a non-admin manager is briefly treated as
 *  an engineer (scoped to self, then widens) — the safe direction: an engineer is
 *  never shown more than their own. Admins resolve synchronously, so never flicker. */
export function useEngineerScope(stage?: 'inspection' | 'repair' | 'qc'): {
  assignee_id?: string;
  operation_type?: string;
} {
  const { user } = useAuth();
  const { isManager, isAdmin } = useWmsStageAccess();
  if (isAdmin || isManager || !user?.id) return {};
  // When a STAGE is given, narrow the assignee match to that stage's op, so a
  // device the engineer handled at a DIFFERENT stage (inspected, now in QC)
  // doesn't leak into this stage's list + tab counts. Without it the device
  // list/stats matched ANY op assigned to the engineer, which disagreed with
  // the stat-card tiles — those already scope per stage — so the cards and the
  // tabs never tallied (CP-193 #9). Omit `stage` for a stage-agnostic scope.
  if (stage) return { assignee_id: user.id, operation_type: stage };
  return { assignee_id: user.id };
}
