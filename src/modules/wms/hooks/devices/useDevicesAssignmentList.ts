/** Controller behind `DevicesAssignmentBody`: per-tab list view, server filters, stats and assign pools. */
import { useMemo, useState } from "react";

import { UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";
import { useTabbedListView } from "@/shared/hooks/useTabbedListView";
import { dateRangeToParams } from "@shared/lib/date";
import { toSortParam } from "@shared/lib/sort-param";

import {
  DEVICE_TAB_DEVICE_STATUSES,
  DEVICE_TAB_STATUSES,
  DEVICE_TAB_IDS,
  SORT_FIELD_MAP,
  type DeviceFilters,
  type DeviceTabId,
} from "../../components/devices/devices-assignment-helpers";
import { DEVICE_SEARCH_MAX_CHARS, WMS_PAGE_SIZE } from "../../constants";
import { useWarehouseScope } from "../../context/warehouse-scope";
import { useWmsStageAccess } from "../operations/useStageAccess";
import { useAssignPoolsByWarehouse } from "./useAssignPools";
import { emptyDeviceQueueFilters, useDeviceQueueControls } from "./useDeviceQueueControls";
import { useDevices, useDeviceStats } from "./useDevices";

const emptyDeviceFilters = (): DeviceFilters => ({ ...emptyDeviceQueueFilters(), dateRange: undefined });

export function useDevicesAssignmentList() {
  // Per-tab list view, kept in an in-memory store: survives list ↔ detail nav,
  // resets on refresh or on leaving the Devices section.
  const lv = useTabbedListView<DeviceFilters, DeviceTabId>({
    storageKey: "wms-devices",
    tabIds: DEVICE_TAB_IDS,
    defaultTab: "all",
    emptyFilters: emptyDeviceFilters,
    pageSize: WMS_PAGE_SIZE,
  });
  const tab = lv.activeTab;
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view;
  const dateRange = lv.view.filters.dateRange;
  // Cap to the backend search limit so a long paste never 422s the list (§11.1).
  const debouncedSearch = useDebounce(search.trim().slice(0, DEVICE_SEARCH_MAX_CHARS), UI.DEBOUNCE_SEARCH_MS);
  const { date_from, date_to } = dateRangeToParams(dateRange);

  // Only managers + superusers may assign; `isManager` also gates the roster
  // fetch — a plain engineer never opens a picker, so never pays for the pools.
  const { canAssign, isManager } = useWmsStageAccess();

  const controls = useDeviceQueueControls({
    engineerColumnKey: "inspectionEngineer",
    value: lv.view.filters,
    onChange: (patch) => lv.setFilters(patch),
  });

  // Scope every query to the navbar-selected warehouses; reset pages on change.
  const { selectedWarehouseIds } = useWarehouseScope();
  const whKey = selectedWarehouseIds.join(",");
  const [lastWh, setLastWh] = useState(whKey);
  if (whKey !== lastWh) {
    setLastWh(whKey);
    lv.resetAllViews();
  }

  // Scrap tab filters `stock_items.status` (scrapped devices have no stage, D1); the tab pin wins.
  const workflowStatuses = DEVICE_TAB_STATUSES[tab];
  const deviceStatuses = DEVICE_TAB_DEVICE_STATUSES[tab];
  const devicesQuery = useDevices({
    workflow_status: workflowStatuses.length ? [...workflowStatuses] : undefined,
    warehouse_ids: selectedWarehouseIds,
    search: debouncedSearch || undefined,
    from_date: date_from,
    to_date: date_to,
    sort: toSortParam(sortColumn, sortDirection, SORT_FIELD_MAP),
    ...controls.params,
    ...(deviceStatuses.length ? { device_status: [...deviceStatuses] } : {}),
    page,
    page_size: pageSize,
  });
  // All badges from one /devices/stats call without search (search is per tab).
  const statsQuery = useDeviceStats({
    warehouse_ids: selectedWarehouseIds,
    from_date: date_from,
    to_date: date_to,
    ...controls.params,
  });
  const items = useMemo(() => devicesQuery.data?.items ?? [], [devicesQuery.data]);
  const total = devicesQuery.data?.total ?? 0;

  // Bucket counts: stage tabs sum `by_workflow_status`; Scrap sums
  // `by_device_status` (a condemned device lands in no workflow bucket).
  const stats = statsQuery.data;
  const sum = (bucket: Record<string, number> | undefined, keys: readonly string[]) =>
    keys.reduce((n, k) => n + (bucket?.[k] ?? 0), 0);
  const statsCount: Record<DeviceTabId, number> = {
    all: stats?.total ?? 0,
    inspection: sum(stats?.by_workflow_status, DEVICE_TAB_STATUSES.inspection),
    repair: sum(stats?.by_workflow_status, DEVICE_TAB_STATUSES.repair),
    qc: sum(stats?.by_workflow_status, DEVICE_TAB_STATUSES.qc),
    scrap: sum(stats?.by_device_status, DEVICE_TAB_DEVICE_STATUSES.scrap),
  };
  // Use the list total only when fresh; during a tab switch it still holds the old tab's data.
  const tabCount = (id: DeviceTabId) =>
    id === tab && !devicesQuery.isPlaceholderData ? total : statsCount[id];

  // Assign pools only for warehouses on the visible page, not the whole scope.
  const poolWarehouseIds = useMemo(
    () => Array.from(new Set(items.map((d) => d.warehouse_id).filter((id): id is string => !!id))),
    [items],
  );
  const pools = {
    inspection: useAssignPoolsByWarehouse(poolWarehouseIds, "inspection", { enabled: isManager }),
    repair: useAssignPoolsByWarehouse(poolWarehouseIds, "repair", { enabled: isManager }),
    qc: useAssignPoolsByWarehouse(poolWarehouseIds, "qc", { enabled: isManager }),
  };

  const setActiveTab = (id: string) => {
    const next = DEVICE_TAB_IDS.find((t) => t === id);
    if (!next) return;
    lv.setActiveTab(next);
    // Status is filterable on the All tab only and filters are shared across
    // tabs — drop a now-hidden Status pick so it can't override a tab's stage.
    if (next !== "all" && lv.view.filters.device_status) lv.setFilters({ device_status: "" });
  };

  return {
    lv,
    tab,
    setActiveTab,
    search,
    sortColumn,
    sortDirection,
    page,
    pageSize,
    dateRange,
    controls,
    selectedWarehouseIds,
    devicesQuery,
    items,
    total,
    tabCount,
    canAssign,
    pools,
  };
}
