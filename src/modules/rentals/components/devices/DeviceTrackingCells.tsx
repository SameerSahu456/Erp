import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE } from "@/shared/constants";

import type { DeviceDisplayStatus, RentalDevice } from "../../api/devices";
import { deviceStatusBadge } from "../../constants/billing";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { DeviceRentalActions } from "./DeviceRentalActions";

/** The order number, linked to its live head's rental agreement page (as
 *  the device detail does), not the CRM sales order. Stops propagation: the
 *  row click opens the DEVICE, a click on the number means the order. */
export function DeviceSalesOrderCell({ number, soId }: { number: string; soId: string | undefined }) {
  if (!soId || number === EMPTY_VALUE) return <>{number}</>;
  return (
    <Link
      to={`/rentals/agreements/${soId}`}
      state={{ backTo: "/rentals/tracking" }}
      className="text-primary underline-offset-4 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {number}
    </Link>
  );
}

export function DeviceStatusCell({
  status,
  awaitingPickup,
}: {
  status: DeviceDisplayStatus;
  awaitingPickup?: boolean;
}) {
  const badge = deviceStatusBadge(status, awaitingPickup);
  return <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>;
}

/** Blank once off rent — a settled unit's past return date would otherwise
 *  read "22 days over" like a live overdue one. */
export function DeviceDaysRemainingCell({ days }: { days: number | null | undefined }) {
  if (days === null || days === undefined) {
    return (
      <Typography variant="body" tone="muted">
        {EMPTY_VALUE}
      </Typography>
    );
  }
  return (
    <Typography variant="body" numeric tone={days < 0 ? "danger" : "default"}>
      {S.devices.daysLeft(days)}
    </Typography>
  );
}

/** The `⋯` menu; the wrapper keeps its clicks from opening the row. */
export function DeviceActionsCell({ device }: { device: RentalDevice }) {
  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()} role="presentation">
      <DeviceRentalActions device={device} />
    </div>
  );
}
