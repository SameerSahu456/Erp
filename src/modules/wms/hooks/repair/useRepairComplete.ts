/** Controller behind `RepairCompleteDialog`. */
import { useMutation } from "@tanstack/react-query";

import { notifyMutationError } from "@shared/api/notify-mutation-error";
import { usePermission } from "@shared/rbac";

import { REPAIR_STRINGS } from "../../components/repair/repair.strings";
import { wmsPermissions } from "../../permissions";
import { useStageCompletion } from "../operations/useStageCompletion";
import { useSpareRequests } from "../spares/useSpares";
import { useDeviceServiceJobs } from "../vendor-jobs/useServiceJobs";
import { useCompleteRepair, useDeviceRepair } from "./useRepair";

const S = REPAIR_STRINGS.completeDialog;

/** One page of the device's spare requests is plenty to count the open ones —
 *  a device never carries anywhere near this many. */
const OPEN_SPARES_PAGE_SIZE = 50;
const CLOSED_SPARE_STATUSES = new Set(["cancelled", "fulfilled"]);
const OPEN_VENDOR_STAGES = new Set(["awaiting_vendor", "with_vendor"]);

/** Open spare requests + vendor jobs on the device — either blocks a repair PASS
 *  (the backend would flip it to fail). */
function useOpenRepairBlockers(deviceId: string | null, open: boolean) {
  // Gated on `wms:spares_read` to avoid a 403.
  const canReadSpares = usePermission().can(wmsPermissions.SPARES_READ);
  const sparesQuery = useSpareRequests(
    { stock_item_id: deviceId ?? "", page_size: OPEN_SPARES_PAGE_SIZE },
    { enabled: open && !!deviceId && canReadSpares },
  );
  const openSpareCount = deviceId
    ? (sparesQuery.data?.items ?? []).filter((r) => !CLOSED_SPARE_STATUSES.has(r.status)).length
    : 0;
  // Open vendor jobs: still awaiting a vendor or out at one — mirrors the
  // backend's pending/in-progress gate.
  const serviceJobsQuery = useDeviceServiceJobs(deviceId ?? undefined);
  const openVendorCount = (serviceJobsQuery.data ?? []).filter((j) =>
    OPEN_VENDOR_STAGES.has(j.stage),
  ).length;
  return { openSpareCount, openVendorCount };
}

export function useRepairComplete(deviceId: string | null, onClose: () => void) {
  const open = deviceId !== null;
  const stage = useStageCompletion(useDeviceRepair(deviceId ?? "", open));
  const { op } = stage;
  const completeRepair = useCompleteRepair();

  const { openSpareCount, openVendorCount } = useOpenRepairBlockers(deviceId, open);

  // A fail loops back to repair regardless, so only a PASS is blocked.
  const passBlockedByOpen =
    stage.resolvedResult === "pass" && (openSpareCount > 0 || openVendorCount > 0);
  const ready =
    !!op && stage.verdictOk && !passBlockedByOpen && !stage.checklistLoadFailed;

  const blockReason = (() => {
    if (!op) return null;
    const checklistReason = stage.checklistBlockReason(S.blocked);
    if (checklistReason) return checklistReason;
    if (!passBlockedByOpen) return null;
    return openSpareCount > 0 ? S.blocked.openSpares : S.blocked.openVendor;
  })();

  const close = () => {
    stage.reset();
    onClose();
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!deviceId) return;
      let failPhotoIds: Record<string, string[]> = {};
      // The complete step toasts its own failure (useCompleteRepair); the upload
      // steps have no other handler, so surface them here.
      try {
        if (op) {
          await stage.uploadStagePhotos(op.id, "repair_after");
          failPhotoIds = await stage.uploadFailPhotos(op.id);
        }
      } catch (e) {
        notifyMutationError(e);
        throw e;
      }
      await completeRepair.mutateAsync({ id: deviceId, body: stage.buildPayload(failPhotoIds) });
    },
    onSuccess: close,
  });

  return { open, stage, ready, blockReason, openSpareCount, openVendorCount, submit, close };
}
