import { useMemo, useState } from "react";

import { useDebounce } from "@/shared/hooks";
import { UI } from "@/shared/constants/ui";
import { useTabbedListView } from "@/shared/hooks/useTabbedListView";
import { useTabCounts } from "@shared/hooks/useTabCounts";
import { type DateRange } from "@/components/common/pickers/DateRangePicker";
import { formatIST_date, dateRangeToParams } from "@shared/lib/date";
import { toSortParam } from "@shared/lib/sort-param";

import { useWarehouseScope } from "../../context/warehouse-scope";
import { fetchDispatchRequests, type DispatchRequestListParams } from "../../api/dispatch";
import { WMS_PAGE_SIZE } from "../../constants";
import { DISPATCH_TYPE_API_LABELS } from "../../constants/dispatch-request";
import {
  DISPATCH_SEARCH_MAX,
  DISPATCH_SORT_FIELD_MAP,
  DISPATCH_STATUS_TAB_IDS,
  dispatchStatusForTab,
  type DispatchStatusTabId,
} from "../../components/dispatches/dispatches-list.columns";
import { wmsKeys } from "../keys";
import { useDispatchRequestsList } from "./useDispatchRequests";

const DASH = "—";

interface DispatchFilters {
  dispatch_type: string;
  dateRange: DateRange | undefined;
}

const capSearch = (s: string | undefined) => (s ?? "").trim().slice(0, DISPATCH_SEARCH_MAX);

/** State + data owner for the Dispatches listing (§17); `DispatchListBody` only renders. */
export function useDispatchList() {
  // Per-tab view (search / type filter / sort / page / page size), in an
  // in-memory store: survives list ↔ detail nav, resets on refresh.
  const lv = useTabbedListView<DispatchFilters, DispatchStatusTabId>({
    storageKey: "wms-dispatches",
    tabIds: DISPATCH_STATUS_TAB_IDS,
    defaultTab: "all",
    emptyFilters: () => ({ dispatch_type: "", dateRange: undefined }),
    pageSize: WMS_PAGE_SIZE,
  });
  const activeTab = lv.activeTab;
  const { search, sortColumn, sortDirection, page, pageSize, filters } = lv.view;
  const { date_from, date_to } = dateRangeToParams(filters.dateRange);

  // Warehouse scope comes from the global navbar picker (empty = all
  // warehouses). Reset pages when the scope changes.
  const { selectedWarehouseIds } = useWarehouseScope();
  const whKey = selectedWarehouseIds.join(",");
  const [lastWh, setLastWh] = useState(whKey);
  if (whKey !== lastWh) {
    setLastWh(whKey);
    lv.resetAllViews();
  }

  const debouncedSearch = useDebounce(capSearch(search), UI.DEBOUNCE_SEARCH_MS);

  const listQuery = useDispatchRequestsList({
    status: dispatchStatusForTab(activeTab),
    dispatch_type: filters.dispatch_type || undefined,
    from_warehouse_ids: selectedWarehouseIds,
    q: debouncedSearch || undefined,
    // Unmapped / unsorted columns fall back to the endpoint default.
    sort: toSortParam(sortColumn, sortDirection, DISPATCH_SORT_FIELD_MAP),
    date_from,
    date_to,
    page,
    page_size: pageSize,
  });
  const total = listQuery.data?.total ?? 0;

  // Filter-aware tab counts: the active tab reuses the list `total`; each
  // inactive tab runs a slim page_size:1 count with THAT tab's own filters.
  const countFor = useTabCounts({
    tabIds: DISPATCH_STATUS_TAB_IDS,
    activeTab,
    activeTotal: total,
    paramsFor: (id: DispatchStatusTabId): DispatchRequestListParams => {
      const v = lv.viewByTab[id];
      const range = dateRangeToParams(v?.filters.dateRange);
      return {
        status: dispatchStatusForTab(id),
        dispatch_type: v?.filters.dispatch_type || undefined,
        from_warehouse_ids: selectedWarehouseIds,
        q: (id === activeTab ? debouncedSearch : capSearch(v?.search)) || undefined,
        date_from: range.date_from,
        date_to: range.date_to,
        page: 1,
        page_size: 1,
      };
    },
    queryKey: wmsKeys.dispatches.count,
    fetchCount: fetchDispatchRequests,
  });

  // The outbound warehouse + account names ride on the list row — no
  // separate fetch + client-side id→name map.
  const tableRows = useMemo(
    () =>
      (listQuery.data?.items ?? []).map((d) => ({
        id: d.id,
        dispatchNumber: d.dispatch_number,
        dispatchType: DISPATCH_TYPE_API_LABELS[d.dispatch_type] ?? d.dispatch_type,
        account: d.account_name ?? DASH,
        status: d.status,
        warehouse: d.from_warehouse_name ?? DASH,
        dispatched: d.dispatched_at ? formatIST_date(d.dispatched_at) : DASH,
        rentalOrderNumber: d.rental_order_number ?? null,
      })),
    [listQuery.data],
  );

  return { lv, activeTab, selectedWarehouseIds, listQuery, total, countFor, tableRows };
}
