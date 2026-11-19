import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeftRight, PackageCheck, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListPageShell } from "@/components/page-shells";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type ToolbarFilter,
} from "@/components/common/tables/BusinessMetricsTable";
import { StatsRow, type StatCardData } from "@/components/common/display/StatsRow";
import { EntityRef } from "@/components/common/display/EntityRef";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { DateRangePicker } from "@/components/common/pickers/DateRangePicker";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { PAGINATION } from "@/shared/constants";
import { formatIST_date } from "@shared/lib/date";
import { recordLabelState } from "@shared/routing/record-label";
import { usePermission } from "@shared/rbac";

import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { wmsCan } from "../../permissions";
import { useWarehouseTransfersList } from "../../hooks/stock-transfer/useWarehouseTransfersList";
import { MOVE_STOCK_PAGE_STRINGS, TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";
import { WarehouseTransferStatusCell } from "./WarehouseTransferStatusCell";
import {
  TRANSFER_COLUMNS,
  TRANSFER_DATE_FILTER_CLASS,
  TRANSFER_TAB_IDS,
  TRANSFER_TAB_LABEL,
  type TransferTabId,
} from "./warehouse-transfers.columns";

const DASH = "—";

/** Stock in flight between warehouses. */
export function WarehouseTransfersBody() {
  const navigate = useNavigate();
  const { lv, query, listTotal, countFor, rows, kpiTotals } = useWarehouseTransfersList();
  const { filters } = lv.view;
  // Same gate as the /transfers/move route (the transfer endpoint's gate).
  const canMoveStock = usePermission().can([...wmsCan.outwardManage]);

  const kpis: StatCardData[] = [
    { label: S.kpiTotal, value: kpiTotals.all, icon: ArrowLeftRight, accent: "primary" },
    { label: S.kpiInTransit, value: kpiTotals.inTransit, icon: Truck, accent: "info" },
    { label: S.kpiOverdue, value: kpiTotals.overdue, icon: AlertTriangle, accent: "danger" },
    { label: S.kpiReceived, value: kpiTotals.received, icon: PackageCheck, accent: "success" },
  ];

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "number") {
      return {
        display: (
          <EntityRef kind="transfer" id={String(row.id)} value={String(value)} className="min-w-0 truncate font-semibold">
            {String(value)}
          </EntityRef>
        ),
      };
    }
    if (key === "route") {
      return { display: <TruncatedText value={String(value)} className="max-w-[22rem]" /> };
    }
    if (key === "status") {
      return {
        display: (
          <WarehouseTransferStatusCell status={String(value)} isOverdue={Boolean((row as { isOverdue?: boolean }).isOverdue)} />
        ),
      };
    }
    if (key === "dispatched" || key === "expected") {
      return { display: <span className="tabular-nums">{value ? formatIST_date(String(value)) : DASH}</span> };
    }
    return null;
  };

  // Warehouse is scoped by the navbar, so no From/To filter here.
  const toolbarFilters: ToolbarFilter[] = [
    {
      key: "sent",
      label: S.filterSent,
      value: filters.sentRange ? "set" : "",
      options: [],
      render: () => (
        <DateRangePicker
          value={filters.sentRange}
          onChange={(r) => lv.setFilters({ sentRange: r })}
          placeholder={S.sentDatePlaceholder}
          className={TRANSFER_DATE_FILTER_CLASS}
        />
      ),
    },
    {
      key: "expected",
      label: S.filterExpected,
      value: filters.expectedRange ? "set" : "",
      options: [],
      render: () => (
        <DateRangePicker
          value={filters.expectedRange}
          onChange={(r) => lv.setFilters({ expectedRange: r })}
          placeholder={S.expectedDatePlaceholder}
          className={TRANSFER_DATE_FILTER_CLASS}
        />
      ),
    },
  ];

  const tabs = TRANSFER_TAB_IDS.map((id) => ({
    id,
    label: TRANSFER_TAB_LABEL[id],
    count: countFor(id),
    columns: TRANSFER_COLUMNS,
    data: rows,
  }));

  return (
    <ListPageShell
      title={S.title}
      subtitle={S.subtitle}
      stats={<StatsRow stats={kpis} />}
      actions={
        canMoveStock ? (
          <Button render={<Link to="/wms/transfers/move" />}>
            <ArrowLeftRight className="size-4" data-icon="inline-start" />
            {MOVE_STOCK_PAGE_STRINGS.listButton}
          </Button>
        ) : undefined
      }
    >
      {query.isError ? (
        <LoadErrorState error={query.error} fallback={S.error} />
      ) : (
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          tabs={tabs}
          activeTab={lv.activeTab}
          onTabChange={(tabId) => lv.setActiveTab(tabId as TransferTabId)}
          cellFormatter={cellFormatter}
          searchValue={lv.view.search}
          onSearchChange={lv.setSearch}
          searchPlaceholder={S.searchPlaceholder}
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={(key, value) => {
            // The date pickers own their own clear; this only fires on the
            // toolbar's reset affordance, where an empty value clears the range.
            if (key === "sent" && !value) lv.setFilters({ sentRange: undefined });
            else if (key === "expected" && !value) lv.setFilters({ expectedRange: undefined });
          }}
          onClearFilters={lv.clearFilters}
          pageSize={lv.view.pageSize}
          persistKey="wms-warehouse-transfers"
          onRowClick={(row) =>
            navigate(`/wms/transfers/${String(row.id)}`, { state: recordLabelState(row.number) })
          }
          emptyState={{ title: S.empty, description: S.emptyHelper }}
          serverPagination={{
            page: lv.view.page,
            pageSize: lv.view.pageSize,
            total: listTotal,
            isFetching: query.isFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
            pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
            sort: { column: lv.view.sortColumn, direction: lv.view.sortDirection },
            onSortChange: lv.setSort,
          }}
        />
      )}
    </ListPageShell>
  );
}
