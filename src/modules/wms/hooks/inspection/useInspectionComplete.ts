/** Controller for `InspectionCompleteDialog`, including the "Return to vendor" hand-off. */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { usePermission } from "@shared/rbac";
import { useStockItemComponents } from "@modules/ims";
import { procurementPermissions } from "@modules/procurement";

import { completeDeviceInspection } from "../../api";
import { INSPECTION_STRINGS } from "../../components/inspection/inspection.strings";
import { isDueForCheck } from "../../constants/component-check-state";
import { errMsg } from "../../errorMessage";
import { invalidateDevice, useDevice } from "../devices/useDevices";
import { useStageCompletion } from "../operations/useStageCompletion";
import { invalidateSpares } from "../spares/useSpares";
import { useDeviceInspection } from "./useInspection";
import { useInspectionReturnToVendor } from "./useInspectionReturnToVendor";

const S = INSPECTION_STRINGS.completeDialog;

/** Deep link into the purchase-return form, pre-filled for this unit. */
function returnToVendorUrl(deviceId: string, poId: string, poNumber: string | null, notes: string) {
  const params = new URLSearchParams({ po: poId, units: deviceId, reason: "failed_inspection" });
  // Pass the PO display number so the return form labels its picker without a
  // procurement:read detail fetch the return-raiser role can't make.
  if (poNumber) params.set("po_no", poNumber);
  if (notes) params.set("notes", notes);
  return `/wms/purchase-returns/new?${params.toString()}`;
}

export function useInspectionComplete(deviceId: string | null, onClose: () => void) {
  const open = deviceId !== null;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermission();

  const opQuery = useDeviceInspection(deviceId ?? "", open);
  const stage = useStageCompletion(opQuery);
  const { op } = stage;

  const deviceQuery = useDevice(open ? (deviceId ?? "") : "");
  const returnToVendor = useInspectionReturnToVendor(deviceQuery.data?.device);
  const canReturnToVendor =
    can(procurementPermissions.PO_RETURN_WRITE) && returnToVendor.isPurchaseOrderOrigin;
  // Target URL for a "Return to vendor" that must first confirm discarding the
  // in-progress inspection (null = no pending navigation).
  const [pendingReturnUrl, setPendingReturnUrl] = useState<string | null>(null);

  const close = () => {
    stage.reset();
    onClose();
  };

  // Returned components still unchecked block completion server-side
  // (COMPONENTS_UNVERIFIED); surface it before the click (§0.9).
  const contentsQuery = useStockItemComponents(deviceId ?? "", { enabled: open });
  const uncheckedComponents = useMemo(
    () => (contentsQuery.data?.current_components ?? []).filter(isDueForCheck).length,
    [contentsQuery.data],
  );

  const ready =
    !!op && stage.verdictOk && !stage.checklistLoadFailed && uncheckedComponents === 0;

  const blockReason = (() => {
    if (!op) return null;
    const checklistReason = stage.checklistBlockReason(S.blocked);
    if (checklistReason) return checklistReason;
    return uncheckedComponents > 0 ? S.blocked.components(uncheckedComponents) : null;
  })();

  const submit = useMutation({
    mutationFn: async () => {
      if (!deviceId || !op) throw new Error(S.toast.errorNoActiveInspection);
      await stage.uploadStagePhotos(op.id, "inspection_device");
      const failPhotoIds = await stage.uploadFailPhotos(op.id);
      await completeDeviceInspection(deviceId, stage.buildPayload(failPhotoIds));
    },
    onSuccess: () => {
      // Targeted device refresh (detail + worklists + stats, §16.9). Spares can
      // change too (inspection may spawn a repair + spare request).
      if (deviceId) invalidateDevice(qc, deviceId);
      invalidateSpares(qc);
      toast.success(S.toast.success);
      close();
    },
    onError: (e: Error) => toast.error(errMsg(e, S.toast.errorGeneric)),
  });

  const goToReturn = (url: string) => {
    close();
    navigate(url);
  };

  const requestReturnToVendor = () => {
    if (!deviceId || !returnToVendor.poId) return;
    const url = returnToVendorUrl(
      deviceId,
      returnToVendor.poId,
      returnToVendor.poNumber,
      stage.notes.trim(),
    );
    // A return abandons the inspection: everything except notes (which carry
    // to the return form) is lost — confirm before leaving (§5).
    if (stage.hasAssessmentInput) {
      setPendingReturnUrl(url);
      return;
    }
    goToReturn(url);
  };

  const confirmReturn = () => {
    const url = pendingReturnUrl;
    setPendingReturnUrl(null);
    if (url) goToReturn(url);
  };

  return {
    open,
    deviceId,
    stage,
    ready,
    blockReason,
    submit,
    close,
    canReturnToVendor,
    requestReturnToVendor,
    pendingReturnUrl,
    cancelReturn: () => setPendingReturnUrl(null),
    confirmReturn,
  };
}
