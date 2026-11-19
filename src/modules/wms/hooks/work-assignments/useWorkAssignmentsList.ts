/** Controller behind `WorkAssignmentsBody`: server-paginated (§16.7) per-tab list view that survives list ↔ detail. */
import { useMemo, useState } from "react";

import { useDebounce } from "@/shared/hooks";
import { useTabbedListView } from "@/shared/hooks/useTabbedListView";
import { useTabCounts } from "@/shared/hooks/useTabCounts";
import { PAGINATION } from "@shared/constants/pagination";
import { UI } from "@shared/constants/ui";
import { toSortParam } from "@shared/lib/sort-param";

import {
  fetchWorkAssignments,
  type WorkAssignmentListParams,
} from "../../api/work-assignments";
import { useWarehouseScope } from "../../context/warehouse-scope";
import { wmsKeys } from "../keys";
import { useEngineersAcrossWarehousesOptions } from "../warehouses/useWarehouseTeam";
import { useWorkAssignmentEligibleSummary } from "./useWorkAssignmentEligibleSummary";
import {
  useCachedWaCount,
  useWorkAssignmentStages,
  useWorkAssignments,
} from "./useWorkAssignments";
import {
  engineerOption,
  totalOf,
  waListParams,
  type WaFilters,
} from "./work-assignments-list-helpers";

/** §16.6 — one page-size per page, derived from the global default. */
const WORK_ASSIGNMENT_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

/* Stage filter options are fetched from the server registry (U8), not hardcoded. */

/** The lifecycle statuses, in tab order. `all` carries no status filter. The
 *  Cancelled status is intentionally not a tab (business decision). */
const WA_STATUS_TABS = ["open", "closed"] as const;
/** `pending` is pre-assignment work from a different endpoint, so it sits beside `WA_STATUS_TABS`, not in it. */
export type WaTabId = "all" | "pending" | (typeof WA_STATUS_TABS)[number];
/** Tab order: all → pending → open → closed. */
export const WA_TAB_IDS: WaTabId[] = ["all", "pending", ...WA_STATUS_TABS];
/** Tabs counted from the work-assignment list; pending has its own source. */
const WA_COUNT_TAB_IDS: readonly WaTabId[] = ["all", ...WA_STATUS_TABS];

/** The pending tab lists devices waiting to be assigned to an INSPECTION
 *  engineer — the only stage that has a pre-assignment queue on this page. */
const WA_PENDING_STAGE = "inspection" as const;

/** The stages a WA can be issued for — engineers assignable to any of these can
 *  appear as the "Issued to" party, so the filter lists exactly them. */
const WA_ENGINEER_CAPABILITIES = ["inspection", "repair", "qc"] as const;

/** `sortFieldMap` maps a table column key → backend sort field; it is owned by
 *  the column config (`work-assignment.columns.ts`), so the caller passes it. */
