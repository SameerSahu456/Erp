import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";

import type { RentalSettings } from "../../api/settings";
import { formatRentalDay } from "../../lib/format";
import { CONFIGURATION_STRINGS as S } from "./configuration.strings";
import {
  HOUR_12_OPTIONS,
  MERIDIEM_OPTIONS,
  MINUTE_OPTIONS,
  parseHour12,
  parseMeridiem,
  parseMinute,
  to12Hour,
  to24Hour,
  type Meridiem,
  type ScheduleDraft,
} from "./configuration-helpers";
import { TimePartField } from "./TimePartField";

const C = S.configuration;

interface BillingScheduleCardProps {
  settings: RentalSettings;
  draft: ScheduleDraft;
  onChange: (next: ScheduleDraft) => void;
  disabled: boolean;
  /** The viewer lacks the settings grant: the fields show but do not take
   *  input, and the description says why. */
  readOnly?: boolean;
}

/** The daily billing run: on/off, its IST time, and when it last ran. Saved
 *  by the page's sticky Save bar. */
export function BillingScheduleCard({ settings, draft, onChange, disabled, readOnly = false }: BillingScheduleCardProps) {
  const locked = disabled || readOnly;
  const time = to12Hour(draft.billing_hour);
  return (
    <Card>
      {/* CardHeader is a flex ROW (title + action); stack title over
          description in one min-w-0 column or they render side by side. */}
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{C.scheduleTitle}</CardTitle>
          <CardDescription>{readOnly ? S.agreementDefaults.readOnly : C.timeHelp}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor="billing-enabled">{C.enabled}</Label>
            <Typography variant="helper">{C.enabledHelp}</Typography>
          </div>
          <Switch
            id="billing-enabled"
            checked={draft.billing_enabled}
            onCheckedChange={(v) => onChange({ ...draft, billing_enabled: v === true })}
            disabled={locked}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="billing-hour">{C.runTime}</Label>
          {/* 12-hour on screen, 24-hour `billing_hour` underneath. */}
          <div className="grid max-w-72 grid-cols-[1fr_auto_1fr_1fr] items-center gap-2">
            <TimePartField
              id="billing-hour"
              ariaLabel={C.hour}
              value={time.hour}
              options={HOUR_12_OPTIONS}
              parse={parseHour12}
              onChange={(hour) => onChange({ ...draft, billing_hour: to24Hour(hour, time.meridiem) })}
              disabled={locked}
            />
            <Typography variant="body" tone="muted" aria-hidden>
              {C.timeSeparator}
            </Typography>
            <TimePartField
              id="billing-minute"
              ariaLabel={C.minute}
              value={String(draft.billing_minute).padStart(2, "0")}
              options={MINUTE_OPTIONS}
              parse={parseMinute}
              onChange={(minute) => onChange({ ...draft, billing_minute: Number(minute) })}
              disabled={locked}
            />
            <TimePartField
              id="billing-meridiem"
              ariaLabel={C.meridiem}
              value={time.meridiem}
              options={MERIDIEM_OPTIONS}
              parse={parseMeridiem}
              onChange={(meridiem) =>
                onChange({ ...draft, billing_hour: to24Hour(time.hour, meridiem as Meridiem) })
              }
              disabled={locked}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Typography variant="helper">{C.lastRun}</Typography>
            <Typography variant="body">
              {settings.billing_last_run ? formatRentalDay(settings.billing_last_run) : C.never}
            </Typography>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <Typography variant="helper">{C.lastSlot}</Typography>
            <Typography variant="mono" truncate className="min-w-0">
              {settings.billing_last_slot ?? C.never}
            </Typography>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
