/** Repair stage op and its writes; each write uses `invalidateDevice` (§16.9). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  completeRepair,
  fetchDeviceRepair,
  startRepair,
  type RepairDoneRequest,
  type RepairStartRequest,
} from "../../api";
import { errMsg } from "../../errorMessage";
import { invalidateDevice } from "../devices/useDevices";
import { wmsKeys } from "../keys";
import { USE_STAGES_STRINGS } from "../operations/use-stages.strings";

export function useDeviceRepair(id: string, enabled = true) {
  return useQuery({
    queryKey: wmsKeys.devices.stageOp(id, "repair"),
    queryFn: () => fetchDeviceRepair(id),
    enabled: enabled && !!id,
  });
}

export function useStartRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: RepairStartRequest }) =>
      startRepair(id, body),
    onSuccess: (_o, { id }) => {
      invalidateDevice(qc, id);
      toast.success(USE_STAGES_STRINGS.repair.started);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function useCompleteRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RepairDoneRequest }) =>
      completeRepair(id, body),
    onSuccess: (_o, { id }) => {
      invalidateDevice(qc, id);
      toast.success(USE_STAGES_STRINGS.repair.completed);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

