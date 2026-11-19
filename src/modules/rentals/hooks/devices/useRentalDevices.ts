import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  extendDevice,
  fetchDeviceHistory,
  fetchDeviceIdentityReconcile,
  fetchDeviceSummary,
  fetchExtendBounds,
  fetchRentalDevice,
  fetchRentalDevices,
  holdDevice,
  markDeviceDelivered,
  unholdDevice,
  type DeviceSummaryParams,
  type ExtendDevicePayload,
  type FetchDevicesParams,
  type HoldDevicePayload,
  type RentalDevice,
} from "../../api/devices";
import { DEVICES_HOOKS_STRINGS as S } from "./devices-hooks.strings";
import { invalidateDevice } from "../shared/invalidate";
import { rentalKeys } from "../shared/keys";

const K = rentalKeys.devices;

export function useRentalDevices(params: FetchDevicesParams) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchRentalDevices(params),
    placeholderData: keepPreviousData,
  });
}

export function useRentalDevice(deviceId: string | undefined) {
  return useQuery({
    queryKey: K.detail(deviceId ?? ""),
    enabled: !!deviceId,
    queryFn: () => fetchRentalDevice(deviceId as string),
  });
}

export function useDeviceHistory(deviceId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: K.history(deviceId),
    enabled: enabled && !!deviceId,
    queryFn: () => fetchDeviceHistory(deviceId as string),
  });
}

export function useDeviceSummary(params: DeviceSummaryParams = {}) {
  return useQuery({
    queryKey: K.summary(params),
    queryFn: () => fetchDeviceSummary(params),
    placeholderData: keepPreviousData,
  });
}

/** Where the fleet's identity links disagree with reality. A large `unlinked`
 *  is EXPECTED during cutover — not an error. */
export function useDeviceIdentityReconcile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: K.reconcile(),
    queryFn: fetchDeviceIdentityReconcile,
    enabled: options?.enabled ?? true,
  });
}

/** Per-device bounds, fetched only while the extend dialog is open. */
export function useExtendBounds(deviceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: K.extendBounds(deviceId),
    queryFn: () => fetchExtendBounds(deviceId as string),
    enabled: enabled && Boolean(deviceId),
  });
}

/** A unit write: the unit, its lists + summary (they read the same derived
 *  status), and the order it bills on (schedule, next invoice date). */
function useDeviceMutation<V extends { id: string }>(
  run: (vars: V) => Promise<RentalDevice>,
  successMessage: string | ((vars: V) => string),
  extra?: (qc: QueryClient, device: RentalDevice) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (device, vars) => {
      invalidateDevice(qc, device);
      extra?.(qc, device);
      toast.success(typeof successMessage === "function" ? successMessage(vars) : successMessage);
    },
  });
}

export function useHoldDevice() {
  return useDeviceMutation(
    ({ id, ...payload }: { id: string } & HoldDevicePayload) => holdDevice(id, payload),
    S.held,
  );
}

export function useUnholdDevice() {
  return useDeviceMutation(
    ({ id, unhold_day }: { id: string; unhold_day?: string | null }) =>
      unholdDevice(id, { unhold_day }),
    S.unheld,
  );
}

export function useExtendDevice() {
  return useDeviceMutation(
    ({ id, ...payload }: { id: string } & ExtendDevicePayload) => extendDevice(id, payload),
    // A new rate is not applied here: the server queues it for
    // rentals:extend_approve and the unit comes back unchanged.
    (vars) => (vars.monthly_rate ? S.deviceExtendQueued : S.deviceExtended),
    // Extending a unit moves its line and the order's end date: the list row too.
    (qc) => void qc.invalidateQueries({ queryKey: rentalKeys.salesOrders.lists() }),
  );
}

export function useMarkDeviceDelivered() {
  return useDeviceMutation(
    ({ id, delivered_on }: { id: string; delivered_on: string }) =>
      markDeviceDelivered(id, { delivered_on }),
    S.delivered,
  );
}
