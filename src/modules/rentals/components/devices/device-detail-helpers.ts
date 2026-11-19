import { EMPTY_VALUE } from "@/shared/constants";

import type { RentalDevice } from "../../api/devices";
import { DEVICE_STRINGS as S } from "./devices.strings";

const D = S.deviceDetail;

/** What the unit is called: its serial (what identifies it to whoever holds
 *  it), else its part number. */
export function deviceDisplayName(device: RentalDevice): string {
  return device.serial_number ?? device.part_number ?? EMPTY_VALUE;
}

/** The day the first invoice starts from, and why: a recorded delivery
 *  outranks the dispatch-plus-grace estimate. */
export function deviceBillingStart(device: RentalDevice): { date: string | null; hint: string | undefined } {
  const delivered = device.delivered_date ?? null;
  const date = delivered ?? device.billing_start_date ?? null;
  if (!date) return { date: null, hint: undefined };
  return { date, hint: delivered ? D.billingStartDelivered : D.billingStartEstimated };
}
