import { useNavigate } from "react-router-dom";

import { BusinessMetricsTable } from "@/components/common/tables/BusinessMetricsTable";
import { ListPageShell } from "@/components/page-shells";
import { PAGINATION } from "@/shared/constants";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { usePermission } from "@shared/rbac";

import { RENTALS_LIST_MAX_CELL_CHARS } from "../../constants/list";
import { SALES_ORDERS_VIEW_KEY, useRentalSalesOrdersView } from "../../hooks/agreements/useRentalSalesOrdersView";
import { rentalsCan } from "../../permissions";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { BILLING_COMMON_STRINGS as B } from "../shared/billing-common.strings";
import { ListRowsSkeleton } from "./ListRowsSkeleton";
import { salesOrderCellFormatter } from "./rental-sales-orders.cells";
import { salesOrderEmptyState, salesOrderTabs, toSalesOrderRow } from "./rental-sales-orders.columns";
import { clearSalesOrderFilters, salesOrderFilterBar } from "./rental-sales-orders.filters";

export function RentalSalesOrdersBody() {
  const navigate = useNavigate();
  const view = useRentalSalesOrdersView();
  const { query } = view;
  const mayConfigure = usePermission().canAny(rentalsCan.configure);
  const rows = (query.data?.items ?? []).map(toSalesOrderRow);
  const cellFormatter = salesOrderCellFormatter({
    mayConfigure,
    // `?from=rentals` so the configure page's back returns HERE, not to CRM.
    onConfigure: (id) => navigate(`/rentals/sales-orders/${id}/configure?from=rentals`),
  });

  return (
    <ListPageShell title={S.list.title} subtitle={S.list.description} className="animate-fade-in-up">
      <BusinessMetricsTable
        maxCellChars={RENTALS_LIST_MAX_CELL_CHARS}
        tabs={salesOrderTabs(view.activeTab, rows, view.countFor)}
        activeTab={view.activeTab}
        onTabChange={view.setActiveTab}
        // The whole filter bar is the rentals filter components (search,
        // account, statuses, created date) — see `salesOrderFilterBar`.
        searchable={false}
        toolbarFilters={salesOrderFilterBar(view)}
        onClearFilters={() => clearSalesOrderFilters(view)}
        cellFormatter={cellFormatter}
        // The rentals agreement page, which links out to CRM for the commercial side.
        onRowClick={(row) => navigate(`/rentals/agreements/${String(row.id)}`)}
        persistKey={SALES_ORDERS_VIEW_KEY}
        serverPagination={{
          page: view.page,
          pageSize: view.pageSize,
          total: query.data?.total ?? 0,
          isFetching: query.isFetching,
          onPageChange: view.setPage,
          onPageSizeChange: view.setPageSize,
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
          // Sort and filter go to the SERVER — sorting one page would lie.
          sort: view.sort,
          onSortChange: (column, direction) => view.setSort({ column, direction }),
        }}
        emptyNode={
          query.isError ? (
            <LoadErrorState error={query.error} fallback={B.salesOrdersLoadError} className="m-4" />
          ) : query.isLoading ? (
            <div className="p-4">
              <ListRowsSkeleton rows={5} />
            </div>
          ) : undefined
        }
        emptyState={salesOrderEmptyState(view.activeTab)}
      />
    </ListPageShell>
  );
}
