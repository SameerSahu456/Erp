import { FileText } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { formatINRCompact } from "@/lib/currency";
import { formatIST_date } from "@shared/lib/date";
import { humanizeEnum } from "@shared/lib/humanize-enum";

import { type OutwardSourceOption } from "../../hooks/material-issue/useOutwardSources";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";

/** Summary of the picked source doc — mirrors Inward's source box. */
export function SourceSummary({ row }: { row: OutwardSourceOption }) {
  const cells: { label: string; value: string }[] = [
    { label: S.summaryAccount, value: row.account_name ?? "—" },
    { label: S.summaryOrderDate, value: formatIST_date(row.created_at) },
    {
      label: S.summaryOrderValue,
      value:
        row.order_value != null
          ? formatINRCompact(Number(row.order_value))
          : "—",
    },
    { label: S.summaryReady, value: String(row.ready_unit_count) },
  ];
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <Typography variant="body-strong" truncate className="min-w-0">
            {row.display_number}
          </Typography>
        </div>
        {/* A source document's status vocabulary varies per source type (sales
            order / demo / replacement), so there is no single fixed enum to
            map — humanise the wire value and render it neutral grey (§0.8). */}
        {row.status && (
          <StatusBadge variant="neutral">{humanizeEnum(row.status)}</StatusBadge>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <Typography variant="badge" tone="muted" asChild>
              <span className="block">{c.label}</span>
            </Typography>
            <Typography variant="body-strong" truncate asChild>
              <span className="mt-0.5 block min-w-0">{c.value}</span>
            </Typography>
          </div>
        ))}
      </div>
    </div>
  );
}
