import { RecordSerialDialog } from "../../devices/device-identity/RecordSerialDialog";
import { ReidentifyDeviceDialog } from "../../devices/device-identity/ReidentifyDeviceDialog";
import { RelinkPoItemDialog } from "../../devices/device-identity/RelinkPoItemDialog";
import { correctionDeviceFor, type UnitCorrection } from "./batch-view-helpers";

/** One dialog per correction kind for the whole table, not three per row,
 *  so a large batch doesn't mount hundreds of hidden dialogs. */
export function CorrectionDialogs({
  correction,
  batchId,
  isPoSource,
  onClose,
}: {
  correction: UnitCorrection | null;
  batchId: string;
  isPoSource: boolean;
  onClose: () => void;
}) {
  const keyId = correction?.deviceId ?? "none";
  return (
    <>
      <RecordSerialDialog
        key={`serial:${keyId}:${!!correction?.currentSerial}`}
        deviceId={correctionDeviceFor(correction, "serial")}
        currentSerial={correction?.currentSerial ?? null}
        onClose={onClose}
      />
      <ReidentifyDeviceDialog
        key={`reid:${keyId}`}
        deviceId={correctionDeviceFor(correction, "reidentify")}
        onClose={onClose}
        poSourced={isPoSource}
      />
      <RelinkPoItemDialog
        key={`relink:${keyId}`}
        deviceId={correctionDeviceFor(correction, "relink")}
        grnBatchId={batchId}
        currentPoItemId={correction?.poItemId ?? null}
        onClose={onClose}
      />
    </>
  );
}
