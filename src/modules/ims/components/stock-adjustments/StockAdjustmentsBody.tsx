import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, FileUp, Plus } from "lucide-react";

import { ListPageShell } from "@/components/page-shells";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import {
  BusinessMetricsTable,
  type CellFormatter,
} from "@/components/common/tables/BusinessMetricsTable";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE, PAGINATION } from "@/shared/constants";
import { formatIST_date } from "@shared/lib/date";
import { usePermission } from "@shared/rbac";
import { recordLabelState } from "@shared/routing/record-label";

import { IMS_SEARCH_MAX_LEN } from "../../constants";
import { useDownloadImportTemplate } from "../../hooks/stock-adjustments/useDownloadImportTemplate";
import { useStockAdjustmentsList } from "../../hooks/stock-adjustments/useStockAdjustmentsList";
import {
  ADJUSTMENT_TAB_IDS,
  ADJUSTMENT_TAB_LABEL,
  adjustmentReasonLabel,
  adjustmentStatusLabel,
  adjustmentStatusVariant,
  type AdjustmentTabId,
} from "../../lib/stock-adjustment-labels";
import { imsCan } from "../../permissions";
import { adjustmentToolbarFilters, onAdjustmentToolbarChange } from "./adjustment-toolbar-filters";
import { ImportAdjustmentDialog } from "./ImportAdjustmentDialog";
import { ADJUSTMENT_COLUMNS, ADJUSTMENT_DATE_KEYS } from "./stock-adjustments.columns";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

const cellFormatter: CellFormatter = (value, key) => {
  if (key === "adjustment_number") {
    return { display: <Typography variant="table-name">{String(value)}</Typography> };
  }
  if (key === "reason") return { display: adjustmentReasonLabel(String(value)) };
  if (key === "status") {
    const status = String(value);
    return { display: <StatusBadge variant={adjustmentStatusVariant(status)}>{adjustmentStatusLabel(status)}</StatusBadge> };
  }
  if (ADJUSTMENT_DATE_KEYS.has(key)) {
    // Date only, like every other list; the detail page has the full IST time.
    return { display: <span className="tabular-nums">{value ? formatIST_date(String(value)) : EMPTY_VALUE}</span> };
  }
  if (key === "units_to_add" || key === "units_to_remove") {
    return { display: <span className="tabular-nums">{Number(value)}</span> };
  }
  return value == null ? { display: EMPTY_VALUE } : null;
};

/** Stock adjustments listing (spec §7). */
export function StockAdjustmentsBody() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canCreate = can(imsCan.stockAdjust);
  const [importOpen, setImportOpen] = useState(false);
  const { lv, query, listTotal, countFor, rows } = useStockAdjustmentsList();
  const template = useDownloadImportTemplate();

  const tabs = ADJUSTMENT_TAB_IDS.map((id) => ({
    id,
    label: ADJUSTMENT_TAB_LABEL[id],
    count: countFor(id),
    columns: ADJUSTMENT_COLUMNS,
    data: rows,
  }));

  const actions = canCreate ? (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => template.mutate()} disabled={template.isPending}>
        <Download className="mr-1.5 size-4" />
        {S.import.downloadTemplate}
      </Button>
      <Button variant="outline" onClick={() => setImportOpen(true)}>
        <FileUp className="mr-1.5 size-4" />
        {S.list.import}
      </Button>
      <Button render={<Link to="/ims/stock-adjustments/new" />}>
        <Plus className="mr-1.5 size-4" />
        {S.list.newAdjustment}
      </Button>
    </div>
  ) : undefined;

  return (
    <ListPageShell title={S.list.title} subtitle={S.list.subtitle} actions={actions}>
      <BusinessMetricsTable
        filterSize="default"
        showIndex
        tabs={tabs}
        activeTab={lv.activeTab}
        onTabChange={(tabId) => lv.setActiveTab(tabId as AdjustmentTabId)}
        cellFormatter={cellFormatter}
        searchValue={lv.view.search}
        onSearchChange={(value) => lv.setSearch(value.slice(0, IMS_SEARCH_MAX_LEN))}
        searchPlaceholder={S.list.searchPlaceholder}
        toolbarFilters={adjustmentToolbarFilters(lv)}
        onToolbarFilterChange={(key, value) => onAdjustmentToolbarChange(lv, key, value)}
        onClearFilters={lv.clearFilters}
        pageSize={lv.view.pageSize}
        onRowClick={(row) =>
          navigate(`/ims/stock-adjustments/${String(row.id)}`, {
            state: recordLabelState(String(row.adjustment_number)),
          })
        }
        error={query.isError ? { title: S.list.error, onRetry: () => void query.refetch() } : undefined}
        emptyState={{
          title: S.list.empty,
          description: S.list.emptyHelper,
          action: canCreate
            ? { label: S.list.newAdjustment, onClick: () => navigate("/ims/stock-adjustments/new") }
            : undefined,
        }}
        serverPagination={{
          page: lv.view.page,
          pageSize: lv.view.pageSize,
          total: listTotal,
          isFetching: query.isFetching,
          onPageChange: lv.setPage,
          onPageSizeChange: lv.setPageSize,
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
        }}
      />
      {importOpen ? <ImportAdjustmentDialog onClose={() => setImportOpen(false)} /> : null}
    </ListPageShell>
  );
}
