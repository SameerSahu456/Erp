import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { ListPageShell } from "@/components/page-shells";
import { formatINR } from "@/lib/currency";
import { PAGINATION } from "@/shared/constants";
import { BusinessMetricsTable, type CellFormatter } from "@/components/common/tables/BusinessMetricsTable";

import type { DeviceDisplayStatus, RentalDevice } from "../../api/devices";
import { RENTALS_LIST_MAX_CELL_CHARS } from "../../constants/list";
import { useDeviceTrackingView } from "../../hooks/devices/useDeviceTrackingView";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { DEVICE_VIEW_KEY } from "../../constants/device-tracking";
import { clearDeviceFilters, deviceFilterBar } from "./device-tracking.filters";
import { buildDeviceTabs } from "./device-tracking-helpers";
import {
  DeviceActionsCell,
  DeviceDaysRemainingCell,
  DeviceSalesOrderCell,
  DeviceStatusCell,
} from "./DeviceTrackingCells";
import { DeviceIdentityReconcileCard } from "./DeviceIdentityReconcileCard";
import { DeviceTrackingStats } from "./DeviceTrackingStats";

type Row = Record<string, unknown>;

/** Column key → renderer; plain-text columns are absent and render as-is. */
const CELLS: Record<string, (value: unknown, row: Row) => ReactNode> = {
  salesOrder: (value, row) => (
    <DeviceSalesOrderCell number={String(value ?? "")} soId={row._liveSoId as string | undefined} />
  ),
  status: (_value, row) => (
    <DeviceStatusCell
      status={row._display as DeviceDisplayStatus}
      awaitingPickup={(row._full as RentalDevice).awaiting_pickup}
    />
  ),
  rate: (value) => formatINR(Number(value)),
  daysRemaining: (_value, row) => <DeviceDaysRemainingCell days={row._daysRemaining as number | null} />,
  actions: (_value, row) => <DeviceActionsCell device={row._full as RentalDevice} />,
};

const cellFormatter: CellFormatter = (value, key, row) => {
  const render = CELLS[key];
  return render ? { display: render(value, row) } : null;
};

/** Every rented unit: status tabs, KPI strip, server-paged table, and the
 *  fleet identity-reconcile card underneath. */
export function RentalDeviceTrackingBody() {
  const navigate = useNavigate();
  const tracking = useDeviceTrackingView();
  const { view, query, summary, activeTab, setActiveTab } = tracking;
  const tabs = buildDeviceTabs(query.data?.items ?? [], summary);

  return (
    <ListPageShell
      title={S.devices.title}
      subtitle={S.devices.description}
      className="animate-fade-in-up"
      stats={summary ? <DeviceTrackingStats summary={summary} /> : undefined}
    >
      <BusinessMetricsTable
        // Part names run to 180 chars; plain-text cells are cut, full text on hover.
        maxCellChars={RENTALS_LIST_MAX_CELL_CHARS}
        tabs={tabs}
        cellFormatter={cellFormatter}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        // The whole filter bar is the rentals filter components — see
        // `deviceFilterBar`.
        searchable={false}
        toolbarFilters={deviceFilterBar(tracking)}
        onClearFilters={() => clearDeviceFilters(tracking)}
        // The row is a UNIT, so it opens that unit; its order is one click on.
        onRowClick={(row) => navigate(`/rentals/tracking/${String(row.id)}`)}
        persistKey={DEVICE_VIEW_KEY}
        serverPagination={{
          page: view.page,
          pageSize: view.pageSize,
          total: query.data?.total ?? 0,
          isFetching: query.isFetching,
          onPageChange: view.setPage,
          onPageSizeChange: view.setPageSize,
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
          // Sorting is the server's job — 25 rows reordered is wrong across 11k units.
          sort: view.sort,
          onSortChange: (column, direction) => view.setSort({ column, direction }),
        }}
        error={query.isError ? { title: S.devices.loadError, onRetry: () => void query.refetch() } : undefined}
        emptyState={{ title: S.devices.empty, description: S.devices.emptyHint }}
      />

      {/* On the list the findings are ABOUT, so the cutover number is seen every visit. */}
      <div className="mt-6">
        <DeviceIdentityReconcileCard />
      </div>
    </ListPageShell>
  );
}
