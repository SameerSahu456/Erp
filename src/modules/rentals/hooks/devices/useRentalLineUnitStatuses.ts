import { useQuery } from "@tanstack/react-query";

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";
import { PAGINATION } from "@/shared/constants";
import { usePermission } from "@shared/rbac";

import { fetchRentalDevices } from "../../api/devices";
import { deviceStatusBadge } from "../../constants/billing";
import { rentalsCan } from "../../permissions";
import { rentalKeys } from "../shared/keys";

export interface RentalLineUnitStatus {
  label: string;
  variant: StatusBadgeVariant;
  /** How many of the line's units are in this state. */
  count: number;
}

/**
 * Where each order line's rented units stand — On Rent, On Hold, Returned,
 * Awaiting pickup … — keyed by sales-order line id.
 *
 * For CRM's line-item breakdown, which knows lines but not rentals' unit
 * model. One request for every line asked about, run only while the caller
 * needs it (`enabled`) and only for a viewer holding `rentals:read`, the
 * code `GET /rentals/devices` is gated on. A line with no units yet (not
 * dispatched) has no entry.
 *
 * Capped at one page of `MAX_PAGE_SIZE` units: a breakdown groups a
 * handful of lines, and the units behind it are a link away in Device
 * Tracking when there are more.
 */
export function useRentalLineUnitStatuses(lineIds: string[], options: { enabled: boolean }) {
  const canView = usePermission().canAny(rentalsCan.view);
  const params = { sales_order_item_id: lineIds, page_size: PAGINATION.MAX_PAGE_SIZE };
  return useQuery({
    queryKey: rentalKeys.devices.list(params),
    queryFn: () => fetchRentalDevices(params),
    enabled: options.enabled && canView && lineIds.length > 0,
    select: (page) => {
      const byLine = new Map<string, Map<string, RentalLineUnitStatus>>();
      for (const device of page.items) {
        if (!device.sales_order_item_id) continue;
        const badge = deviceStatusBadge(device.display_status ?? device.status, device.awaiting_pickup);
        const line = byLine.get(device.sales_order_item_id) ?? new Map<string, RentalLineUnitStatus>();
        const prev = line.get(badge.label);
        line.set(badge.label, { ...badge, count: (prev?.count ?? 0) + 1 });
        byLine.set(device.sales_order_item_id, line);
      }
      return new Map([...byLine].map(([lineId, states]) => [lineId, [...states.values()]]));
    },
  });
}
