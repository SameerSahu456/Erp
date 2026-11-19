import { ArrowRightLeft, IndianRupee, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";

import { DEVICE_STRINGS as S } from "./devices.strings";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
} from "../../constants/billing";
import { useDeviceHistory } from "../../hooks/devices/useRentalDevices";
import { formatRentalDay } from "../../lib/format";
import type { DeviceHistoryEntry } from "../../api/devices";

const H = S.history;

const ICON_BY_KIND: Record<DeviceHistoryEntry["kind"], LucideIcon> = {
  rental: Truck,
  rate_change: IndianRupee,
  replacement: ArrowRightLeft,
};

function Entry({ entry }: { entry: DeviceHistoryEntry }) {
  const Icon = ICON_BY_KIND[entry.kind];
  return (
    <li className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <Icon
        className="mt-1 size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="body-strong">
            {H.kinds[entry.kind]}
          </Typography>
          {/* Only a let carries a status — a repricing and a swap are
              events, not states the unit sits in. */}
          {entry.kind === "rental" && entry.status ? (
            <StatusBadge variant={DEVICE_STATUS_VARIANT[entry.status]}>
              {DEVICE_STATUS_LABELS[entry.status]}
            </StatusBadge>
          ) : null}
          <Typography variant="helper" tone="muted">
            {formatRentalDay(entry.occurred_on)}
          </Typography>
        </div>

        {entry.account || entry.order_number ? (
          <Typography variant="body" tone="muted">
            {S.history.parties([entry.account, entry.order_number])}
          </Typography>
        ) : null}

        <div className="flex flex-wrap gap-x-4">
          {entry.rate ? (
            <Typography variant="helper" tone="muted">
              {H.rateFrom(formatINR(Number(entry.rate)))}
            </Typography>
          ) : null}
          {entry.period_start ? (
            <Typography variant="helper" tone="muted">
              {H.period(
                formatRentalDay(entry.period_start),
                // A let with no return date is still running. "—" would
                // read as missing data rather than as still out.
                entry.period_end
                  ? formatRentalDay(entry.period_end)
                  : H.ongoing,
              )}
            </Typography>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export interface DeviceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  /** Falls back to the part when the unit has no serial. */
  deviceName: string;
  /** Whether a serial is recorded. Without one the unit cannot be matched
   *  to earlier rentals, and the dialog says so rather than implying this
   *  is the unit's whole life. */
  hasSerial: boolean;
}

/** Everything ONE PHYSICAL unit has done, newest first.
 *
 *  Wider than the page behind it: the detail page is a single rental, this
 *  is the object across every rental it has been part of, threaded by
 *  `previous_rental_device_id`. A laptop let to one customer, returned and
 *  let to another appears here as two rentals and one unit.
 */
export function DeviceHistoryDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
  hasSerial,
}: DeviceHistoryDialogProps) {
  // Only fetched while open — a unit's whole lineage is not worth a
  // request on every detail-page view.
  const query = useDeviceHistory(deviceId, open);
  const history = query.data;

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={H.title}
      description={H.subtitle(deviceName, history?.rentals ?? 1)}
      className="sm:max-w-2xl"
      // Read-only, so no `isDirty` — but it still uses the shared shell so
      // a long history scrolls in the body while the header stays put, the
      // way every WMS read-only panel behaves.
    >
        {!hasSerial ? (
          <Typography variant="helper" tone="muted">
            {H.unserialised}
          </Typography>
        ) : null}

        {query.isLoading ? (
          <div className="space-y-3" aria-label={H.loading}>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : query.isError ? (
          <LoadErrorState error={query.error} fallback={H.failed} compact />
        ) : !history?.entries.length ? (
          <EmptyState title={H.empty} />
        ) : (
          // No scroller of its own: OperationDialog's body already scrolls.
          <ul className="space-y-3">
            {history.entries.map((entry, index) => (
              // Entries have no id of their own — several can share a
              // device_id and a date (a let and its opening rate), so the
              // index is the only stable key within one fetched list.
              <Entry
                key={`${entry.device_id}-${entry.kind}-${index}`}
                entry={entry}
              />
            ))}
          </ul>
        )}
    </OperationDialog>
  );
}
