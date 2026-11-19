import { Boxes, Cpu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";

import type { DispatchLineItem } from "../../api/dispatch";
import { formatCondition } from "../../constants/condition";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";
import { LINE_STATUS_VARIANT, unitName } from "./dispatch-detail-helpers";

// The inner content of a unit row — icon + name/serial/condition + an optional
// trailing slot + status badge. The caller owns the padding/wrapper (so the
// same content works as an accordion trigger and as a component row).
export function UnitContent({
  line,
  component,
  trailing,
}: {
  line: DispatchLineItem;
  component?: boolean;
  trailing?: React.ReactNode;
}) {
  const pv = line.part_variant;
  const Icon = component ? Cpu : Boxes;
  return (
    <>
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
          component
            ? "bg-secondary/70 text-muted-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <Typography variant="body-strong" truncate className="min-w-0">
          {unitName(line)}
        </Typography>
        <Typography variant="mono" tone="muted">
          <TruncatedSerial value={line.serial_number} className="max-w-full" mono={false} />
        </Typography>
        {pv?.condition && (
          <Typography variant="helper" tone="muted">
            · {formatCondition(pv.condition)}
          </Typography>
        )}
      </div>
      {trailing}
      <StatusBadge variant={LINE_STATUS_VARIANT[line.status] ?? "neutral"}>
        {S.unitStatus[line.status] ?? line.status}
      </StatusBadge>
    </>
  );
}
