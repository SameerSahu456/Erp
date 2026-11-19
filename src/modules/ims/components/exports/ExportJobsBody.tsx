import { useState } from "react";
import { Plus } from "lucide-react";

import { ListPageShell } from "@/components/page-shells";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type ToolbarFilter,
} from "@/components/common/tables/BusinessMetricsTable";
import { Button } from "@/components/ui/button";
import { isForbidden } from "@/shared/api/envelope";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { EMPTY_VALUE, PAGINATION } from "@/shared/constants";
import { usePermission } from "@shared/rbac";

import {
  EXPORT_TAB_IDS,
  useExportJobsList,
  type ExportTabId,
} from "../../hooks/exports/useExportJobsList";
import { optionsOf } from "../../lib/enum-options";
import { EXPORT_FORMAT_LABEL, EXPORT_TYPE_LABEL } from "../../lib/export-labels";
import type { ExportFilters, ExportFormat, ExportStatus, ExportType } from "../../lib/export-types";
import { imsCan } from "../../permissions";
import { exportFiltersSummary } from "./export-filters-summary";
import { EXPORT_TAB_LABEL, exportJobColumns } from "./export-jobs.columns";
import {
  ExportExpiresCell,
  ExportFileCell,
  ExportRequestedCell,
  ExportStatusCell,
  ExportTypeCell,
} from "./ExportJobCells";
import { ExportJobActions } from "./ExportJobActions";
import { NewExportDialog } from "./NewExportDialog";
import { EXPORTS_STRINGS as S } from "./exports.strings";

const orNull = (v: unknown) => (v == null ? null : String(v));

const cellFormatter: CellFormatter = (value, key, row) => {
  const status = String(row.status);
  switch (key) {
    case "type":
      return {
        display: (
          <ExportTypeCell type={EXPORT_TYPE_LABEL[value as ExportType]} format={EXPORT_FORMAT_LABEL[row.format as ExportFormat]} />
        ),
      };
    case "filters":
      return { display: exportFiltersSummary(value as ExportFilters) };
    case "requested":
      return { display: <ExportRequestedCell iso={String(value)} /> };
    case "status":
      return { display: <ExportStatusCell status={status} errorCode={orNull(row.errorCode)} errorMessage={orNull(row.errorMessage)} /> };
    case "rows":
      return { display: <ExportFileCell rows={value} size={row.size} downloads={row.downloads} /> };
    case "expires":
      return { display: <ExportExpiresCell status={status} expiresAt={orNull(value)} /> };
    case "actions":
      return { display: <ExportJobActions id={String(row.id)} status={status as ExportStatus} /> };
    default:
      return value == null ? { display: EMPTY_VALUE } : null;
  }
};

/** "My exports" — background export jobs (spec E5–E7, §7). */
export function ExportJobsBody() {
  const { can } = usePermission();
  const canExport = can(imsCan.export);
  const [newOpen, setNewOpen] = useState(false);
  const { lv, query, rows, total, countFor } = useExportJobsList();
  const columns = exportJobColumns(can(imsCan.exportViewAll));
  const tabs = EXPORT_TAB_IDS.map((id) => ({ id, label: EXPORT_TAB_LABEL[id], count: countFor(id), columns, data: rows }));
  const toolbarFilters: ToolbarFilter[] = [
    { key: "type", label: S.list.filterType, allLabel: S.list.allTypes, value: lv.view.filters.exportType, options: optionsOf(EXPORT_TYPE_LABEL) },
  ];
  const openNew = () => setNewOpen(true);
  const actions = canExport ? (
    <Button onClick={openNew}>
      <Plus className="mr-1.5 size-4" aria-hidden />
      {S.create.button}
    </Button>
  ) : undefined;
  // A failed background poll keeps the rows; only a first-load failure shows the error.
  const loadError = query.isError && rows.length === 0 ? { description: S.list.error, onRetry: () => void query.refetch() } : undefined;

  return (
    <ListPageShell title={S.list.title} subtitle={S.list.subtitle} actions={actions}>
      {query.isError && isForbidden(query.error) ? (
        <LoadErrorState error={query.error} fallback={S.list.error} />
      ) : (
        <BusinessMetricsTable
          filterSize="default"
          showIndex
          searchable={false}
          tabs={tabs}
          activeTab={lv.activeTab}
          onTabChange={(tabId) => lv.setActiveTab(tabId as ExportTabId)}
          cellFormatter={cellFormatter}
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={(_key, value) => lv.setFilters({ exportType: value as ExportType | "" })}
          onClearFilters={lv.clearFilters}
          pageSize={lv.view.pageSize}
          error={loadError}
          emptyState={{
            title: S.list.empty,
            description: S.list.emptyHelper,
            action: canExport ? { label: S.create.button, onClick: openNew } : undefined,
          }}
          serverPagination={{
            page: lv.view.page,
            pageSize: lv.view.pageSize,
            total,
            // Only a page/tab change dims the table — a background poll doesn't.
            isFetching: query.isFetching && query.isPlaceholderData,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
            pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
          }}
        />
      )}
      {canExport ? <NewExportDialog open={newOpen} onOpenChange={setNewOpen} /> : null}
    </ListPageShell>
  );
}
