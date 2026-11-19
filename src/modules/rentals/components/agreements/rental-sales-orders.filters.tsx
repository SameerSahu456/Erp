import type { ToolbarFilter } from "@/components/common/tables/BusinessMetricsTable";

import type { RentalSalesOrdersView } from "../../hooks/agreements/useRentalSalesOrdersView";
import { FilterDateRange } from "../shared/filters/FilterDateRange";
import { FilterSearch } from "../shared/filters/FilterSearch";
import { FilterSelect } from "../shared/filters/FilterSelect";
import { filterBar } from "../shared/filters/filterBar";
import { RENTALS_FILTER_STRINGS as F } from "../shared/filters/filters.strings";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { OrderStatusFilter, RentalStatusFilter } from "./RentalStatusFilter";

/** The register's filter bar — every control a rentals filter component.
 *  The two status filters are independent; the API ANDs them. */
export function salesOrderFilterBar(view: RentalSalesOrdersView): ToolbarFilter[] {
  const { status, setStatus, facets, filters, setFilters, created, setCreated } = view;
  const account = filters.account || undefined;
  return filterBar([
    {
      key: "search",
      active: view.search.trim() !== "",
      node: (
        <FilterSearch
          value={view.search}
          onChange={view.setSearch}
          placeholder={F.search}
          clearAriaLabel={F.clearSearch}
        />
      ),
    },
    {
      key: "account",
      active: !!account,
      node: (
        <FilterSelect
          placeholder={S.list.columns.account}
          value={account}
          options={(facets?.accounts ?? []).map((a) => ({ value: a, label: a }))}
          onChange={(next) => {
            const { account: _dropped, ...rest } = filters;
            setFilters(next ? { ...rest, account: next } : rest);
          }}
        />
      ),
    },
    {
      key: "soStatus",
      active: !!status.soStatus,
      node: (
        <OrderStatusFilter
          value={status.soStatus}
          onChange={(soStatus) => setStatus({ ...status, soStatus })}
          options={facets?.so_statuses ?? []}
        />
      ),
    },
    {
      key: "rentalStatus",
      active: !!status.rentalStatus,
      node: (
        <RentalStatusFilter
          value={status.rentalStatus}
          onChange={(rentalStatus) => setStatus({ ...status, rentalStatus })}
          options={facets?.rental_statuses ?? []}
        />
      ),
    },
    {
      key: "created",
      active: !!(created.from || created.to),
      node: (
        // A creation date is never in the future.
        <FilterDateRange
          value={created}
          onChange={setCreated}
          placeholder={S.list.filters.created}
          disableFuture
        />
      ),
    },
  ]);
}

/** Every filter back to empty — the empty state's "Clear filters". */
export function clearSalesOrderFilters(view: RentalSalesOrdersView): void {
  view.setSearch("");
  view.setFilters({});
  view.setStatus({});
  view.setCreated({});
}
