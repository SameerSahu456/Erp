import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@/shared/api/notify-mutation-error";
import { auditTrailKey } from "@modules/audit";

import {
  fetchRentalSettings,
  runBilling,
  saveRentalSettings,
  type BillingRunRange,
} from "../../api/settings";
import { CONFIGURATION_HOOKS_STRINGS as S } from "./configuration-hooks.strings";
import { invalidateAfterBillingRun } from "../shared/invalidate";
import { rentalKeys } from "../shared/keys";

export function useRentalSettings() {
  return useQuery({ queryKey: rentalKeys.settings.app, queryFn: fetchRentalSettings });
}

export function useSaveRentalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveRentalSettings,
    onSuccess: (saved) => {
      qc.setQueryData(rentalKeys.settings.app, saved);
      // Every save is audited — refresh the Configuration page's history.
      void qc.invalidateQueries({ queryKey: auditTrailKey("rental_settings") });
      toast.success(S.settingsSaved);
    },
    onError: notifyMutationError,
  });
}

export function useRunBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (range: BillingRunRange) => runBilling(range),
    onSuccess: (result) => {
      invalidateAfterBillingRun(qc);
      toast.success(S.billingRun(result.invoices_created));
    },
    onError: notifyMutationError,
  });
}
