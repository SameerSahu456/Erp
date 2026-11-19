import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  recordManufacturerSerial,
  reidentifyDevice,
  relinkPoItem,
  type DeviceIdentityResponse,
  type RecordManufacturerSerialRequest,
  type ReidentifyDeviceRequest,
  type RelinkPoItemRequest,
} from "../../api";
import { errMsg } from "../../errorMessage";
import { invalidateDevice } from "../devices/useDevices";
import { wmsKeys } from "../keys";
import { purchaseOrderKeys } from "@modules/procurement";
import { USE_DEVICE_IDENTITY_STRINGS as S } from "./use-device-identity.strings";


/** GRN line changed; the batch id isn't on the response, so refresh every batch detail and list. */
function invalidateGrnBatches(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: wmsKeys.grnBatches.lists() });
  void qc.invalidateQueries({ queryKey: wmsKeys.grnBatches.details() });
}

function useInvalidateDevice() {
  const qc = useQueryClient();
  return (id: string) => invalidateDevice(qc, id);
}

/** A correction that re-scoped the checklist has just blocked the rack gate.
 *  Say so at the moment it happens — otherwise the user meets the block later
 *  with no idea what caused it. */
function warnIfRerunRequired(result: DeviceIdentityResponse) {
  if (result.checklist_rerun_required) {
    toast.warning(S.toasts.rerunRequired);
  }
}

export function useRecordManufacturerSerial() {
  const invalidate = useInvalidateDevice();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: RecordManufacturerSerialRequest;
    }) => recordManufacturerSerial(id, body),
    onSuccess: (_result, { id, body }) => {
      invalidate(id);
      // The backend only requires a reason when it is REPLACING a serial, so
      // its presence is exactly the fill/correct distinction.
      toast.success(
        body.reason ? S.toasts.serialCorrected : S.toasts.serialRecorded,
      );
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useReidentifyDevice() {
  const invalidate = useInvalidateDevice();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReidentifyDeviceRequest }) =>
      reidentifyDevice(id, body),
    onSuccess: (result, { id }) => {
      invalidate(id);
      // The GRN line's variant and discrepancy changed, so the batch view is
      // stale even though no booking moved.
      invalidateGrnBatches(qc);
      toast.success(S.toasts.deviceReidentified);
      warnIfRerunRequired(result);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useRelinkPoItem() {
  const invalidate = useInvalidateDevice();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RelinkPoItemRequest }) =>
      relinkPoItem(id, body),
    onSuccess: (result, { id }) => {
      invalidate(id);
      // Re-booking moved received_quantity between two PO lines and may have
      // flipped the PO header status, so both views are stale.
      invalidateGrnBatches(qc);
      // PO keys come from the owning module's barrel — never copied (§7/§15).
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.list });
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.stats });
      toast.success(S.toasts.poLineRelinked);
      warnIfRerunRequired(result);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}
