import { useState } from "react";

import type { AsyncSelectOption } from "@/components/ui/async-select";
import type { SortDirection } from "@/components/common/tables/BusinessMetricsTable";
import {
  useClearFiltersOnReload,
  useFilterParams,
  useListSearchFilters,
  usePageSizeParam,
} from "@/shared/hooks";
import { asUuid } from "@shared/lib/validation";

import { IMS_PAGE_SIZE, IMS_SEARCH_MAX_LEN } from "../../constants";
import { resolveEnumParam, resolveSortParam } from "../../lib/list-params";
import { useVariantsListPage } from "../variants/useVariants";
import { useOEM } from "../oems/useOEMs";
import { CONDITION_DISPLAY } from "../../components/stock/stock-body-helpers";
import { STOCK_SORT_FIELD_MAP, toStockRow } from "../../components/stock/stock-list.columns";
import {
  parseSpecFilterParam,
  serializeSpecFilter,
} from "../../components/specification-attributes/spec-filter";

const STOCK_CONDITIONS = ["all", "new", "refurbished", "new_pull"] as const;
type StockCondition = (typeof STOCK_CONDITIONS)[number];

/** Display label BMT emits ("New Pull") → backend code, or null for no filter. */
function conditionFromDisplay(display: string | undefined): string | null {
  if (!display) return null;
  return Object.entries(CONDITION_DISPLAY).find(([, label]) => label === display)?.[0] ?? null;
}

/** BMT filter state: id-keyed for category/OEM, display-keyed for condition. */
function toTableFilters(categoryId: string | null, oemId: string | null, condition: StockCondition) {
  const filters: Record<string, string> = {};
  if (categoryId) filters.category = categoryId;
  if (oemId) filters.oem = oemId;
  if (condition !== "all") filters.condition = CONDITION_DISPLAY[condition] ?? condition;
  return filters;
}

/** URL-backed filter/sort/page state; every value is valid by construction (§11.1). */
function useStockUrlState() {
  const { get, set, setMany, clear } = useFilterParams();
  const sortRaw = get("sort");
  // Malformed spec pairs are dropped, never sent.
  const specFilter = parseSpecFilterParam(get("specs"));
  return {
    set,
    setMany,
    clear,
    search: get("search"),
    categoryId: asUuid(get("category_id")),
    oemId: asUuid(get("oem_id")),
    condition: resolveEnumParam<StockCondition>(get("condition", "all"), STOCK_CONDITIONS, "all"),
    specFilter,
    hasSpecFilter: Object.keys(specFilter).length > 0,
    page: Math.max(1, Number(get("page", "1")) || 1),
    sortRaw,
    sortColumn: sortRaw.replace(/^-/, ""),
    sortDirection: (sortRaw === "" ? null : sortRaw.startsWith("-") ? "desc" : "asc") as SortDirection,
  };
}

/** OEM filter chip: the picked option, else re-hydrated by id after a remount. */
function useOemFilterValue(oemId: string | null) {
  const [oemOption, setOemOption] = useState<AsyncSelectOption | null>(null);
  const oemQuery = useOEM(oemId ?? "");
  let oemValue: AsyncSelectOption | null = null;
  if (oemOption && oemOption.id === oemId) oemValue = oemOption;
  else if (oemId && oemQuery.data) oemValue = { id: oemQuery.data.id, label: oemQuery.data.name };
  return { oemValue, setOemOption };
}

/** State + data owner for the Stock Items listing (one row per variant). */
export function useStockListView() {
  // Browser reload drops every URL param; SPA back-nav keeps them.
  useClearFiltersOnReload();
  const url = useStockUrlState();
  const { setMany, categoryId, oemId, condition, specFilter, hasSpecFilter } = url;
  const [pageSize, setPageSize] = usePageSizeParam({ defaultSize: IMS_PAGE_SIZE });
  const oem = useOemFilterValue(oemId);

  const { searchParam, externalFiltersActive } = useListSearchFilters({
    search: url.search,
    maxLength: IMS_SEARCH_MAX_LEN,
    filterFlags: [!!categoryId, !!oemId, condition !== "all", hasSpecFilter],
  });
  const stockQuery = useVariantsListPage({
    page: url.page,
    page_size: pageSize,
    search: searchParam,
    category_id: categoryId ?? undefined,
    oem_id: oemId ?? undefined,
    condition: condition === "all" ? undefined : condition,
    specs: hasSpecFilter ? specFilter : undefined,
    sort: resolveSortParam(url.sortRaw, STOCK_SORT_FIELD_MAP),
  });
  const items = stockQuery.data?.items ?? [];


  return {
    stockQuery,
    rows: items.map(toStockRow),
    total: stockQuery.data?.total ?? 0,
    // Payload shape is the price-visibility signal: the backend omits sell_price without ims:price_read.
    showPrice: items.some((item) => item.sell_price != null),
    page: url.page,
    pageSize,
    setPageSize,
    setPage: (n: number) => url.set("page", n > 1 ? String(n) : null),
    // `set` already drops `page`; capped so a long paste can't 422.
    setSearch: (q: string) => url.set("search", q.slice(0, IMS_SEARCH_MAX_LEN)),
    sort: { column: url.sortDirection ? url.sortColumn : null, direction: url.sortDirection },
    onSortChange: (col: string | null, dir: SortDirection) =>
      setMany({ sort: col && dir ? `${dir === "desc" ? "-" : ""}${col}` : null, page: null }),
    tableFilters: toTableFilters(categoryId, oemId, condition),
    // One setMany so category + OEM + condition + page reset don't stomp each other.
    onFiltersChange: (next: Record<string, string>) =>
      setMany({
        category_id: next.category || null,
        oem_id: next.oem || null,
        condition: conditionFromDisplay(next.condition),
        page: null,
      }),
    specFilter,
    hasSpecFilter,
    applySpecFilter: (next: Record<string, string>) =>
      setMany({ specs: serializeSpecFilter(next), page: null }),
    clearFilters: url.clear,
    externalFiltersActive,
    ...oem,
    // Spec filters have no export equivalent and are not sent (spec E1).
    exportFilters: {
      category_id: categoryId,
      oem_id: oemId,
      condition: condition === "all" ? null : condition,
      search: searchParam ?? null,
    },
  };
}
