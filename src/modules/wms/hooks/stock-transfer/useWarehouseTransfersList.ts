import { useMemo, useState } from "react";

import { UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";
import { useTabCounts } from "@/shared/hooks/useTabCounts";
import {
  useTabbedListView,
  type ListView,
} from "@/shared/hooks/useTabbedListView";
import { dateRangeToParams } from "@shared/lib/date";
import { toSortParam } from "@shared/lib/sort-param";

import { useWarehouseScope } from "../../context/warehouse-scope";
import { WMS_PAGE_SIZE } from "../../constants";
import { wmsKeys } from "../keys";
import {
  useWarehouseTransfers,
  fetchWarehouseTransfers,
  type WarehouseTransfersParams,
} from "./useStockTransfer";
import {
  TRANSFER_SORT_FIELD_MAP,
  TRANSFER_TAB_FILTER,
  TRANSFER_TAB_IDS,
  emptyTransferFilters,
  type TransferFilters,
  type TransferTabId,
} from "../../components/stock-transfer/warehouse-transfers.columns";
import { TRANSFERS_PAGE_STRINGS as S } from "../../components/stock-transfer/stock-transfer.strings";

const DASH = "—";

/** Warehouse Transfers listing owner (§17): server-paged/sorted/filtered (§16.7), navbar-scoped (§0.16). */
export function useWarehouseTransfersList() {
  const { selectedWarehouseIds } = useWarehouseScope();
  const lv = useTabbedListView<TransferFilters, TransferTabId>({
    storageKey: "wms-warehouse-transfers",
    tabIds: TRANSFER_TAB_IDS,
    defaultTab: "all",
    emptyFilters: emptyTransferFilters,
    pageSize: WMS_PAGE_SIZE,
  });

  // Navbar warehouse switch resets every tab's view (§1.1.K / §0.16).
  const whKey = selectedWarehouseIds.join(",");
  const [lastWh, setLastWh] = useState(whKey);
  if (whKey !== lastWh) {
    setLastWh(whKey);
    lv.resetAllViews();
  }

  const debouncedSearch = useDebounce(
    lv.view.search.trim(),
    UI.DEBOUNCE_SEARCH_MS,
  );
  // Only mapped columns sort server-side; an unmapped key never reaches the
  // API (§11.1 — it would 422).
  const sortParam = toSortParam(
    lv.view.sortColumn,
    lv.view.sortDirection,
    TRANSFER_SORT_FIELD_MAP,
  );

  // One place that turns a tab's stored view into API params, so the list
  // query and the per-tab count queries always filter identically (§1.1.H).
  const paramsFor = (
    view: ListView<TransferFilters>,
    tabId: TransferTabId,
    search: string,
  ): WarehouseTransfersParams => {
    const sent = dateRangeToParams(view.filters.sentRange);
    const expected = dateRangeToParams(view.filters.expectedRange);
    return {
      ...TRANSFER_TAB_FILTER[tabId],
      warehouseIds: selectedWarehouseIds,
      dispatched_from: sent.date_from,
      dispatched_to: sent.date_to,
      expected_from: expected.date_from,
      expected_to: expected.date_to,
      q: search.trim() || undefined,
    };
  };

  const query = useWarehouseTransfers({
    ...paramsFor(lv.view, lv.activeTab, debouncedSearch),
    sort: sortParam,
    page: lv.view.page,
    page_size: lv.view.pageSize,
  });
  const listTotal = query.data?.total ?? 0;

  // §1.1.H: active tab reuses the list total; inactive tabs count from their own filters.
  const countFor = useTabCounts({
    tabIds: TRANSFER_TAB_IDS,
    activeTab: lv.activeTab,
    activeTotal: query.isPlaceholderData ? 0 : listTotal,
    paramsFor: (tabId: TransferTabId): WarehouseTransfersParams => {
      const view = lv.viewByTab[tabId] ?? lv.view;
      const search = tabId === lv.activeTab ? debouncedSearch : view.search;
      return { ...paramsFor(view, tabId, search), page_size: 1 };
    },
    queryKey: wmsKeys.transfers.count,
    fetchCount: fetchWarehouseTransfers,
  });

  const rows = useMemo(
    () =>
      (query.data?.items ?? []).map((t) => ({
        id: t.id,
        number: t.transfer_number,
        route: `${t.from_warehouse_name ?? DASH} → ${t.to_warehouse_name ?? DASH}`,
        status: t.status,
        isOverdue: t.is_overdue,
        units:
          t.outstanding_count > 0
            ? S.outstanding(t.outstanding_count)
            : String(t.item_count),
        dispatched: t.dispatched_at,
        expected: t.expected_delivery_date,
      })),
    [query.data],
  );

  // KPI totals are scoped to warehouses only — independent of search, dates and tab.
  const scope = { warehouseIds: selectedWarehouseIds, page_size: 1 } as const;
  const kpiAll = useWarehouseTransfers(scope);
  const kpiInTransit = useWarehouseTransfers({
    ...scope,
    status: "in_transit",
  });
  const kpiOverdue = useWarehouseTransfers({ ...scope, overdue: true });
  const kpiReceived = useWarehouseTransfers({ ...scope, status: "received" });

  return {
    lv,
    query,
    listTotal,
    countFor,
    rows,
    kpiTotals: {
      all: kpiAll.data?.total ?? 0,
      inTransit: kpiInTransit.data?.total ?? 0,
      overdue: kpiOverdue.data?.total ?? 0,
      received: kpiReceived.data?.total ?? 0,
    },
  };
}
