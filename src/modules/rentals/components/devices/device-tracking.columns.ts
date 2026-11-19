import type { ColumnDef } from "@/components/common/tables/BusinessMetricsTable";
import { EMPTY_VALUE } from "@/shared/constants";

import type { DeviceDisplayStatus, RentalDevice } from "../../api/devices";
import { deviceStatusBadge } from "../../constants/billing";
import { formatRentalDay } from "../../lib/format";
import { DEVICE_STRINGS as S } from "./devices.strings";

/** Status tabs. `Alert` / `Overdue` are derived, but the backend filters on
 *  the same expression the rows render, so they page correctly. */
export const DEVICE_FILTERABLE_STATUSES: readonly DeviceDisplayStatus[] = [
  "On Rent",
  "Alert",
  "Overdue",
  "Hold",
  "Replacement",
  "Returned",
  "Billed",
  "Lost",
] as const;

// No widths: long names are cut by `maxCellChars`, identically on every row.
// No column is `filterable`: the filters are the rentals filter bar
// (`deviceFilterBar`), not BMT's per-column dropdowns.
export const DEVICE_TRACKING_COLUMNS: ColumnDef[] = [
  { key: "part", label: S.devices.columns.part, sortable: true },
  { key: "serial", label: S.devices.columns.serial, sortable: true },
  // Not sortable: resolved per page from the linked stock item, not a column.
  { key: "manufacturerSerial", label: S.devices.columns.manufacturerSerial },
  { key: "account", label: S.devices.columns.account },
  { key: "salesOrder", label: S.devices.columns.salesOrder },
  { key: "status", label: S.devices.columns.status, sortable: true },
  { key: "rate", label: S.devices.columns.rate, sortable: true, align: "right" },
  { key: "daysRemaining", label: S.devices.columns.daysRemaining, align: "right" },
  { key: "dispatched", label: S.devices.columns.dispatched, sortable: true },
  { key: "contractEnd", label: S.devices.columns.contractEnd, sortable: true },
  { key: "returnDate", label: S.devices.columns.returnDate, sortable: true },
  { key: "actions", label: S.devices.columns.actions, align: "right" },
];

/** One table row. `_`-prefixed fields feed the cell renderers. */
export function toDeviceRow(d: RentalDevice): Record<string, unknown> {
  return {
    id: d.id,
    part: d.part_number ?? d.description ?? EMPTY_VALUE,
    serial: d.serial_number ?? EMPTY_VALUE,
    // NULL for a unit with no stock link yet (most migrated units).
    manufacturerSerial: d.manufacturer_serial ?? EMPTY_VALUE,
    account: d.account ?? EMPTY_VALUE,
    salesOrder: d.sales_order_number ?? EMPTY_VALUE,
    // A revise leaves the pinned order superseded; link to the live head.
    _liveSoId: d.live_sales_order_id ?? d.sales_order_id,
    status: deviceStatusBadge(d.display_status ?? d.status, d.awaiting_pickup).label,
    rate: d.monthly_rate,
    daysRemaining: "",
    dispatched: formatRentalDay(d.dispatched),
    contractEnd: formatRentalDay(d.contracted_end_date),
    returnDate: formatRentalDay(d.return_date),
    actions: "",
    _display: d.display_status ?? d.status,
    _daysRemaining: d.days_remaining,
    _full: d,
  };
}
