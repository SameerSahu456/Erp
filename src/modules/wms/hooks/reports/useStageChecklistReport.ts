import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchStageChecklistReport,
  type StageChecklistReportParams,
} from "../../api/reports";
import { wmsKeys } from "../keys";

/** One report page; the previous page stays visible while the next loads (§16.7). */
export function useStageChecklistReport(params: StageChecklistReportParams) {
  return useQuery({
    queryKey: wmsKeys.reports.list({ report: "stage-checklist", ...params }),
    queryFn: () => fetchStageChecklistReport(params),
    placeholderData: keepPreviousData,
  });
}
