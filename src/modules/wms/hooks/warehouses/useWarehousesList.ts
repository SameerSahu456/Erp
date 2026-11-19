import { useMemo, useState } from "react";

import { useDebounce } from "@/shared/hooks";
import { UI } from "@/shared/constants/ui";
import { useTabbedListView } from "@/shared/hooks/useTabbedListView";
import { useTabCounts } from "@shared/hooks/useTabCounts";
import { toSortParam } from "@shared/lib/sort-param";
import { usePermission } from "@shared/rbac";

import { fetchWarehousesPage, type WarehouseListParams } from "../../api";
import { wmsPermissions } from "../../permissions";
import { WMS_PAGE_SIZE } from "../../constants";
import { wmsKeys } from "../keys";
import {
  WAREHOUSE_DEFAULT_SORT,
  WAREHOUSE_SORT_FIELD_MAP,
  WAREHOUSE_STATUS_TAB_IDS,
  isActiveForTab,
  warehouseColumns,
  type WarehouseStatusTabId,
} from "../../components/warehouses/warehouses-list.columns";
import { WAREHOUSES_BODY_STRINGS as S } from "../../components/warehouses/warehouses-body.strings";
import {
  useActivateWarehouse,
  useDeactivateWarehouse,
  useDeleteWarehouse,
  useWarehousesPaged,
} from "./useWarehouses";

/** State + data owner for the Warehouses listing (§17). */
export function useWarehousesList() {
  // Per-tab view (search + sort + pagination) in an in-memory store: survives
  // list ↔ detail nav, resets on refresh or on leaving the section.
  const lv = useTabbedListView<Record<string, never>, WarehouseStatusTabId>({
    storageKey: "wms-locations",
    tabIds: WAREHOUSE_STATUS_TAB_IDS,
    defaultTab: "active",
    emptyFilters: () => ({}),
    pageSize: WMS_PAGE_SIZE,
  });
  const activeTab = lv.activeTab;
  const { search, page, pageSize, sortColumn, sortDirection } = lv.view;
  const sort =
    toSortParam(sortColumn, sortDirection, WAREHOUSE_SORT_FIELD_MAP) ??
    WAREHOUSE_DEFAULT_SORT;
  // Backend `q` needs ≥1 char; an empty string is dropped.
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS);
  // Stock-condition filter — one toolbar filter across all status tabs.
  const [conditionFilter, setConditionFilter] = useState("");

  const activate = useActivateWarehouse();
  const deactivate = useDeactivateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // FE mirrors BE: create / edit / (de)activate / delete are gated on
  // wms:warehouse_manage — read-only roles browse but never see write controls.
  const canManage = usePermission().can(wmsPermissions.WAREHOUSE_MANAGE);
  const columns = useMemo(() => warehouseColumns(canManage), [canManage]);

  const warehousesQuery = useWarehousesPaged({
    q: debouncedSearch || undefined,
    is_active: isActiveForTab(activeTab),
    condition: conditionFilter || undefined,
    page,
    page_size: pageSize,
    sort,
  });
  const total = warehousesQuery.data?.total ?? 0;

  // Filter-aware tab counts: the active tab reuses the list `total`; each
  // inactive tab runs a slim count carrying THAT tab's is_active + search.
  const countFor = useTabCounts({
    tabIds: WAREHOUSE_STATUS_TAB_IDS,
    activeTab,
    activeTotal: total,
    paramsFor: (id: WarehouseStatusTabId): WarehouseListParams => ({
      q:
        (id === activeTab
          ? debouncedSearch
          : (lv.viewByTab[id]?.search ?? "").trim()) || undefined,
      is_active: isActiveForTab(id),
      condition: conditionFilter || undefined,
      page: 1,
      page_size: 1,
    }),
    queryKey: wmsKeys.warehouses.count,
    fetchCount: fetchWarehousesPage,
  });

  const rows = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        location: { city: w.city, state: w.state },
        conditions: w.conditions,
        status: w.is_active ? S.tabs.active : S.tabs.inactive,
        isActive: w.is_active,
        actions: w.id,
      })),
    [warehousesQuery.data],
  );

  return {
    lv,
    activeTab,
    canManage,
    columns,
    rows,
    total,
    countFor,
    warehousesQuery,
    conditionFilter,
    setCondition: (value: string) => {
      setConditionFilter(value);
      lv.resetAllPages();
    },
    clearFilters: () => {
      setConditionFilter("");
      lv.clearFilters();
    },
    togglePending: activate.isPending || deactivate.isPending,
    toggleActive: (id: string, active: boolean) =>
      active ? deactivate.mutate(id) : activate.mutate(id),
    deletePending: deleteWarehouse.isPending,
    deleteTarget,
    setDeleteTarget,
    confirmDelete: () => {
      if (deleteTarget) deleteWarehouse.mutate(deleteTarget.id);
      setDeleteTarget(null);
    },
  };
}
