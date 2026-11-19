import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@/shared/api/notify-mutation-error";

import {
  fetchAccountBillingSettings,
  saveAccountBillingSettings,
  type AccountBillingSettingsPayload,
} from "../../api/settings";
import { ACCOUNTS_HOOKS_STRINGS as S } from "./accounts-hooks.strings";
import { rentalKeys } from "../shared/keys";

const K = rentalKeys.accountSettings;

/** An account's billing defaults — cascade onto orders configured afterwards. */
export function useAccountBillingSettings(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.detail(accountId ?? ""),
    queryFn: () => fetchAccountBillingSettings(accountId as string),
    enabled: !!accountId && (options?.enabled ?? true),
  });
}

export function useSaveAccountBillingSettings(
  accountId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AccountBillingSettingsPayload) =>
      saveAccountBillingSettings(accountId as string, payload),
    onSuccess: (saved) => {
      qc.setQueryData(K.detail(accountId ?? ""), saved);
      toast.success(S.settingsSaved);
    },
    onError: notifyMutationError,
  });
}
