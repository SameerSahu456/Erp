/** Shared server-driven controller (§16.7) for the Inspection / Repair / QC queues;
 *  each queue supplies its tabs, per-tab params and sort map. */
import { useMemo, useState } from "react";

import { type DateRange } from "@/components/common/pickers/DateRangePicker";
import { UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";
import { useTabbedListView } from "@/shared/hooks/useTabbedListView";
import { dateRangeToParams } from "@shared/lib/date";
import { toSortParam } from "@shared/lib/sort-param";

import { type DeviceListParams, type DeviceSummary } from "../../api";
import { WMS_PAGE_SIZE } from "../../constants";
import { useWarehouseScope } from "../../context/warehouse-scope";
import { useAssignPoolsByWarehouse } from "../devices/useAssignPools";
import {
  emptyDeviceQueueFilters,
  useDeviceQueueControls,
  type DeviceQueueFilters,
} from "../devices/useDeviceQueueControls";
import { useDevices, useDeviceStats } from "../devices/useDevices";
import { useEngineerScope, useWmsStageAccess } from "./useStageAccess";

export type QueueStage = "inspection" | "repair" | "qc";
export type StageQueueFilters = DeviceQueueFilters & { dateRange: DateRange | undefined };

const emptyStageQueueFilters = (): StageQueueFilters => ({
  ...emptyDeviceQueueFilters(),
  dateRange: undefined,
});

/** The stage's assignee, denormalized on the device row. */
const ASSIGNEE_OF: Record<QueueStage, (d: DeviceSummary) => { id: string | null; name: string | null }> = {
  inspection: (d) => ({ id: d.inspection_assignee_id ?? null, name: d.inspection_assignee_name ?? null }),
  repair: (d) => ({ id: d.repair_assignee_id ?? null, name: d.repair_assignee_name ?? null }),
  qc: (d) => ({ id: d.qc_assignee_id ?? null, name: d.qc_assignee_name ?? null }),
};

interface StageQueueConfig<TabId extends string> {
  stage: QueueStage;
  /** Stable view-store key, e.g. `"wms-repair"`. */
  storageKey: string;
  tabIds: readonly TabId[];
  defaultTab: TabId;
  /** The device-list params that back each tab. */
  paramsFor: (tab: TabId) => DeviceListParams;
  /** Table column → backend `sort` field. */
  sortFieldMap: Record<string, string>;
}

export function useStageQueue<TabId extends string>(config: StageQueueConfig<TabId>) {
  const { stage, storageKey, tabIds, defaultTab, paramsFor, sortFieldMap } = config;

  // Per-tab view in an in-memory store; resets on refresh or leaving the section.
  const lv = useTabbedListView<StageQueueFilters, TabId>({
    storageKey,
    tabIds,
    defaultTab,
    emptyFilters: emptyStageQueueFilters,
    pageSize: WMS_PAGE_SIZE,
  });
  const tab = lv.activeTab;
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view;
  const dateRange = lv.view.filters.dateRange;
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS);
  const { date_from, date_to } = dateRangeToParams(dateRange);
  const sortParam = toSortParam(sortColumn, sortDirection, sortFieldMap);

  // Server-side Category / Batch / Engineer filters — driven by the active
  // tab's filter slice so each tab filters independently.
  const controls = useDeviceQueueControls({
    engineerColumnKey: "assignedTo",
    value: lv.view.filters,
    onChange: (patch) => lv.setFilters(patch),
  });

  // An engineer sees only the devices allocated to them; managers/admin see all.
  const scope = useEngineerScope(stage);
  // Scope every query to the navbar-selected warehouses; reset pages when the
  // SET changes (render-time state adjustment, not an effect).
  const { selectedWarehouseIds } = useWarehouseScope();
  const whKey = selectedWarehouseIds.join(",");
  const [lastWh, setLastWh] = useState(whKey);
  if (whKey !== lastWh) {
    setLastWh(whKey);
    lv.resetAllViews();
  }

  // One grouped stats call for all badges. Search is per tab, so it is not sent here.
  const statsQuery = useDeviceStats({
    warehouse_ids: selectedWarehouseIds,
    from_date: date_from,
    to_date: date_to,
    ...controls.params,
    completed_op_type: stage,
    ...scope,
  });

  const devicesQuery = useDevices({
    ...paramsFor(tab),
    warehouse_ids: selectedWarehouseIds,
    search: debouncedSearch || undefined,
    from_date: date_from,
    to_date: date_to,
    sort: sortParam,
    ...controls.params,
    page,
    page_size: pageSize,
    ...scope,
  });
  const items = useMemo(() => devicesQuery.data?.items ?? [], [devicesQuery.data]);
  const total = devicesQuery.data?.total ?? 0;

  const access = useWmsStageAccess();
  // Assign pools only for warehouses on the visible page; whole-scope fan-out was too many requests.
  const poolWarehouseIds = useMemo(
    () => Array.from(new Set(items.map((d) => d.warehouse_id).filter((id): id is string => !!id))),
    [items],
  );
  const poolsByWarehouse = useAssignPoolsByWarehouse(poolWarehouseIds, stage, {
    enabled: access.isManager,
  });

  // Prefer the engineer name on visible rows; GET /users/{id} 403s for some roles.
  const assigneeFilter = lv.view.filters.assignee_id;
  const engineerNameHint = useMemo(() => {
    if (!assigneeFilter) return undefined;
    const match = items.find((d) => ASSIGNEE_OF[stage](d).id === assigneeFilter);
    return match ? (ASSIGNEE_OF[stage](match).name ?? undefined) : undefined;
  }, [assigneeFilter, items, stage]);

  /** Active tab reflects its own search via the list `total`; inactive tabs use
   *  the (non-search) stats so they don't move with the active tab's search. */
  const tabCount = (id: TabId, statsTotal: number) =>
    id === tab && !devicesQuery.isPlaceholderData ? total : statsTotal;

  /** Narrow a table tab id back to this queue's tab ids (no cast). */
  const setActiveTab = (id: string) => {
    const next = tabIds.find((t) => t === id);
    if (next) lv.setActiveTab(next);
  };

  /** Everything the shared queue table binds to — non-generic, so one
   *  `<StageQueueTable>` serves every queue. */
  const activeTab: string = tab;
  const view = {
    activeTab,
    setActiveTab,
    search,
    setSearch: (q: string) => lv.setSearch(q),
    dateRange,
    setDateRange: (r: DateRange | undefined) => lv.setFilters({ dateRange: r }),
    clearFilters: () => lv.clearFilters(),
    controls,
    selectedWarehouseIds,
    engineerNameHint,
    page,
    pageSize,
    total,
    isFetching: devicesQuery.isFetching,
    setPage: lv.setPage,
    setPageSize: (size: number) => lv.setPageSize(size),
    sortColumn,
    sortDirection,
    setSort: lv.setSort,
    isError: devicesQuery.isError,
    refetch: () => void devicesQuery.refetch(),
  };

  return {
    tab,
    view,
    stats: statsQuery.data,
    items,
    access,
    poolsByWarehouse,
    tabCount,
  };
}

export type StageQueueView = ReturnType<typeof useStageQueue>["view"];

/** Row fields every stage queue carries for its assign + actions cells. */
export function stageAssignee(stage: QueueStage, d: DeviceSummary) {
  return ASSIGNEE_OF[stage](d);
}