export function useWorkAssignmentsList(sortFieldMap: Record<string, string>) {
  // Memoised: `?? []` hands back a fresh array each render, which would make
  // every dependent useMemo re-run.
  const stagesQuery = useWorkAssignmentStages();
  const stageOptions = useMemo(
    () => stagesQuery.data ?? [],
    [stagesQuery.data],
  );
  const stageValues = useMemo(
    () => stageOptions.map((o) => o.key),
    [stageOptions],
  );
  const stageLabel = (key: string) =>
    stageOptions.find((o) => o.key === key)?.label ?? key;

  // Per-tab view in the shared in-memory store: survives list ↔ detail, resets on refresh.
  const lv = useTabbedListView<WaFilters, WaTabId>({
    storageKey: "wms-work-assignments",
    tabIds: WA_TAB_IDS,
    // Lots auto-close when drained (U6), so closed ones would bury the open ones under 'all'.
    defaultTab: "open",
    emptyFilters: () => ({
      stage: "",
      issuedToUserId: "",
      issuedToName: "",
      dateRange: undefined,
    }),
    pageSize: WORK_ASSIGNMENT_PAGE_SIZE,
  });
  const tab = lv.activeTab;
  // The pending tab is fed by a different endpoint (eligible-summary), so the
  // work-assignment list query below is switched off while it is active.
  const isPendingTab = tab === "pending";
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view;
  const { issuedToUserId, issuedToName } = lv.view.filters;
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS);

  const sortParam = toSortParam(sortColumn, sortDirection, sortFieldMap);

  // §0.16 — scope every query to the navbar warehouse pick. A change is a fresh
  // dataset, so reset every tab's view (mirrors the Devices hub).
  const { selectedWarehouseIds, warehouses } = useWarehouseScope();
  const whKey = selectedWarehouseIds.join(",");
  const [lastWh, setLastWh] = useState(whKey);
  if (whKey !== lastWh) {
    setLastWh(whKey);
    lv.resetAllViews();
  }

  // Engineer filter: same picker as the issue wizard; the chip label rides on the stored value.
  const useEngineerOptions = useEngineersAcrossWarehousesOptions(
    selectedWarehouseIds,
    [...WA_ENGINEER_CAPABILITIES],
  );
  const engineerValue = engineerOption(issuedToUserId, issuedToName);

  // Each tab's query uses its own stored view so its count reflects its filters (§7.4).
  const listParamsFor = (tabId: WaTabId): WorkAssignmentListParams =>
    waListParams({
      tabId,
      view: lv.viewByTab[tabId],
      activeSearch: tabId === tab ? debouncedSearch : null,
      warehouseIds: selectedWarehouseIds,
    });

  const listQuery = useWorkAssignments(
    {
      ...listParamsFor(tab),
      sort: sortParam,
      page,
      page_size: pageSize,
    },
    // Pending isn't a status the list endpoint understands — it has its own
    // source, so don't fire this query (or send `status=pending`) for it.
    { enabled: !isPendingTab },
  );
  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
  const total = totalOf(listQuery);

  // §19: one useQueries for the status tabs; the active tab reuses the list total.
  const countParamsFor = (tabId: WaTabId): WorkAssignmentListParams => ({
    ...listParamsFor(tabId),
    page: 1,
    page_size: 1,
  });
  // keepPreviousData leaves the old tab's total during a switch; fall back to
  // the tab's last cached count so the pill doesn't blink to 0.
  const cachedCount = useCachedWaCount();
  const countFor = useTabCounts<WaTabId, WorkAssignmentListParams>({
    tabIds: WA_COUNT_TAB_IDS,
    activeTab: tab,
    activeTotal: listQuery.isPlaceholderData
      ? cachedCount(countParamsFor(tab))
      : total,
    paramsFor: countParamsFor,
    queryKey: wmsKeys.workAssignments.count,
    fetchCount: fetchWorkAssignments,
  });

  // eligible-summary is per-warehouse: fan out over the navbar pick or the user's assigned warehouses.
  const pendingWarehouseIds = useMemo(
    () =>
      selectedWarehouseIds.length > 0
        ? selectedWarehouseIds
        : warehouses.map((w) => w.warehouse_id),
    [selectedWarehouseIds, warehouses],
  );
  const warehouseNameById = useMemo(
    () => new Map(warehouses.map((w) => [w.warehouse_id, w.name])),
    [warehouses],
  );
  // Fetched on every tab so the Pending count pill always shows.
  const pending = useWorkAssignmentEligibleSummary(
    pendingWarehouseIds,
    WA_PENDING_STAGE,
    {
      enabled: true,
    },
  );

  const tabTotal: Record<WaTabId, number> = {
    all: countFor("all"),
    // Pending counts GRN groups, not work assignments — its own population.
    pending: pending.groups.length,
    open: countFor("open"),
    closed: countFor("closed"),
  };

  return {
    lv,
    tab,
    isPendingTab,
    debouncedSearch,
    stageValues,
    stageLabel,
    useEngineerOptions,
    engineerValue,
    listQuery,
    items,
    total,
    pending,
    pendingWarehouseIds,
    warehouseNameById,
    tabTotal,
  };
}
