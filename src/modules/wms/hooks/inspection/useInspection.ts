import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  cancelDeviceInspection,
  completeDeviceInspection,
  fetchDeviceInspection,
  startDeviceInspection,
  type InspectionCompleteRequest,
  type InspectionStartRequest,
  type StageCancelRequest,
} from "../../api";
import { USE_INSPECTION_STRINGS } from "./use-inspection.strings";
import { errMsg } from "../../errorMessage";
import { invalidateDevice } from "../devices/useDevices";
import { wmsKeys } from "../keys";


/** The device's current/last inspection operation. */
export function useDeviceInspection(id: string, enabled = true) {
  return useQuery({
    queryKey: wmsKeys.devices.stageOp(id, "inspection"),
    queryFn: () => fetchDeviceInspection(id),
    enabled: enabled && !!id,
  });
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InspectionStartRequest }) =>
      startDeviceInspection(id, body),
    onSuccess: (_op, { id }) => {
      invalidateDevice(qc, id);
      toast.success(USE_INSPECTION_STRINGS.startSuccess);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useCompleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InspectionCompleteRequest }) =>
      completeDeviceInspection(id, body),
    onSuccess: (_op, { id }) => {
      invalidateDevice(qc, id);
      toast.success(USE_INSPECTION_STRINGS.completeSuccess);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useCancelInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: StageCancelRequest }) =>
      cancelDeviceInspection(id, body),
    onSuccess: (_op, { id }) => {
      invalidateDevice(qc, id);
      toast.success(USE_INSPECTION_STRINGS.cancelSuccess);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}
