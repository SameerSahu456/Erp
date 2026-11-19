import { useParams } from "react-router-dom";

import { DetailPageShell } from "@/components/page-shells";
import { asUuid } from "@shared/lib/validation";

import { deviceStatusBadge } from "../../constants/billing";
import { useRentalDevice } from "../../hooks/devices/useRentalDevices";
import { deviceDisplayName } from "./device-detail-helpers";
import { DeviceActivityCard } from "./DeviceActivityCard";
import { DeviceDescriptionCard } from "./DeviceDescriptionCard";
import { DeviceDetailFallback } from "./DeviceDetailFallback";
import { DeviceFactsCard } from "./DeviceFactsCard";
import { DeviceHeaderActions } from "./DeviceHeaderActions";

/** One rented unit, end to end. Its SERIAL is the title — what identifies it
 *  to whoever holds it; the URL id only identifies it to the database. */
export function RentalDeviceDetailBody() {
  // §11.1: a malformed id never fetches (the query stays disabled) and
  // falls through to not-found.
  const { deviceId } = useParams<{ deviceId: string }>();
  const id = asUuid(deviceId) ?? undefined;
  const query = useRentalDevice(id);
  const device = query.data;

  if (!device) return <DeviceDetailFallback query={query} />;

  // What the unit READS as today (Alert / Overdue are derived), else stored.
  const display = device.display_status ?? device.status;
  const name = deviceDisplayName(device);

  return (
    <DetailPageShell
      title={name}
      backHref="/rentals/tracking"
      status={deviceStatusBadge(display, device.awaiting_pickup)}
      sidePanel={
        <DeviceActivityCard deviceId={device.id} deviceName={name} holdHistory={device.hold_history} />
      }
      actions={<DeviceHeaderActions device={device} name={name} />}
    >
      <div className="space-y-6">
        <DeviceFactsCard device={device} />
        <DeviceDescriptionCard description={device.description} />
      </div>
    </DetailPageShell>
  );
}
