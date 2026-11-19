import { useTabCounts } from "@/shared/hooks/useTabCounts";
import { useTabbedListView, type ListView } from "@/shared/hooks/useTabbedListView";

import { IMS_PAGE_SIZE } from "../../constants";
import { fetchExportJobCount, type ExportJobsParams } from "../../exports.api";
import type { ExportStatus, ExportType } from "../../lib/export-types";
import { imsKeys } from "../keys";
import { useExportJobs } from "./useExportJobs";

export type ExportTabId = ExportStatus | "all";
// "All" leads, like every other tabbed list.
export const EXPORT_TAB_IDS: readonly ExportTabId[] = [
  "all",
  "completed",
  "running",
  "queued",
  "failed",
  "expired",
];

export interface ExportJobFilters {
  exportType: ExportType | "";
}

const emptyFilters = (): ExportJobFilters => ({ exportType: "" });

// One place turns a tab's view into API params, so list + counts agree.
const paramsFor = (view: ListView<ExportJobFilters>, tabId: ExportTabId): ExportJobsParams => ({
  export_type: view.filters.exportType || undefined,
  status: tabId === "all" ? undefined : tabId,
});

/** "My exports" list owner — server-paged, status tabs + type filter. */
export function useExportJobsList() {
  const lv = useTabbedListView<ExportJobFilters, ExportTabId>({
    storageKey: "ims-exports",
    tabIds: EXPORT_TAB_IDS,
    defaultTab: "all",
    emptyFilters,
    pageSize: IMS_PAGE_SIZE,
  });
  const query = useExportJobs({
    ...paramsFor(lv.view, lv.activeTab),
    page: lv.view.page,
    page_size: lv.view.pageSize,
  });
  const total = query.data?.total ?? 0;

  const countFor = useTabCounts({
    tabIds: EXPORT_TAB_IDS,
    activeTab: lv.activeTab,
    activeTotal: query.isPlaceholderData ? 0 : total,
    paramsFor: (tabId: ExportTabId) => paramsFor(lv.viewByTab[tabId] ?? lv.view, tabId),
    queryKey: imsKeys.exports.count,
    fetchCount: fetchExportJobCount,
  });

  const rows = (query.data?.items ?? []).map((job) => ({
    id: job.id,
    type: job.export_type,
    format: job.format,
    filters: job.filters,
    requestedBy: job.requested_by_name,
    requested: job.created_at,
    status: job.status,
    errorCode: job.error_code,
    errorMessage: job.error_message,
    rows: job.row_count,
    size: job.file_size,
    expires: job.expires_at,
    downloads: job.download_count,
  }));

  return { lv, query, rows, total, countFor };
}
