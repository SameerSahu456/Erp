/** Device tracking list keys, shared by the view hook and the table (§6.9.5). */

import type { DeviceDisplayStatus } from "../api/devices";
import { DEVICE_STATUS_LABELS } from "./billing";

/** Memory-state prefix and table `persistKey`; registered in `useScopedViewReset`. */
export const DEVICE_VIEW_KEY = "rentals-devices";

// A sentinel, not "", so the remembered tab id never reads as "unset".
export const DEVICE_ALL_TAB = "all";

// The All tab's Status dropdown: every display status, in lifecycle order.
// Sold has no tab, so this is the only way to list those units.
const DEVICE_STATUS_FILTER_ORDER: readonly DeviceDisplayStatus[] = [
  "On Rent",
  "Alert",
  "Overdue",
  "Hold",
  "Replacement",
  "Returned",
  "Billed",
  "Lost",
  "Sold",
];

export const DEVICE_STATUS_FILTER_OPTIONS: readonly string[] =
  DEVICE_STATUS_FILTER_ORDER;

/** Display label for a status value in the dropdown. */
export function deviceStatusFilterLabel(value: string): string {
  return DEVICE_STATUS_LABELS[value as DeviceDisplayStatus] ?? value;
}

/** Remembered dropdown values, keeping only known statuses, in list order
 *  (§11.1). Anything that is not an array reads as nothing selected. */
export function asDeviceStatuses(value: unknown): DeviceDisplayStatus[] {
  if (!Array.isArray(value)) return [];
  return DEVICE_STATUS_FILTER_ORDER.filter((status) => value.includes(status));
}

// `account` / `salesOrder` are resolved per page outside the list query, and
// `daysRemaining` sorts the same as `contractEnd` — none is server-sortable.
export const DEVICE_SORT_FIELDS: Readonly<Record<string, string>> = {
  part: "part_number",
  serial: "serial_number",
  status: "status",
  rate: "monthly_rate",
  dispatched: "dispatched",
  contractEnd: "contracted_end_date",
  returnDate: "return_date",
};
