import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Typography } from "@/components/ui/typography";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EMPTY_VALUE } from "@/shared/constants";
import { formatIST, formatRelative } from "@shared/lib/date";
import { humanizeEnum } from "@shared/lib/humanize-enum";

import {
  EXPORT_ERROR_LABEL,
  EXPORT_STATUS_LABEL,
  EXPORT_STATUS_VARIANT,
} from "../../lib/export-labels";
import type { ExportStatus } from "../../lib/export-types";
import { formatBytes, formatCount } from "../../lib/format";
import { EXPORTS_STRINGS as S } from "./exports.strings";

function WithTooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delay={120}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-default" />}>
          {children}
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Status chip; a failed job's reason (mapped code, else the message) in a tooltip. */
export function ExportStatusCell({
  status,
  errorCode,
  errorMessage,
}: {
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
}) {
  const known = status in EXPORT_STATUS_LABEL;
  const badge = (
    <StatusBadge variant={known ? EXPORT_STATUS_VARIANT[status as ExportStatus] : "neutral"}>
      {known ? EXPORT_STATUS_LABEL[status as ExportStatus] : humanizeEnum(status)}
    </StatusBadge>
  );
  const reason = (errorCode ? EXPORT_ERROR_LABEL[errorCode] : undefined) ?? errorMessage;
  return reason ? <WithTooltip tip={S.failedReason(reason)}>{badge}</WithTooltip> : badge;
}

/** "in 6 days" for a ready file (exact IST time in a tooltip), "Expired" after. */
export function ExportExpiresCell({ status, expiresAt }: { status: string; expiresAt: string | null }) {
  if (status === "expired") return <>{S.expired}</>;
  if (status !== "completed" || !expiresAt) return <>{EMPTY_VALUE}</>;
  return (
    <WithTooltip tip={S.expiresAt(formatIST(expiresAt))}>
      <span className="tabular-nums">{formatRelative(expiresAt)}</span>
    </WithTooltip>
  );
}

/** Export type with its file format underneath. */
export function ExportTypeCell({ type, format }: { type: string; format: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <Typography variant="body" tone="inherit">{type}</Typography>
      <Typography variant="helper" tone="muted">{format}</Typography>
    </span>
  );
}

/** Row count, with size and download count underneath; "—" until the file exists. */
export function ExportFileCell({ rows, size, downloads }: { rows: unknown; size: unknown; downloads: unknown }) {
  if (rows == null) return <>{EMPTY_VALUE}</>;
  return (
    <span className="flex flex-col items-end">
      <Typography variant="body" tone="inherit" className="tabular-nums">
        {S.file.rows(formatCount(Number(rows)))}
      </Typography>
      {size != null ? (
        <Typography variant="helper" tone="muted" className="tabular-nums">
          {S.file.meta(formatBytes(Number(size)), Number(downloads ?? 0))}
        </Typography>
      ) : null}
    </span>
  );
}

/** IST date, with the time underneath (a job's hour matters, but not a whole column). */
export function ExportRequestedCell({ iso }: { iso: string }) {
  // Split the app's one IST format ("27 Oct 2026, 10:44 AM") so the time keeps its 12-hour form.
  const [date, time] = formatIST(iso).split(", ");
  return (
    <span className="flex flex-col items-end tabular-nums">
      <Typography variant="body" tone="inherit">{date}</Typography>
      {time ? <Typography variant="helper" tone="muted">{time}</Typography> : null}
    </span>
  );
}
