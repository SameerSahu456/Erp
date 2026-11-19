import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { notifyMutationError } from "@shared/api/notify-mutation-error";

import { requestExport, type ExportRequest } from "../../exports.api";
import { EXPORTS_PATH } from "../../lib/export-jobs";
import { EXPORT_HOOK_STRINGS as S } from "./export-hooks.strings";
import { invalidateExports } from "./invalidateExports";

/** Queue a background export. 202 = new job, 200 = the identical job asked
 *  for in the last two minutes, which is still running. */
export function useRequestExport() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: ExportRequest) => requestExport(body),
    onSuccess: ({ alreadyRunning }) => {
      invalidateExports(qc);
      toast.success(alreadyRunning ? S.alreadyRunning : S.queued, {
        action: { label: S.openMyExports, onClick: () => navigate(EXPORTS_PATH) },
      });
    },
    onError: notifyMutationError,
  });
}
