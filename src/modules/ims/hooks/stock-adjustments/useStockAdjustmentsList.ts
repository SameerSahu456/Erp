import { useQueryClient } from "@tanstack/react-query";

import { UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";
import { useTabCounts } from "@/shared/hooks/useTabCounts";
import { useTabbedListView, type ListView } from "@/shared/hooks/useTabbedListView";

import { IMS_PAGE_SIZE } from "../../constants";
import { ADJUSTMENT_TAB_IDS, type AdjustmentTabId } from "../../lib/stock-adjustment-labels";
import {
  fetchStockAdjustmentCount,
  type StockAdjustmentReason,
  type StockAdjustmentsParams,
} from "../../stock-adjustments.api";
import { imsKeys } from "../keys";
import { useStockAdjustmentsPage } from "./useStockAdjustments";

export interface AdjustmentFilters {
  warehouseId: string;
  /** Picked warehouse's name, kept so the chip never shows a raw id. */
  warehouseName: string;
  reason: StockAdjustmentReason | "";
  pendingMine: boolean;
}

const emptyFilters = (): AdjustmentFilters => ({
  warehouseId: "",
  warehouseName: "",
  reason: "",
  pendingMine: false,
});

const K = imsKeys.stockAdjustments;

// One place turns a tab's view into API params, so list + counts agree.
const paramsFor = (
  view: ListView<AdjustmentFilters>,
  tabId: AdjustmentTabId,
  search: string,
): StockAdjustmentsParams => ({
  status: tabId === "all" ? undefined : tabId,
  warehouse_id: view.filters.warehouseId || undefined,
  reason: view.filters.reason || undefined,
  pending_my_approval: view.filters.pendingMine || undefined,
  search: search || undefined,
});

/** Stock adjustments listing owner: server-paged, tab + filter aware (§16.7). */
export function useStockAdjustmentsList() {
  const qc = useQueryClient();
  const lv = useTabbedListView<AdjustmentFilters, AdjustmentTabId>({
    storageKey: "ims-stock-adjustments",
    tabIds: ADJUSTMENT_TAB_IDS,
    defaultTab: "all",
    emptyFilters,
    pageSize: IMS_PAGE_SIZE,
  });
  const debouncedSearch = useDebounce(lv.view.search.trim(), UI.DEBOUNCE_SEARCH_MS);
  const activeParams = paramsFor(lv.view, lv.activeTab, debouncedSearch);

  const query = useStockAdjustmentsPage({
    ...activeParams,
    page: lv.view.page,
    page_size: lv.view.pageSize,
  });
  const listTotal = query.data?.total ?? 0;
  // While the list shows placeholder rows, the pill keeps this tab's last known count.
  const cachedTotal = qc.getQueryData<{ total?: number }>(K.count(activeParams))?.total ?? 0;

  const countFor = useTabCounts({
    tabIds: ADJUSTMENT_TAB_IDS,
    activeTab: lv.activeTab,
    activeTotal: query.isPlaceholderData ? cachedTotal : listTotal,
    paramsFor: (tabId: AdjustmentTabId) => {
      const view = lv.viewByTab[tabId] ?? lv.view;
      const search = tabId === lv.activeTab ? debouncedSearch : view.search.trim();
      return paramsFor(view, tabId, search);
    },
    queryKey: K.count,
    fetchCount: fetchStockAdjustmentCount,
  });

  return { lv, query, listTotal, countFor, rows: query.data?.items ?? [] };
}
