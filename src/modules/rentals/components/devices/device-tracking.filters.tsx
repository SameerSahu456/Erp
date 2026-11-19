import type { ToolbarFilter } from "@/components/common/tables/BusinessMetricsTable";

import { DEVICE_ALL_TAB } from "../../constants/device-tracking";
import type { useDeviceTrackingView } from "../../hooks/devices/useDeviceTrackingView";
import { FilterDateRange } from "../shared/filters/FilterDateRange";
import { FilterSearch } from "../shared/filters/FilterSearch";
import { filterBar } from "../shared/filters/filterBar";
import { RENTALS_FILTER_STRINGS as F } from "../shared/filters/filters.strings";
import { DeviceAccountFilter, DeviceStatusFilter } from "./DeviceTrackingFilters";
import { DEVICE_STRINGS as S } from "./devices.strings";

type DeviceTrackingView = ReturnType<typeof useDeviceTrackingView>;

/** Device tracking's filter bar — search, account, status (All tab only:
 *  every other tab already IS a status) and the return date. */
export function deviceFilterBar(d: DeviceTrackingView): ToolbarFilter[] {
  const { view } = d;
  const account = view.filters.account || undefined;
  return filterBar([
    {
      key: "search",
      active: view.search.trim() !== "",
      node: (
        <FilterSearch
          value={view.search}
          onChange={view.setSearch}
          placeholder={F.search}
          clearAriaLabel={F.clearSearch}
        />
      ),
    },
    {
      key: "account",
      active: !!account,
      node: (
        <DeviceAccountFilter
          value={account}
          options={d.accountOptions}
          onChange={(next) => {
            const { account: _dropped, ...rest } = view.filters;
            view.setFilters(next && next !== "__all__" ? { ...rest, account: next } : rest);
          }}
        />
      ),
    },
    ...(d.activeTab === DEVICE_ALL_TAB
      ? [
          {
            key: "status",
            active: d.allTabStatuses.length > 0,
            node: <DeviceStatusFilter value={d.allTabStatuses} onChange={d.setAllTabStatuses} />,
          },
        ]
      : []),
    {
      key: "returnDate",
      active: !!(d.returnRange.from || d.returnRange.to),
      // CONTRACT END, so future days are allowed: "what is due back next month".
      node: (
        <FilterDateRange
          value={d.returnRange}
          onChange={d.setReturnRange}
          placeholder={S.devices.returnRangePlaceholder}
        />
      ),
    },
  ]);
}

/** Every filter back to empty — the empty state's "Clear filters". */
export function clearDeviceFilters(d: DeviceTrackingView): void {
  d.view.setSearch("");
  d.view.setFilters({});
  d.setAllTabStatuses([]);
  d.setReturnRange({});
}
