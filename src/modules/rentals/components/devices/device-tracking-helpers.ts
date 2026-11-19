import type { DeviceDisplayStatus, DeviceStatusSummary, RentalDevice } from "../../api/devices";
import { DEVICE_STATUS_LABELS } from "../../constants/billing";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { DEVICE_ALL_TAB } from "../../constants/device-tracking";
import { DEVICE_FILTERABLE_STATUSES, DEVICE_TRACKING_COLUMNS, toDeviceRow } from "./device-tracking.columns";

/** The status tabs, each with its count pill from the (unfiltered) fleet
 *  summary. `Replacement` has no counter there, so it shows no pill. */
export function buildDeviceTabs(devices: RentalDevice[], sum: DeviceStatusSummary | undefined) {
  const rows = devices.map(toDeviceRow);
  const countFor: Partial<Record<DeviceDisplayStatus, number | undefined>> = {
    "On Rent": sum?.on_rent,
    Alert: sum?.alert,
    Overdue: sum?.overdue,
    Hold: sum?.hold,
    Returned: sum?.returned,
    Billed: sum?.billed,
    Lost: sum?.lost,
  };
  return [
    { id: DEVICE_ALL_TAB, label: S.devices.tabs.all, count: sum?.total, columns: DEVICE_TRACKING_COLUMNS, data: rows },
    ...DEVICE_FILTERABLE_STATUSES.map((status) => ({
      id: status,
      label: DEVICE_STATUS_LABELS[status],
      count: countFor[status],
      columns: DEVICE_TRACKING_COLUMNS,
      data: rows,
    })),
  ];
}
