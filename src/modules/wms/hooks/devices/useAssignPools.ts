import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { API } from "@/shared/constants";

import {
  fetchWarehouseTeam,
  type DeviceAssignableUser,
  type OperationStage,
  type WarehouseAssignmentListItem,
} from "../../api";
import { warehouseTeamKey } from "../warehouses/useWarehouseTeam";

/** Per-device work stages any engineer (any level) may be assigned to.
 *  Dynamic assignment (2026-09): mirrors the backend `stage_capable_predicate`
 *  engineer branch (app/modules/wms/services/stage_capability.py) — no
 *  capability filter; the per-device assignee check server-side is the real
 *  gate. Outward QC is NOT here (not a per-device work-assignment stage). */
const ENGINEER_STAGES = new Set<string>(["inspection", "repair", "qc"]);

/** Assignment roles that cover EVERY stage by role alone.
 *
 *  These three are shaped `level IS NULL AND capabilities IS NULL` by DB CHECK,
 *  so they can never be matched by a capability test — omitting one here makes
 *  it silently invisible in every picker. `warehouse_manager` is the overall
 *  manager (added as a 4th assignment role 2026-07-07) and spans stores; it is
 *  a superset of store_manager, not a variant of engineer. */
const ALL_STAGE_ROLES = new Set<string>([
  "warehouse_manager",
  "store_manager",
  "mis",
]);

/**
 * Who may be assigned `stage` out of a warehouse's team.
 *
 * Mirrors the backend `stage_capable_predicate` EXACTLY (dynamic assignment):
 *   warehouse_manager / store_manager / mis → every stage
 *   engineer                               → any per-device stage
 *                                            (inspection/repair/qc), any level,
 *                                            NO capability filter
 * Paint and rack_assign are deliberately manager/MIS-only — an engineer never
 * matches them, which falls out of `ENGINEER_STAGES` not holding them.
 *
 * Derived from the team roster the FE already loads, so staffing a picker
 * costs no extra request per stage: one team payload answers all of them.
 */
export function buildStagePool(
  team: readonly WarehouseAssignmentListItem[],
  stage: OperationStage,
): DeviceAssignableUser[] {
  const grants = (a: WarehouseAssignmentListItem): boolean => {
    if (ALL_STAGE_ROLES.has(a.role)) return true;
    // Dynamic assignment: any engineer (any level) may be offered for the
    // per-device stages — capabilities are no longer consulted here.
    return a.role === "engineer" && ENGINEER_STAGES.has(stage);
  };

  return team
    .filter(grants)
    .map((a) => ({
      user_id: a.user.id,
      name: a.user.name,
      email: a.user.email,
      role: a.role,
      level: a.level,
      capabilities: a.capabilities,
      // The team endpoint lists live assignments only, so every row is active.
      is_active: true,
    }));
}

/**
 * Stage-assignment pools for a set of warehouses, keyed by warehouse id.
 *
 *  Pass the warehouses in the user's SCOPE (`useWarehouseScope().warehouses`),
 *  never warehouses scraped off the currently visible device rows: the scope is
 *  known before any device loads and doesn't change as you page, so paging,
 *  sorting, and searching a worklist cost zero roster requests. Each warehouse
 *  resolves to the same `warehouseTeamKey` cache entry `useWarehouseTeam` uses,
 *  so a page that already loaded one warehouse's team refetches nothing.
 *
 *  The roster is reference data (it changes when someone joins or leaves a
 *  team, not per transaction), so it opts out of the global always-refetch
 *  policy via `STALE_TIME_MS` — see Coding-guideline §6.5.1.
 */
export function useAssignPoolsByWarehouse(
  warehouseIds: readonly string[],
  stage: OperationStage,
  options: { enabled?: boolean } = {},
): Record<string, DeviceAssignableUser[]> {
  const enabled = options.enabled ?? true;
  const ids = useMemo(
    () => Array.from(new Set(warehouseIds)).sort(),
    [warehouseIds],
  );

  const results = useQueries({
    queries: ids.map((warehouseId) => ({
      queryKey: warehouseTeamKey(warehouseId),
      queryFn: () => fetchWarehouseTeam(warehouseId),
      enabled,
      ...API.REFERENCE_DATA_QUERY_OPTIONS,
    })),
  });

  // Keyed on each roster's fetch time, not its length: a role change that keeps
  // the team the same size must still rebuild the stage pools.
  const dataSig = results.map((r) => r.dataUpdatedAt).join(",");
  return useMemo(() => {
    const pools: Record<string, DeviceAssignableUser[]> = {};
    ids.forEach((warehouseId, i) => {
      pools[warehouseId] = buildStagePool(results[i]?.data ?? [], stage);
    });
    return pools;
    // `results` is a fresh array each render; `dataSig` tracks the payloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, stage, dataSig]);
}
