import { useState } from "react";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { RentalDevice } from "../../api/devices";
import { DeviceLossActions } from "../early-exit/DeviceLossActions";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { DeviceHistoryDialog } from "./DeviceHistoryDialog";
import { DeviceRentalActions } from "./DeviceRentalActions";

/** The detail header: History, the shared Actions menu (same control as the
 *  list's `⋯`), and Lost / found (R17) beside it rather than in it. */
export function DeviceHeaderActions({ device, name }: { device: RentalDevice; name: string }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
        <History className="size-4" />
        {S.history.action}
      </Button>
      <DeviceRentalActions device={device} variant="header" />
      <DeviceLossActions device={device} />
      {/* Mounted only while open: the whole lineage isn't worth a request per view. */}
      {historyOpen ? (
        <DeviceHistoryDialog
          open
          onOpenChange={setHistoryOpen}
          deviceId={device.id}
          deviceName={name}
          hasSerial={!!device.serial_number}
        />
      ) : null}
    </>
  );
}
