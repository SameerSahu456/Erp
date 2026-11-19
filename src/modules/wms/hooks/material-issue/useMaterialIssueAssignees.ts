import { useMemo } from "react";

import { makeStaticAsyncOptions } from "@/components/ui/async-select";
import type { MyWarehouse } from "../../api";
import { useWarehouseTeam } from "../warehouses/useWarehouseTeam";

/** Issue-warehouse + QC-engineer picker sources for the material-issue form. */
export function useMaterialIssueAssignees(
  warehouseId: string,
  warehouses: MyWarehouse[],
) {
  const teamQuery = useWarehouseTeam(warehouseId || undefined);
  // Any engineer on the warehouse team is assignable (L1 / L2 / L3) — the
  // dynamic-assignment model (2026-09) dropped the per-stage capability filter,
  // so a material issue may be handed to any engineer the warehouse holds, not
  // only the `qc` / `outward_qc`-capable ones. The old capability filter hid L1/
  // L2 inspection engineers from the picker (CP-193 #10).
  const engineers = useMemo(
    () => (teamQuery.data ?? []).filter((a) => a.role === "engineer"),
    [teamQuery.data],
  );

  // Lists are already fetched; makeStaticAsyncOptions gives the standard AsyncSelect (§16.11) with no extra call.
  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ id: w.warehouse_id, label: w.name })),
    [warehouses],
  );
  const useWarehouseOptions = makeStaticAsyncOptions(
    warehouseOptions,
    (o) => o.label,
  );
  // Carry the engineer's LEVEL so the picker can show an L1/L2/L3 badge next to
  // the name — the same cue the device-assign dropdowns give, now that any level
  // is assignable (CP-193 #10).
  const engineerOptions = useMemo(
    () =>
      engineers.map((a) => ({
        id: a.user.id,
        label: a.user.name,
        level: a.level ?? null,
      })),
    [engineers],
  );
  const useEngineerOptions = makeStaticAsyncOptions(
    engineerOptions,
    (o) => o.label,
  );

  return { engineers, useWarehouseOptions, useEngineerOptions };
}
