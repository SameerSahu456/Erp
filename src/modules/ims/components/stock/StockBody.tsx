import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { ListPageShell } from "@/components/page-shells";
import { BusinessMetricsTable, type CellFormatter } from "@/components/common/tables/BusinessMetricsTable";

import { ExportMenu } from "../exports/ExportMenu";
import { SpecFilterPopover } from "../specification-attributes/SpecFilterPopover";
import { SPEC_ATTRIBUTES_STRINGS } from "../specification-attributes/specification-attributes.strings";
import { useStockListView } from "../../hooks/stock/useStockListView";
import { STOCK_STRINGS } from "./stock.strings";
import { buildStockColumns, stockRowHref, STOCK_CONDITION_FILTER_OPTIONS } from "./stock-list.columns";
import {
  StockAliasesCell,
  StockConditionCell,
  StockCountCell,
  StockDescriptionCell,
  StockNameCell,
  StockPriceCell,
  StockTextCell,
} from "./StockListCells";
import { StockCategoryFilter, StockOemFilter } from "./StockListFilters";

const L = STOCK_STRINGS.list;
const STOCK_EXPORTS = ["stock_summary", "stock_units"] as const;

// `undefined` = fall back to BMT's default cell rendering.
type CellRenderer = (value: unknown, row: Record<string, unknown>) => ReactNode | undefined;
const count: CellRenderer = (v) => <StockCountCell value={v} />;

const CELL_RENDERERS: Record<string, CellRenderer> = {
  aliases: (v) => <StockAliasesCell aliases={v as string[] | undefined} />,
  description: (v) => <StockDescriptionCell value={v} />,
  oem: (v) => <StockTextCell value={v} />,
  category: (v) => <StockTextCell value={v} />,
  name: (v, row) => (typeof v === "string" ? <StockNameCell row={row} value={v} /> : undefined),
  condition: (v) => <StockConditionCell value={v} />,
  available: count,
  inOps: count,
  expected: count,
  allocated: count,
  onRent: count,
  installed: count,
  price: (v, row) => <StockPriceCell row={row} value={v} />,
};

const cellFormatter: CellFormatter = (value, key, row) => {
  const display = CELL_RENDERERS[key]?.(value, row);
  return display === undefined ? null : { display };
};

export function StockBody() {
  const navigate = useNavigate();
  const view = useStockListView();

  return (
    <ListPageShell
      title={L.title}
      subtitle={L.subtitle}
      actions={<ExportMenu exportTypes={STOCK_EXPORTS} filters={view.exportFilters} />}
    >
      <div className="bmt-search-lg">
        <BusinessMetricsTable
          className="ims-bmt-compact-filters"
          useAsyncFilterDropdowns
          showIndex
          renderFilter={({ column, value, onChange }) => {
            if (column.key === "oem") {
              return (
                <StockOemFilter onChange={onChange} option={view.oemValue} onOptionChange={view.setOemOption} />
              );
            }
            if (column.key !== "category") return null;
            return <StockCategoryFilter value={value} onChange={onChange} />;
          }}
          // The spec filter owns its popover via `render`; `value` stays set so
          // the table's active-filter detection sees it.
          toolbarFilters={[
            {
              key: "specs",
              label: SPEC_ATTRIBUTES_STRINGS.filter.heading,
              value: view.hasSpecFilter ? "set" : "",
              options: [],
              render: () => <SpecFilterPopover value={view.specFilter} onApply={view.applySpecFilter} />,
            },
          ]}
          tabs={[
            {
              id: "items",
              label: L.tabLabel(view.total),
              columns: buildStockColumns(view.showPrice),
              data: view.rows,
            },
          ]}
          cellFormatter={cellFormatter}
          searchable
          onSearchChange={view.setSearch}
          persistKey="ims-stock-items"
          serverPagination={{
            page: view.page,
            pageSize: view.pageSize,
            total: view.total,
            isFetching: view.stockQuery.isFetching,
            onPageChange: view.setPage,
            // usePageSizeParam resets the page key atomically.
            onPageSizeChange: view.setPageSize,
            sort: view.sort,
            onSortChange: view.onSortChange,
            filters: view.tableFilters,
            onFiltersChange: view.onFiltersChange,
            filterOptions: { condition: STOCK_CONDITION_FILTER_OPTIONS },
            searchableFilterColumns: ["category", "oem"],
          }}
          onRowClick={(row) => {
            const href = stockRowHref(row);
            if (href) navigate(href);
          }}
          error={
            view.stockQuery.isError
              ? { title: L.error.title, description: L.error.description, onRetry: () => void view.stockQuery.refetch() }
              : undefined
          }
          emptyState={{ title: L.empty.title, description: L.empty.description }}
          onClearFilters={view.clearFilters}
          externalFiltersActive={view.externalFiltersActive}
        />
      </div>
    </ListPageShell>
  );
}
