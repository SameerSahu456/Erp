import { AlertTriangle, CalendarClock, CheckCircle2, MonitorSmartphone, PauseCircle } from "lucide-react";

import { StatsRow } from "@/components/common/display/StatsRow";

import type { DeviceStatusSummary } from "../../api/devices";
import { DEVICE_STRINGS as S } from "./devices.strings";

const K = S.devices.kpis;

/** The fleet KPI strip — the same StatsRow the dashboards use. */
export function DeviceTrackingStats({ summary: s }: { summary: DeviceStatusSummary }) {
  return (
    <StatsRow
      stats={[
        // Still with the customer: Alert and Overdue are never stored, so
        // the On Rent count alone reads low.
        {
          label: K.out,
          value: s.on_rent + s.alert + s.overdue,
          icon: MonitorSmartphone,
          accent: "primary",
          sub: K.outSub(s.total),
        },
        {
          label: K.dueSoon,
          value: s.alert,
          icon: CalendarClock,
          accent: s.alert > 0 ? "warning" : "success",
          sub: K.dueSoonSub,
        },
        {
          label: K.overdue,
          value: s.overdue,
          icon: AlertTriangle,
          accent: s.overdue > 0 ? "danger" : "success",
          sub: K.overdueSub,
        },
        {
          label: K.onHold,
          value: s.hold,
          icon: PauseCircle,
          accent: s.hold > 0 ? "warning" : "info",
          sub: K.onHoldSub,
        },
        {
          label: K.settled,
          value: s.returned + s.billed,
          icon: CheckCircle2,
          accent: "teal",
          sub: K.settledSub,
        },
      ]}
    />
  );
}
