import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { EntityRef } from "@/components/common/display/EntityRef";
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from "@/components/common/tables/BusinessMetricsTable";
import { ListPageShell } from "@/components/page-shells";
import { recordLabelState } from "@shared/routing/record-label";

import type { MaterialIssueLineRow, MaterialIssueStage, MaterialIssueType } from "../../api";
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { ISSUE_TYPE_OPTIONS } from "../../constants/material-issue-status";
import { useMaterialIssueWorklist } from "../../hooks/material-issue/useMaterialIssueWorklist";
import { RentalOrderNumberTag } from "../shared/RentalOrderNumberTag";
import { WmsStatsCards } from "../shared/WmsStatsCards";
import { MaterialIssueQcDialog } from "./MaterialIssueQcDialog";
import { RowActions } from "./RowActions";
import { MiEngineerFilter, MiStageCell, MiTypeCell } from "./MaterialIssueWorklistCells";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { TAB_LABELS, NO_ACTION_TABS, variantRowLabel, columns } from "./material-issue-lines-helpers";

const ALL_SENTINEL = "__all__";
const COLUMNS_NO_ACTIONS = columns.filter((c) => c.key !== "actions");
const TOOLBAR_TYPE_OPTIONS = ISSUE_TYPE_OPTIONS.map((m) => ({ value: m.value, label: m.label }));

export function MaterialIssueWorklistBody() {
  const navigate = useNavigate();
  const w = useMaterialIssueWorklist();
  const { lv, activeTab, linesQuery } = w;
  const { search, sortColumn, sortDirection, page, pageSize, filters } = lv.view;
  const clearEngineer = () => lv.setFilters({ engineer_id: "", engineer_label: "" });

  // Terminal stages have no row actions, so drop the (empty) actions column.
  const tabs: TabConfig[] = w.visibleTabIds.map((id) => ({
    id,
    label: TAB_LABELS[id],
    count: w.countFor(id),
    columns: NO_ACTION_TABS.has(id) ? COLUMNS_NO_ACTIONS : columns,
    data: activeTab === id ? w.tableRows : [],
  }));

  const toolbarFilters = [
    {
      key: "issue_type",
      label: S.worklist.filters.issueType,
      allLabel: S.worklist.filters.allTypes,
      value: filters.issue_type,
      options: TOOLBAR_TYPE_OPTIONS,
    },
  ];

  // Engineer is an API-backed list, rendered per-column through renderFilter;
  // its value mirrors into BMT's filter state so "clear filters" clears it.
  const renderFilter = ({ column }: { column: { key: string } }) => {
    if (column.key !== "issuedTo" || !w.showEngineerFilter) return null;
    return (
      <MiEngineerFilter
        engineerId={filters.engineer_id}
        engineerLabel={filters.engineer_label}
        onChange={(next) => lv.setFilters({ engineer_id: next?.id ?? "", engineer_label: next?.label ?? "" })}
        useOptions={w.useEngineerOptions}
      />
    );
  };

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "issueNo") {
      // Single click opens the MI, double click copies the number. The row id
      // is the LINE id, so the MI id rides on `materialIssueId`.
      return {
        display: (
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <EntityRef kind="material_issue" id={String(row.materialIssueId)} value={String(value)} className="font-semibold">
              {String(value)}
            </EntityRef>
            <RentalOrderNumberTag orderNumber={row.rentalOrderNumber as string | null} />
          </span>
        ),
      };
    }
    if (key === "serial") {
      return { display: <TruncatedText value={String(value)} mono breakAll className="max-w-full" /> };
    }
    if (key === "type") return { display: <MiTypeCell label={String(value)} /> };
    if (key === "stage") return { display: <MiStageCell stage={value as MaterialIssueStage} /> };
    if (key === "actions") {
      return {
        display: (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <RowActions
              row={row.raw as MaterialIssueLineRow}
              qcOnly={w.qcOnly}
              onQc={w.setQcRow}
              onEdit={(miId) => navigate(`/wms/material-issue/${miId}/edit`)}
              onIssue={(miId) => w.issueMutation.mutate(miId)}
              onCancel={(miId) => w.cancelMutation.mutate(miId)}
            />
          </div>
        ),
      };
    }
    return null;
  };

  return (
    <ListPageShell
      title={S.worklist.title}
      subtitle={S.worklist.subtitle}
      actions={
        w.canManage ? (
          <Button onClick={() => navigate("/wms/material-issue/new")}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.worklist.newButton}
          </Button>
        ) : undefined
      }
    >
      <WmsStatsCards scope="material_issue" warehouseIds={w.selectedWarehouseIds} />

      <div className="bmt-search-md wms-narrow-search">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => lv.setActiveTab(tabId as typeof activeTab)}
          cellFormatter={cellFormatter}
          persistKey="wms-material-issue-worklist"
          onRowClick={(row) =>
            navigate(`/wms/material-issue/${row.materialIssueId}`, { state: recordLabelState(row.issueNo) })
          }
          searchValue={search}
          searchPlaceholder={S.worklist.filters.search}
          onSearchChange={lv.setSearch}
          dateRange={{ value: filters.dateRange, onChange: (r) => lv.setFilters({ dateRange: r }) }}
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={(filterKey, filterValue) => {
            if (filterKey === "issue_type") lv.setFilters({ issue_type: filterValue as MaterialIssueType | "" });
          }}
          renderFilter={renderFilter}
          onClearFilters={lv.clearFilters}
          serverPagination={{
            page,
            pageSize,
            total: w.total,
            isFetching: linesQuery.isFetching,
            sort: { column: sortColumn, direction: sortDirection },
            onSortChange: lv.setSort,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
            filters: filters.engineer_id ? { issuedTo: filters.engineer_id } : {},
            onFiltersChange: (next) => {
              if (!next.issuedTo || next.issuedTo === ALL_SENTINEL) clearEngineer();
            },
          }}
          error={
            linesQuery.isError
              ? {
                  title: S.worklist.error.title,
                  description: S.worklist.error.description,
                  onRetry: () => void linesQuery.refetch(),
                }
              : undefined
          }
          emptyState={{ title: S.worklist.empty.title, description: S.worklist.empty.description }}
        />
      </div>

      <MaterialIssueQcDialog
        materialIssueId={w.qcRow?.material_issue_id ?? ""}
        lineId={w.qcRow?.line_id ?? null}
        lineLabel={w.qcRow ? variantRowLabel(w.qcRow) : undefined}
        open={w.qcRow !== null}
        onOpenChange={(open) => {
          if (!open) w.setQcRow(null);
        }}
      />
    </ListPageShell>
  );
}
