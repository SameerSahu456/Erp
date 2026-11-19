import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchDispatchKit,
  fetchReturnKit,
  saveDispatchKit,
  saveReturnKit,
  type DispatchKitTick,
  type ReturnKitTick,
} from "../../api";
import { inwardErrorMessage } from "../../inwardErrors";
import { KITS_STRINGS as S } from "../../components/kits/kits.strings";
import { wmsKeys } from "../keys";
import { deficiencyKeys } from "@modules/crm";

const K = wmsKeys.kits;

/** CRM's deficiency queue root. CRM does not export its key factory from its
 *  barrel yet, so the prefix is named here once rather than inlined. */

export const useDispatchKit = (driId: string, enabled: boolean) =>
  useQuery({ queryKey: K.dispatch(driId), queryFn: () => fetchDispatchKit(driId), enabled });

export const useReturnKit = (lineId: string, enabled: boolean) =>
  useQuery({ queryKey: K.ret(lineId), queryFn: () => fetchReturnKit(lineId), enabled });

export function useSaveDispatchKit(driId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: DispatchKitTick[]) => saveDispatchKit(driId, items),
    onSuccess: (rows) => {
      qc.setQueryData(K.dispatch(driId), rows);
      toast.success(S.saved);
    },
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}

export function useSaveReturnKit(lineId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ReturnKitTick[]) => saveReturnKit(lineId, items),
    onSuccess: (kit) => {
      qc.setQueryData(K.ret(lineId), kit);
      // A missing / broken item raises a deficiency in sales' queue.
      void qc.invalidateQueries({ queryKey: deficiencyKeys.all });
      toast.success(S.saved);
    },
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}
