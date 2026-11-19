import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { EntityRef } from "@/components/common/display/EntityRef";
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from "@/components/common/tables/BusinessMetricsTable";
import { ListPageShell } from "@/components/page-shells";
import { usePermission } from "@shared/rbac";
import { recordLabelState } from "@shared/routing/record-label";

import { wmsCan } from "../../permissions";
import type { DispatchRequestListItem } from "../../api/dispatch";
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import {
  DISPATCH_REQUEST_STATUS_LABELS,
  DISPATCH_REQUEST_STATUS_VARIANT,
  DISPATCH_TYPE_OPTIONS,
} from "../../constants/dispatch-request";
import { useDispatchList } from "../../hooks/dispatches/useDispatchList";
import { RentalOrderNumberTag } from "../shared/RentalOrderNumberTag";
import { WmsStatsCards } from "../shared/WmsStatsCards";
import { DISPATCH_STRINGS as S } from "./dispatches.strings";
import {
  DISPATCH_LIST_COLUMNS,
  DISPATCH_STATUS_TAB_IDS,
  type DispatchStatusTabId,
} from "./dispatches-list.columns";

const NEW_PATH = "/wms/dispatches/new";

export function DispatchListBody() {
  const navigate = useNavigate();
  // "Create Dispatch" is an outward write — gate it on outward_manage so a
  // read-only viewer doesn't see a button that only 403s on /dispatches/new.
  const canManage = usePermission().can(wmsCan.outwardManage);
  const { lv, activeTab, selectedWarehouseIds, listQuery, total, countFor, tableRows } = useDispatchList();
  const { search, sortColumn, sortDirection, page, pageSize, filters } = lv.view;

  const tabs: TabConfig[] = DISPATCH_STATUS_TAB_IDS.map((id) => ({
    id,
    label: S.list.tabs[id as keyof typeof S.list.tabs],
    count: countFor(id),
    columns: DISPATCH_LIST_COLUMNS,
    data: activeTab === id ? tableRows : [],
  }));

  const toolbarFilters = [
    {
      key: "dispatch_type",
      label: S.list.filters.dispatchType,
      allLabel: S.list.filters.allTypes,
      value: filters.dispatch_type,
      options: DISPATCH_TYPE_OPTIONS,
    },
  ];

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "dispatchNumber" && typeof value === "string") {
      // Single click opens the dispatch, double click copies the number.
      return {
        display: (
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <EntityRef kind="dispatch" id={String(row.id)} value={value} className="font-semibold">
              {value}
            </EntityRef>
            <RentalOrderNumberTag orderNumber={row.rentalOrderNumber as string | null} />
          </span>
        ),
      };
    }
    if (key === "dispatchType" && typeof value === "string") {
      return { display: <StatusBadge variant="neutral">{value}</StatusBadge> };
    }
    if (key === "status" && typeof value === "string") {
      const status = value as DispatchRequestListItem["status"];
      return {
        display: (
          <StatusBadge variant={DISPATCH_REQUEST_STATUS_VARIANT[status] ?? "neutral"}>
            {DISPATCH_REQUEST_STATUS_LABELS[status] ?? value}
          </StatusBadge>
        ),
      };
    }
    if (key === "account" || key === "warehouse") {
      return { display: <TruncatedText value={String(value)} className="max-w-full" /> };
    }
    return null;
  };

  return (
    <ListPageShell
      title={S.list.title}
      subtitle={S.list.subtitle}
      actions={
        canManage ? (
          <Button onClick={() => navigate(NEW_PATH)}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.list.createButton}
          </Button>
        ) : undefined
      }
    >
      <WmsStatsCards scope="dispatch" warehouseIds={selectedWarehouseIds} />

      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => lv.setActiveTab(tabId as DispatchStatusTabId)}
          cellFormatter={cellFormatter}
          persistKey="wms-dispatch-requests"
          onRowClick={(row) =>
            navigate(`/wms/dispatches/${row.id}`, { state: recordLabelState(row.dispatchNumber) })
          }
          searchPlaceholder={S.list.searchPlaceholder}
          searchValue={search}
          onSearchChange={lv.setSearch}
          dateRange={{ value: filters.dateRange, onChange: (r) => lv.setFilters({ dateRange: r }) }}
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={(filterKey, filterValue) => {
            if (filterKey === "dispatch_type") lv.setFilters({ dispatch_type: filterValue });
          }}
          serverPagination={{
            page,
            pageSize,
            total,
            isFetching: listQuery.isFetching,
            sort: { column: sortColumn, direction: sortDirection },
            onSortChange: lv.setSort,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
          }}
          // Empty-state "Clear filters" — BMT clears its own search/date, then
          // defers the rest here so the type filter doesn't linger.
          onClearFilters={lv.clearFilters}
          error={
            listQuery.isError
              ? {
                  title: S.list.error.title,
                  description: S.list.error.description,
                  onRetry: () => void listQuery.refetch(),
                }
              : undefined
          }
          emptyState={{
            title: S.list.empty.title,
            description: S.list.empty.description,
            action: canManage ? { label: S.list.empty.action, onClick: () => navigate(NEW_PATH) } : undefined,
          }}
        />
      </div>
    </ListPageShell>
  );
}
