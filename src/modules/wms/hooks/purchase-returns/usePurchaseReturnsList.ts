import { useMemo, useState } from "react";
import { CircleCheck, CirclePlus, CircleX, Truck, Undo2 } from "lucide-react";

import type { TabConfig } from "@/components/common/tables/BusinessMetricsTable";
import type { StatCardData } from "@/components/common/display/StatsRow";
import { dateRangeToParams } from "@shared/lib/date";
import { PAGINATION, UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";
import { useTabbedListView } from "@/shared/hooks/useTabbedListView";
import { usePermission } from "@shared/rbac";
import { procurementCan } from "@modules/procurement";

import { useWarehouseScope } from "../../context/warehouse-scope";
import {
  usePurchaseReturns,
  usePurchaseReturnStats,
  usePurchaseReturnTabCounts,
} from "./usePurchaseReturns";
import { usePurchaseReturnFacetOptions } from "./usePurchaseReturnFacetOptions";
import {
  PURCHASE_RETURNS_LIST_STRINGS as S,
  PURCHASE_RETURN_STATUS_LABELS,
} from "../../components/purchase-returns/purchase-returns.strings";
import {
  PURCHASE_RETURN_LIST_COLUMNS as COLUMNS,
  PURCHASE_RETURN_SORT_FIELD_MAP as SORT_FIELD_MAP,
  PURCHASE_RETURN_STATUS_TABS as STATUS_TABS,
  type PurchaseReturnListFilters as PrFilters,
  type PurchaseReturnTabId as TabId,
} from "../../components/purchase-returns/purchase-returns-list.columns";

/** List-view state + server queries for the purchase-returns list. */
export function usePurchaseReturnsList() {
  // A read-only viewer (returnView but not returnWrite) shouldn't see a "New"
  // button that only leads to a 403 on the write-gated create route.
  const canWrite = usePermission().can(procurementCan.returnWrite);
  const { selectedWarehouseIds } = useWarehouseScope();
  const whKey = selectedWarehouseIds.join(",");
  const warehouseIds = selectedWarehouseIds.length ? selectedWarehouseIds : undefined;

  // Per-tab view state, kept across list ↔ detail, reset on refresh (§1.1).
  const lv = useTabbedListView<PrFilters, TabId>({
    storageKey: "wms-purchase-returns",
    tabIds: STATUS_TABS,
    defaultTab: "all",
    emptyFilters: () => ({ dateRange: undefined, poId: undefined, vendorId: undefined }),
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  });
  const activeTab = lv.activeTab;
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view;
  const { dateRange, poId, vendorId } = lv.view.filters;

  const { date_from, date_to } = dateRangeToParams(dateRange);

  // Server-side free-text search (return / PO / vendor). An empty term bypasses
  // the debounce so clearing the box refreshes immediately instead of lagging.
  const trimmedSearch = search.trim();
  const debouncedSearch = useDebounce(trimmedSearch, UI.DEBOUNCE_SEARCH_MS);
  const effectiveSearch = trimmedSearch ? debouncedSearch : "";

  // Reset when the navbar warehouse scope changes (render-phase, not an effect).
  const [prevWhKey, setPrevWhKey] = useState(whKey);
  if (prevWhKey !== whKey) {
    setPrevWhKey(whKey);
    // New warehouse = new dataset: reset every tab's view.
    lv.resetAllViews();
  }

  const sort_by =
    sortColumn && SORT_FIELD_MAP[sortColumn] ? SORT_FIELD_MAP[sortColumn] : undefined;
  const sort_dir = sort_by ? (sortDirection ?? "desc") : undefined;

  const query = usePurchaseReturns({
    page,
    page_size: pageSize,
    warehouse_ids: warehouseIds,
    status: activeTab === "all" ? undefined : activeTab,
    purchase_order_id: poId,
    vendor_id: vendorId,
    search: effectiveSearch || undefined,
    sort_by,
    sort_dir,
    date_from,
    date_to,
  });
  // Unfiltered stats for KPIs and filterless tab badges; filtered tabs count below (§1.1.H).
  const baseStats = usePurchaseReturnStats({ warehouse_ids: warehouseIds }).data;
  const filteredCountEntries = useMemo(
    () =>
      STATUS_TABS.filter((id) => id !== activeTab)
        .map((id) => ({ id, v: lv.viewByTab[id] }))
        .filter(
          ({ v }) =>
            v &&
            Boolean(
              v.search.trim() || v.filters.poId || v.filters.vendorId || v.filters.dateRange,
            ),
        )
        .map(({ id, v }) => {
          const { date_from: df, date_to: dt } = dateRangeToParams(v.filters.dateRange);
          return {
            id,
            params: {
              page: 1,
              page_size: 1,
              warehouse_ids: warehouseIds,
              status: id === "all" ? undefined : id,
              purchase_order_id: v.filters.poId,
              vendor_id: v.filters.vendorId,
              search: v.search.trim() || undefined,
              date_from: df,
              date_to: dt,
            },
          };
        }),
    [activeTab, lv.viewByTab, warehouseIds],
  );
  const filteredTabCounts = usePurchaseReturnTabCounts(filteredCountEntries);

  const { usePoOptions, useVendorFilterOptions, poValue, vendorValue } =
    usePurchaseReturnFacetOptions(selectedWarehouseIds, poId, vendorId);

  const total = query.data?.total ?? 0;
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  const rows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        // Show an em-dash when the label is missing — never leak the raw UUID.
        purchase_order_label: item.po_number ?? "—",
        vendor_label: item.vendor_name ?? "—",
        units: item.items.length,
        awaiting: item.undecided_count,
      })),
    [items],
  );

  // KPI cards use unfiltered stats so filters never move them.
  const kpis: StatCardData[] = useMemo(() => {
    const raised = baseStats?.raised ?? 0;
    const dispatched = baseStats?.dispatched ?? 0;
    const closed = baseStats?.closed ?? 0;
    const cancelled = baseStats?.cancelled ?? 0;
    return [
      { label: S.kpis.all, value: raised + dispatched + closed + cancelled, icon: Undo2, accent: "primary" },
      { label: S.kpis.raised, value: raised, icon: CirclePlus, accent: "warning" },
      { label: S.kpis.dispatched, value: dispatched, icon: Truck, accent: "info" },
      { label: S.kpis.closed, value: closed, icon: CircleCheck, accent: "success" },
      // Cancelled has no dedicated "neutral" accent — left unaccented (muted).
      { label: S.kpis.cancelled, value: cancelled, icon: CircleX },
    ];
  }, [baseStats]);

  // Unfiltered per-status count — the badge for an inactive tab that carries no
  // filters of its own.
  const baseTabCount = (id: TabId): number | undefined => {
    if (!baseStats) return undefined;
    if (id === "all")
      return baseStats.raised + baseStats.dispatched + baseStats.closed + baseStats.cancelled;
    // The stats endpoint has no `partially_dispatched` bucket, so that tab
    // shows no badge rather than a wrong one.
    return (baseStats as Record<string, number | string>)[id] as number | undefined ?? 0;
  };
  // §1.1.H: a filter on one tab never moves another tab's badge.
  const tabCount = (id: TabId): number =>
    id === activeTab ? total : (filteredTabCounts[id] ?? baseTabCount(id) ?? 0);

  // Server-paged: only the ACTIVE tab carries the fetched page; the others render
  // empty until selected. Every tab's badge comes from the stats endpoint.
  const tabs: TabConfig[] = useMemo(
    () =>
      STATUS_TABS.map((id) => ({
        id,
        label: id === "all" ? S.tabs.all : PURCHASE_RETURN_STATUS_LABELS[id],
        columns: COLUMNS,
        data: id === activeTab ? rows : [],
        count: tabCount(id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, activeTab, total, filteredTabCounts, baseStats],
  );

  return {
    canWrite,
    lv,
    activeTab,
    search,
    sortColumn,
    sortDirection,
    page,
    pageSize,
    dateRange,
    poId,
    vendorId,
    query,
    total,
    items,
    kpis,
    tabs,
    poValue,
    vendorValue,
    usePoOptions,
    useVendorFilterOptions,
  };
}
