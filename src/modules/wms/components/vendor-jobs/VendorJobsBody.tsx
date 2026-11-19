/**
 * The vendor-jobs queue — ONE component for EVERY section.
 *
 * With no `sectionCode` it is the cross-section view ("what is outside the
 * building right now"); with one it is that section's page. Nothing here
 * branches on a section code: the title, the columns and the tabs are all
 * driven by the `service_sections` row, which is what lets a newly seeded
 * section work with no code change. State lives in `useVendorJobsList`.
 */
import { useNavigate } from "react-router-dom";

import { ListPageShell } from "@/components/page-shells";
import { AsyncSelect } from "@/components/ui/async-select";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Typography } from "@/components/ui/typography";
import { BusinessMetricsTable, type CellFormatter } from "@/components/common/tables/BusinessMetricsTable";
import { StatusBadge } from "@/components/common/display/StatusBadge";

import { usePermission } from "@shared/rbac";

import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { wmsPermissions } from "../../permissions";
import { useWmsStageAccess } from "../../hooks/operations/useStageAccess";
import { useVendorJobsList } from "../../hooks/vendor-jobs/useVendorJobsList";
import { deviceDetailPath } from "../devices/device-detail/helpers";
import { VENDOR_JOBS_STRINGS as S } from "./vendor-jobs.strings";
import { VENDOR_JOB_STAGE_VARIANT, type VendorJobTabId } from "./vendor-jobs-list.columns";
import { VendorJobRowActions } from "./VendorJobRowActions";
import { VendorJobActionDialog } from "./VendorJobActionDialog";

export function VendorJobsBody() {
  const navigate = useNavigate();
  const v = useVendorJobsList();
  const { jobsQuery } = v;
  // Row actions are permission-gated to match the backend (§5); resolved once
  // here rather than per row.
  const perm = usePermission();
  const canManageJob = perm.can(wmsPermissions.SERVICE_JOB_MANAGE);
  const canCompleteJob = perm.can(wmsPermissions.SERVICE_JOB_COMPLETE);
  const { canStage } = useWmsStageAccess();

  if (v.sectionUnknown) {
    return (
      <ListPageShell title={S.allSectionsTitle}>
        <EmptyState title={S.sectionNotFound.title} description={S.sectionNotFound.description} />
      </ListPageShell>
    );
  }

  // One vendor for every tab; a searchable picker via the table's render escape
  // hatch, with `value` set so "Clear filters" sees it as active.
  const toolbarFilters = [
    {
      key: "vendor",
      label: S.vendorFilter.label,
      value: v.vendor?.id ?? "",
      options: [],
      render: () => (
        <AsyncSelect
          value={v.vendor}
          onValueChange={v.setVendor}
          useOptions={v.useVendorOptions}
          toLabel={(o) => o.label}
          placeholder={S.vendorFilter.all}
          searchPlaceholder={S.vendorFilter.search}
          clearable
          chevron="down"
          className="h-9 w-auto text-foreground"
        />
      ),
    },
  ];

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "actions") {
      const jobId = String(value);
      const job = v.jobs.find((j) => j.id === jobId);
      return {
        display: (
          <VendorJobRowActions
            jobId={jobId}
            stage={String(row.stage)}
            canManage={canManageJob}
            canComplete={canCompleteJob}
            canCancel={canStage("service_job", job?.warehouse_id)}
            onAction={v.openDialog}
          />
        ),
      };
    }
    if (key === "outcome") {
      if (value) {
        const failed = value === "fail";
        return {
          display: (
            <StatusBadge variant={failed ? "error" : "success"}>{failed ? S.outcome.fail : S.outcome.pass}</StatusBadge>
          ),
        };
      }
      const stage = String(row.stage);
      return {
        display: (
          <StatusBadge variant={VENDOR_JOB_STAGE_VARIANT[stage] ?? "neutral"}>
            {S.tabs[stage as VendorJobTabId] ?? stage}
          </StatusBadge>
        ),
      };
    }
    if (key === "disposition" && value) {
      return {
        display: (
          <Typography variant="body" asChild>
            <span>{S.disposition[value as "repaired" | "replaced"]}</span>
          </Typography>
        ),
      };
    }
    return null;
  };

  return (
    <>
      <ListPageShell
        title={v.section?.name ?? S.allSectionsTitle}
        subtitle={v.section ? S.sectionSubtitle(v.section.name) : S.allSectionsSubtitle}
      >
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          tabs={v.tabs}
          activeTab={v.tab}
          onTabChange={(id) => v.setTab(id as VendorJobTabId)}
          persistKey="wms-vendor-jobs"
          searchValue={v.search}
          searchPlaceholder={S.searchPlaceholder}
          onSearchChange={v.setSearch}
          toolbarFilters={toolbarFilters}
          onClearFilters={v.clearFilters}
          serverPagination={{
            page: v.page,
            pageSize: v.pageSize,
            total: jobsQuery.data?.total ?? 0,
            isFetching: jobsQuery.isFetching,
            onPageChange: v.setPage,
            onPageSizeChange: v.setPageSize,
            sort: { column: v.sortColumn, direction: v.sortDirection },
            onSortChange: v.setSort,
          }}
          cellFormatter={cellFormatter}
          onRowClick={(row) => {
            const sid = row.stockItemId as string | undefined;
            if (sid) navigate(deviceDetailPath(sid, "vendor-jobs"));
          }}
          emptyState={{
            title: jobsQuery.isError ? S.error.title : S.empty.title,
            description: jobsQuery.isError ? S.error.body : S.empty.body,
            // §12: on error, offer a retry instead of a dead end.
            action: jobsQuery.isError ? { label: S.error.retry, onClick: () => void jobsQuery.refetch() } : undefined,
          }}
        />
      </ListPageShell>

      <VendorJobActionDialog dialog={v.dialog} section={v.dialogSection} onClose={v.closeDialog} />
    </>
  );
}
