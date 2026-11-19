import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { ListPageShell } from "@/components/page-shells";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
  type ToolbarFilter,
} from "@/components/common/tables/BusinessMetricsTable";
import { titleCaseWords } from "@/shared/lib/text";

import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { useWarehousesList } from "../../hooks/warehouses/useWarehousesList";
import { WAREHOUSES_BODY_STRINGS as S } from "./warehouses-body.strings";
import {
  WAREHOUSE_CONDITION_OPTIONS,
  WAREHOUSE_STATUS_TABS,
  type WarehouseStatusTabId,
} from "./warehouses-list.columns";
import { WarehouseConditionsCell, WarehouseLocationCell, WarehouseRowActions } from "./WarehouseListCells";

const NEW_PATH = "/wms/locations/new";

export function WarehousesBody() {
  const navigate = useNavigate();
  const w = useWarehousesList();
  const { lv, warehousesQuery } = w;
  const { search, page, pageSize, sortColumn, sortDirection } = lv.view;
  const goNew = () => navigate(NEW_PATH);

  const tabs: TabConfig[] = WAREHOUSE_STATUS_TABS.map((t) => ({
    id: t.id,
    label: S.tabs[t.id],
    count: w.countFor(t.id),
    columns: w.columns,
    data: w.activeTab === t.id ? w.rows : [],
  }));

  const toolbarFilters: ToolbarFilter[] = [
    {
      key: "condition",
      label: S.filters.conditionLabel,
      allLabel: S.filters.conditionAll,
      value: w.conditionFilter,
      options: WAREHOUSE_CONDITION_OPTIONS,
    },
  ];

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "name") {
      // Truncates to one line (hover reveal); title-cased for display.
      return { display: <TruncatedText value={titleCaseWords(String(value))} className="max-w-full font-medium" /> };
    }
    if (key === "code") {
      return {
        display: (
          <Typography variant="mono" asChild>
            <span>{String(value)}</span>
          </Typography>
        ),
      };
    }
    if (key === "location") {
      const loc = value as { city: string; state: string };
      return { display: <WarehouseLocationCell city={loc.city} state={loc.state} /> };
    }
    if (key === "conditions") {
      return { display: <WarehouseConditionsCell conditions={(value as string[]) ?? []} /> };
    }
    if (key === "status") {
      return { display: <StatusBadge variant={row.isActive ? "success" : "neutral"}>{String(value)}</StatusBadge> };
    }
    if (key === "actions") {
      // The Actions column only exists for managers (see warehouseColumns).
      const id = String(value);
      const active = !!row.isActive;
      const name = String(row.name ?? S.actions.nameFallback);
      return {
        display: (
          <WarehouseRowActions
            id={id}
            name={name}
            active={active}
            togglePending={w.togglePending}
            deletePending={w.deletePending}
            onToggle={() => w.toggleActive(id, active)}
            onDelete={() => w.setDeleteTarget({ id, name })}
          />
        ),
      };
    }
    return null;
  };

  // §12: an error needs a way out (retry); the empty-state create CTA is a
  // write action, so it is offered only to managers (§5).
  let emptyAction: { label: string; onClick: () => void } | undefined;
  if (warehousesQuery.isError) emptyAction = { label: S.retry, onClick: () => void warehousesQuery.refetch() };
  else if (w.canManage) emptyAction = { label: S.newWarehouse, onClick: goNew };

  return (
    <>
      <ListPageShell
        title={S.title}
        subtitle={S.subtitle}
        actions={
          w.canManage ? (
            <Button onClick={goNew}>
              <Plus className="size-4" data-icon="inline-start" />
              {S.newWarehouse}
            </Button>
          ) : undefined
        }
      >
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          tabs={tabs}
          activeTab={w.activeTab}
          onTabChange={(id) => lv.setActiveTab(id as WarehouseStatusTabId)}
          cellFormatter={cellFormatter}
          persistKey="wms-warehouses"
          searchPlaceholder={S.searchPlaceholder}
          // Row click opens the warehouse's locations workspace.
          onRowClick={(row) => navigate(`/wms/locations/${row.id}`)}
          searchValue={search}
          onSearchChange={lv.setSearch}
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={(key, value) => {
            if (key === "condition") w.setCondition(value);
          }}
          onClearFilters={w.clearFilters}
          serverPagination={{
            page,
            pageSize,
            total: w.total,
            isFetching: warehousesQuery.isFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
            sort: { column: sortColumn, direction: sortDirection },
            onSortChange: lv.setSort,
          }}
          emptyState={{
            title: warehousesQuery.isError ? S.errorTitle : S.emptyTitle,
            description: warehousesQuery.isError ? S.errorDescription : S.emptyDescription,
            action: emptyAction,
          }}
        />
      </ListPageShell>
      <ConfirmDialog
        open={!!w.deleteTarget}
        onOpenChange={(o) => {
          if (!o) w.setDeleteTarget(null);
        }}
        variant="destructive"
        title={S.deleteConfirm.title}
        description={w.deleteTarget ? S.deleteConfirm.description(w.deleteTarget.name) : ""}
        confirmLabel={S.deleteConfirm.confirm}
        cancelLabel={S.deleteConfirm.cancel}
        onConfirm={w.confirmDelete}
      />
    </>
  );
}
