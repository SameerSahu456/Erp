import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useMemoryState } from "@/shared/hooks/useMemoryState";
import { asUuid } from "@shared/lib/validation";

import type { DeviceDisplayStatus, DeviceSummaryParams } from "../../api/devices";
import {
  asDeviceStatuses,
  DEVICE_ALL_TAB,
  DEVICE_SORT_FIELDS,
  DEVICE_VIEW_KEY,
} from "../../constants/device-tracking";
import { orderedYmd } from "../../lib/dateRange";
import { useRentalSalesOrderFacets } from "../agreements/useRentalSalesOrders";
import { useServerListView } from "../shared/useServerListView";
import { useDeviceSummary, useRentalDevices } from "./useRentalDevices";

/** The tracking list's state and queries: remembered view, URL scope,
 *  return-date range, status tab, the page of units and the fleet summary. */
export function useDeviceTrackingView() {
  const view = useServerListView({ viewKey: DEVICE_VIEW_KEY, sortFields: DEVICE_SORT_FIELDS });

  // `?so=` / `?line=` scope the list to one order (or some lines' units) — a
  // handoff, not a remembered filter. `line` may repeat: a merged row on the
  // order passes every line behind it. Malformed ids are dropped, never
  // sent (§11.1).
  const [searchParams] = useSearchParams();
  const scopedSalesOrderId = asUuid(searchParams.get("so")) ?? undefined;
  // Joined first so the memo keys on the VALUE — `getAll` hands back a
  // fresh array every render.
  const lineParam = searchParams.getAll("line").join(",");
  const scopedLineIds = useMemo(
    () =>
      lineParam
        .split(",")
        .map((raw) => asUuid(raw))
        .filter((id): id is string => id !== null),
    [lineParam],
  );

  // RETURN date as `YYYY-MM-DD` strings (memory state serialises).
  const [returnRange, setReturnRange] = useMemoryState<{ from?: string; to?: string }>(
    `${DEVICE_VIEW_KEY}:returnRange`,
    {},
  );
  // The active tab IS the status filter; every id but ALL_TAB is a display status.
  const [activeTab, setActiveTab] = useMemoryState(`${DEVICE_VIEW_KEY}:tab`, DEVICE_ALL_TAB);
  // On the All tab a Status multi-select narrows instead (a unit matching ANY
  // ticked status is listed); other tabs ignore it.
  const [rememberedStatuses, setAllTabStatuses] = useMemoryState<string[]>(
    `${DEVICE_VIEW_KEY}:statuses`,
    [],
  );
  const allTabStatuses = asDeviceStatuses(rememberedStatuses);
  const statusFilter =
    activeTab === DEVICE_ALL_TAB ? allTabStatuses : (activeTab as DeviceDisplayStatus);
  // Ordered: a remembered range could be inverted, which the API 422s.
  const range = orderedYmd(returnRange);

  // The list's filters, shared with the summary so the tab counts and cards
  // narrow with the list (status is left out: it is what they count by).
  const scope: DeviceSummaryParams = {
    q: view.q,
    sales_order_id: scopedSalesOrderId,
    sales_order_item_id: scopedLineIds.length > 0 ? scopedLineIds : undefined,
    account: view.filters.account || undefined,
    return_from: range.from,
    return_to: range.to,
  };
  const query = useRentalDevices({
    ...scope,
    page: view.page,
    page_size: view.pageSize,
    status: statusFilter,
    sort: view.sortParam,
  });
  const summary = useDeviceSummary(scope);
  // Every device's account owns its rental order, so the SO facets are the same set.
  const facets = useRentalSalesOrderFacets().data;

  return {
    view,
    query,
    summary: summary.data,
    accountOptions: facets?.accounts ?? [],
    activeTab,
    setActiveTab: view.withPageReset(setActiveTab),
    // Validated, so a stale remembered value shows as "All statuses".
    allTabStatuses,
    setAllTabStatuses: view.withPageReset(setAllTabStatuses),
    returnRange,
    setReturnRange: view.withPageReset(setReturnRange),
  };
}
