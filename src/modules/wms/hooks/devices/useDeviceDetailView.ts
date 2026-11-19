/** Controller behind `DeviceDetailBody`: validated id, dossier reads, derived values and dialog state. */
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "@shared/auth/use-auth";
import { asUuid } from "@shared/lib/validation";
import { usePermission } from "@shared/rbac";

import {
  originBackHref,
  resolveContext,
} from "../../components/devices/device-detail/helpers";
import { wmsPermissions } from "../../permissions";
import { useWmsStageAccess } from "../operations/useStageAccess";
import { deriveDeviceAccess, stageByOperation } from "./device-detail-access";
import {
  useDevice,
  useDeviceChecklistRuns,
  useDeviceWorkflowHistory,
} from "./useDevices";

/** Which dialog the dossier has open (one at a time). */
export type DeviceDetailDialog =
  "inspection" | "repair" | "qc" | "rack" | "move" | null;

export function useDeviceDetailView() {
  // §11.1: a malformed route id becomes '' so queries stay disabled and not-found renders.
  const { id: rawId = "" } = useParams();
  const id = asUuid(rawId) ?? "";
  const [searchParams] = useSearchParams();

  const deviceQuery = useDevice(id);
  const device = deviceQuery.data?.device;
  const { canStage, isManager } = useWmsStageAccess();
  const { user } = useAuth();
  // Manager-only static grant; engineers' dynamic service_job doesn't cover these (CP-464).
  const canManageVendorJob = usePermission().can(
    wmsPermissions.SERVICE_JOB_MANAGE,
  );

  const historyQuery = useDeviceWorkflowHistory(id);
  // Newest first; the card re-sorts.
  const history = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);
  const checklistRunsQuery = useDeviceChecklistRuns(id);
  const checklistRuns = useMemo(
    () => checklistRunsQuery.data ?? [],
    [checklistRunsQuery.data],
  );
  // Derived ONCE here so child cards share it (one checklist-runs request per page).
  const stageByOp = useMemo(
    () => stageByOperation(checklistRuns),
    [checklistRuns],
  );

  const [dialog, setDialog] = useState<DeviceDetailDialog>(null);

  const {
    wf,
    spareRaiseStage,
    canRaiseSpare,
    canRaiseVendor,
    canCancelSpare,
    canMove,
  } = deriveDeviceAccess(device, {
    canStage,
    isManager,
    userId: user?.id,
  });

  const from = searchParams.get("from");

  return {
    id,
    deviceQuery,
    device,
    wf,
    ctx: resolveContext(from, wf),
    // Back returns to the originating screen (via ?from=), else the Devices hub.
    backHref: originBackHref(from) ?? "/wms/devices",
    history,
    historyQuery,
    checklistRuns,
    stageByOp,
    spareRaiseStage,
    canRaiseSpare,
    canRaiseVendor,
    canCancelSpare,
    canMove,
    canStage,
    canManageVendorJob,
    dialog,
    openDialog: (d: Exclude<DeviceDetailDialog, null>) => setDialog(d),
    closeDialog: () => setDialog(null),
  };
}
