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
import { CONDITION_DISPLAY } from "../../components/parts/parts-body-helpers";
import { PARTS_SORT_FIELD_MAP, toPartRow } from "../../components/parts/parts-list.columns";
import { usePartsFlatPage } from "./useParts";

const PARTS_CONDITIONS = ["", "new", "refurbished", "new_pull"] as const;
type PartsCondition = (typeof PARTS_CONDITIONS)[number];

/** Display label BMT emits ("New Pull") → backend code ("new_pull"). */
function conditionFromDisplay(display: string | undefined): string | null {
  if (!display) return null;
  return Object.entries(CONDITION_DISPLAY).find(([, label]) => label === display)?.[0] ?? null;
}

/** URL-backed filter/sort/page state; every value is valid by construction (§11.1). */
function usePartsUrlState() {
  const { get, setMany, clear } = useFilterParams();
  const sortRaw = get("sort");
  return {
    setMany,
    clear,
    search: get("search"),
    categoryId: asUuid(get("category_id")),
    oemId: asUuid(get("oem_id")),
    condition: resolveEnumParam<PartsCondition>(get("condition"), PARTS_CONDITIONS, ""),
    page: Math.max(1, Number(get("page", "1")) || 1),
    sortRaw,
    sortColumn: sortRaw.replace(/^-/, ""),
    sortDirection: (sortRaw === "" ? null : sortRaw.startsWith("-") ? "desc" : "asc") as SortDirection,
  };
}

/** State + data owner for the Parts listing (flat, row-paginated parts + variants). */
export function usePartsListView() {
  // Browser reload drops every URL param; SPA back-nav keeps them.
  useClearFiltersOnReload();
  const url = usePartsUrlState();
  const { setMany, categoryId, oemId, condition } = url;
  const [pageSize, setPageSize] = usePageSizeParam({ defaultSize: IMS_PAGE_SIZE });
  // AsyncSelect renders its chip from the picked option; the URL holds only the id.
  const [oemOption, setOemOption] = useState<AsyncSelectOption | null>(null);

  const { searchParam, externalFiltersActive } = useListSearchFilters({
    search: url.search,
    maxLength: IMS_SEARCH_MAX_LEN,
    filterFlags: [!!categoryId, !!oemId, condition !== ""],
  });
  const partsQuery = usePartsFlatPage({
    page: url.page,
    page_size: pageSize,
    search: searchParam,
    category_id: categoryId ?? undefined,
    oem_id: oemId ?? undefined,
    condition: condition === "" ? undefined : condition,
    sort: resolveSortParam(url.sortRaw, PARTS_SORT_FIELD_MAP),
  });
  const flatRows = partsQuery.data?.items ?? [];

  // BMT filter state is id-keyed for category/brand, display-keyed for condition.
  const tableFilters: Record<string, string> = {};
  if (categoryId) tableFilters.category = categoryId;
  if (oemId) tableFilters.brand = oemId;
  if (condition) tableFilters.condition = CONDITION_DISPLAY[condition] ?? condition;

  const onFiltersChange = (next: Record<string, string>) => {
    if (!next.brand) setOemOption(null);
    setMany({
      category_id: next.category || null,
      oem_id: next.brand || null,
      condition: conditionFromDisplay(next.condition),
      page: null,
    });
  };

  const onSortChange = (col: string | null, dir: SortDirection) => {
    // BMT cycles asc → desc → off.
    setMany({ sort: col && dir ? `${dir === "desc" ? "-" : ""}${col}` : null, page: null });
  };

  return {
    partsQuery,
    rows: flatRows.map(toPartRow),
    total: partsQuery.data?.total ?? 0,
    // The backend OMITS `price` for callers without ims:price_read (§ Stock Items parity).
    showPrice: flatRows.some((row) => row.price !== undefined),
    page: url.page,
    pageSize,
    setPageSize,
    setPage: (n: number) => setMany({ page: n > 1 ? String(n) : null }),
    setSearch: (q: string) => setMany({ search: q || null, page: null }),
    sort: { column: url.sortDirection ? url.sortColumn : null, direction: url.sortDirection },
    onSortChange,
    tableFilters,
    onFiltersChange,
    clearFilters: url.clear,
    externalFiltersActive,
    oemOption,
    setOemOption,
    // Export the same filters the list is querying with (spec E1).
    exportFilters: {
      category_id: categoryId,
      oem_id: oemId,
      condition: condition || null,
      search: searchParam ?? null,
    },
  };
}
