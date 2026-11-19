import type { DeviceDossier } from "../../api";
import type { WmsStage } from "../../permissions";
import {
  spareAssigneeId,
  spareRaiseStageFor,
} from "../../components/devices/device-detail/device-detail-view-helpers";
import { isMovableStatus } from "../../components/stock-transfer/move-stock-helpers";

type Device = DeviceDossier["device"];

export interface DeviceAccessInput {
  canStage: (stage: WmsStage, warehouseId: string | null | undefined) => boolean;
  isManager: boolean;
  userId: string | undefined;
}

/** Stage-derived gates for the dossier: spare raise + Move Stock. */
export function deriveDeviceAccess(device: Device | undefined, access: DeviceAccessInput) {
  const wf = device?.workflow_status ?? "";
  const warehouseId = device?.warehouse_id ?? null;
  // A spare OR a vendor service job can be raised from inspection, repair or QC,
  // by that stage's assignee (manager/admin bypass via isManager). Vendor raise
  // follows the SAME condition as spares, so once an engineer has completed/
  // failed a stage — or the device sits between stages — the button hides
  // instead of lingering after a finished inspection/repair/QC.
  const spareRaiseStage = spareRaiseStageFor(wf);
  const canRaiseAtStage = (stage: WmsStage) =>
    !!device &&
    spareRaiseStage !== null &&
    access.canStage(stage, warehouseId) &&
    (access.isManager || spareAssigneeId(device, spareRaiseStage) === access.userId);
  const canRaiseSpare = canRaiseAtStage("spares");
  const canRaiseVendor = canRaiseAtStage("service_job");
  // Cancelling a spare mirrors the backend `device_holder_only` gate: a
  // manager/admin, or the engineer who CURRENTLY holds the device (its active-
  // stage assignee). The raiser keeps SEEING their request after the device
  // moves on, but can no longer cancel it once a successor holds the device.
  //
  // The backend keys off "holds an active op", not the workflow label, so the
  // holder stage must also cover at_external_vendor: a unit out at a vendor is
  // held by an active REPAIR op (the vendor-job flow routes it into rework), so
  // that repair engineer is still its holder. The raise-stage map is left as-is
  // — this only widens who may cancel, not where a new request can be raised.
  const holderStage = spareRaiseStage ?? (wf === "at_external_vendor" ? "repair" : null);
  const isCurrentHolder =
    !!device && holderStage !== null && spareAssigneeId(device, holderStage) === access.userId;
  const canCancelSpare = !!device && (access.isManager || isCurrentHolder);
  // Placement is legal at ANY pipeline stage, but Move Stock is a manager act:
  // the backend relocate is gated `require_stage("rack_assign", "manage")`.
  const canMove =
    !!device &&
    isMovableStatus(device.status) &&
    !!warehouseId &&
    access.canStage("rack_assign", warehouseId);
  return { wf, spareRaiseStage, canRaiseSpare, canRaiseVendor, canCancelSpare, canMove };
}

/** op-id → stage, so child cards don't each re-fetch the checklist runs. */
export function stageByOperation(
  runs: readonly { operation_id?: string | null; operation_type?: string | null }[],
): Map<string, string> {
  const m = new Map<string, string>();
  for (const run of runs)
    if (run.operation_id && run.operation_type) m.set(run.operation_id, run.operation_type);
  return m;
}
