import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { API } from "@/shared/constants";

import { fetchExportJobs, type ExportJobsParams } from "../../exports.api";
import { exportStatusChanged } from "../../lib/export-jobs";
import { ACTIVE_EXPORT_STATUSES } from "../../lib/export-labels";
import type { ExportJobsPage } from "../../lib/export-types";
import { imsKeys } from "../keys";

/** "My exports" (or everyone's, for ims:export_view_all — the backend scopes).
 *  Polls only while a listed job is still queued / running (spec §7, §6.5.1). */
export function useExportJobs(params: ExportJobsParams) {
  const qc = useQueryClient();
  const queryKey = imsKeys.exports.list(params);
  return useQuery({
    queryKey,
    queryFn: async () => {
      const next = await fetchExportJobs(params);
      // A job changed status between polls: the other tabs' counts moved too.
      const prev = qc.getQueryData<ExportJobsPage>(queryKey);
      if (prev && exportStatusChanged(prev, next)) {
        void qc.invalidateQueries({ queryKey: imsKeys.exports.counts() });
      }
      return next;
    },
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.items.some((j) => ACTIVE_EXPORT_STATUSES.includes(j.status))
        ? API.JOB_POLL_MS
        : false,
  });
}
