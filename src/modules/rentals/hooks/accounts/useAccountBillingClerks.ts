import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@/shared/api/notify-mutation-error";

import { fetchAccountBillingClerks, saveAccountBillingClerks } from "../../api/settings";
import { ACCOUNTS_HOOKS_STRINGS as S } from "./accounts-hooks.strings";
import { rentalKeys } from "../shared/keys";

const K = rentalKeys.accountBillingClerks;

/** The people who handle an account's rental billing. Read on the account's
 *  Billings tab and on every agreement of that account. */
export function useAccountBillingClerks(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.detail(accountId ?? ""),
    queryFn: () => fetchAccountBillingClerks(accountId as string),
    enabled: !!accountId && (options?.enabled ?? true),
  });
}

/** Replace the account's clerks with exactly `userIds`. */
export function useSaveAccountBillingClerks(accountId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => saveAccountBillingClerks(accountId as string, userIds),
    onSuccess: (saved) => {
      qc.setQueryData(K.detail(accountId ?? ""), saved);
      toast.success(S.clerksSaved);
    },
    onError: notifyMutationError,
  });
}
