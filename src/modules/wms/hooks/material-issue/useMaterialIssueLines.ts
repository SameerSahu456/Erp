import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchMaterialIssueLines,
  type MaterialIssueLinesQuery,
} from "../../api";

import { wmsKeys } from "../keys";

export function useMaterialIssueLines(params: MaterialIssueLinesQuery) {
  return useQuery({
    queryKey: wmsKeys.materialIssues.lines(params),
    queryFn: () => fetchMaterialIssueLines(params),
    // Keep the prior page visible while the next tab/page/filter loads, so the
    // worklist doesn't flash to a skeleton on every interaction (§13 / §1.1.H —
    // mirrors the sibling `useMaterialIssues`). Not a QueryClient-config
    // override (§6.5.1), so it's safe per-hook.
    placeholderData: keepPreviousData,
  });
}
