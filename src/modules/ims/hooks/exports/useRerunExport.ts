import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@shared/api/notify-mutation-error";

import { rerunExport } from "../../exports.api";
import { EXPORT_HOOK_STRINGS as S } from "./export-hooks.strings";
import { invalidateExports } from "./invalidateExports";

/** "Run again" for an expired / failed export — a new job, same filters. */
export function useRerunExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rerunExport(id),
    onSuccess: () => toast.success(S.rerunQueued),
    onError: notifyMutationError,
    onSettled: () => invalidateExports(qc),
  });
}
