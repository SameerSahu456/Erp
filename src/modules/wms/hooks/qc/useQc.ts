/** QC stage op and its writes; each write uses `invalidateDevice` (§16.9). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  completeQc,
  fetchDeviceQc,
  startQc,
  type QcCompleteRequest,
  type QcStartRequest,
} from "../../api";
import { errMsg } from "../../errorMessage";
import { invalidateDevice } from "../devices/useDevices";
import { wmsKeys } from "../keys";
import { USE_STAGES_STRINGS } from "../operations/use-stages.strings";

export function useDeviceQc(id: string, enabled = true) {
  return useQuery({
    queryKey: wmsKeys.devices.stageOp(id, "qc"),
    queryFn: () => fetchDeviceQc(id),
    enabled: enabled && !!id,
  });
}

export function useStartQc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: QcStartRequest }) =>
      startQc(id, body),
    onSuccess: (_o, { id }) => {
      invalidateDevice(qc, id);
      toast.success(USE_STAGES_STRINGS.qc.started);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useCompleteQc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: QcCompleteRequest }) =>
      completeQc(id, body),
    onSuccess: (_o, { id }) => {
      invalidateDevice(qc, id);
      toast.success(USE_STAGES_STRINGS.qc.completed);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

