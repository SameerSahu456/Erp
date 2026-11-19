import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  confirmAllDeviceComponents,
  confirmDeviceComponent,
  identifyDeviceComponent,
  markDeviceComponentFound,
  markDeviceComponentMissing,
  putBackPulledComponent,
  recordFoundDeviceComponent,
  undoComponentAdd,
  type DeviceComponentFoundRequest,
  type DeviceComponentIdentifyRequest,
  type DeviceComponentMissingRequest,
  type DeviceComponentUndoAddRequest,
} from "../../api";
import { COMPONENTS_CARD_STRINGS } from "../../components/devices/device-detail/components-card.strings";
import { errMsg } from "../../errorMessage";
import { invalidateComponentSurfaces } from "./useDeviceComposition";

// Checking a device's contents after a PO inward or a return
// (inward-verification D1-D7, components-across-dispatch spec D4/D5).
// Every mutation refreshes the device's components list and the IMS stock
// counts — a confirmed, missing or found component moves a real stock unit.

const S = COMPONENTS_CARD_STRINGS.toast;

type ComponentRef = { deviceId: string; componentId: string };

/** Confirm every component waiting to be checked on the device (D3). */
export function useConfirmAllDeviceComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => confirmAllDeviceComponents(deviceId),
    onSuccess: (r, deviceId) => {
      invalidateComponentSurfaces(qc, deviceId);
      toast.success(S.confirmedAll(r.confirmed_count));
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useConfirmDeviceComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, componentId }: ComponentRef) =>
      confirmDeviceComponent(deviceId, componentId),
    onSuccess: (_r, { deviceId }) => {
      invalidateComponentSurfaces(qc, deviceId);
      toast.success(S.confirmed);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useMarkDeviceComponentMissing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      componentId,
      body,
    }: ComponentRef & { body: DeviceComponentMissingRequest }) =>
      markDeviceComponentMissing(deviceId, componentId, body),
    onSuccess: (_r, { deviceId }) => {
      invalidateComponentSurfaces(qc, deviceId);
      toast.success(S.markedMissing);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useMarkDeviceComponentFound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, componentId }: ComponentRef) =>
      markDeviceComponentFound(deviceId, componentId),
    onSuccess: (_r, { deviceId }) => {
      invalidateComponentSurfaces(qc, deviceId);
      toast.success(S.foundAfterAll);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useRecordFoundDeviceComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, body }: { deviceId: string; body: DeviceComponentFoundRequest }) =>
      recordFoundDeviceComponent(deviceId, body),
    onSuccess: (rows, { deviceId }) => {
      invalidateComponentSurfaces(qc, deviceId);
      toast.success(S.recordedFound(rows.length));
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useIdentifyDeviceComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      componentId,
      body,
    }: ComponentRef & { body: DeviceComponentIdentifyRequest }) =>
      identifyDeviceComponent(deviceId, componentId, body),
    onSuccess: (_r, { deviceId }) => {
      invalidateComponentSurfaces(qc, deviceId);
      toast.success(S.identified);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

/** Put a part pulled out by mistake back inside the device. */
export function usePutBackPulledComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, componentId }: ComponentRef) =>
      putBackPulledComponent(deviceId, componentId),
    onSuccess: (_r, { deviceId }) => {
      invalidateComponentSurfaces(qc, deviceId);
      toast.success(S.putBack);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

/** Remove a part added to the device by mistake. */
export function useUndoComponentAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      componentId,
      body,
    }: ComponentRef & { body: DeviceComponentUndoAddRequest }) =>
      undoComponentAdd(deviceId, componentId, body),
    onSuccess: (_r, { deviceId }) => {
      invalidateComponentSurfaces(qc, deviceId);
      toast.success(S.addUndone);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}
