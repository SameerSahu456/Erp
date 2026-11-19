import { type ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

// A compact bordered staged-list table with a column header row. `extraHeaders`
// + `gridCols` let the pull-out variant add its Rack / Bin columns.
export function StagedTable({
  count,
  emptyText,
  children,
  extraHeaders,
  gridCols = "grid-cols-[1fr_auto_1.75rem]",
}: {
  count: number;
  emptyText: string;
  children: ReactNode;
  extraHeaders?: ReactNode;
  gridCols?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Typography variant="helper" tone="muted" align="end" asChild>
        <span className="block">{S.issuedComponents.itemsCount(count)}</span>
      </Typography>
      {count === 0 ? (
        <Typography variant="helper" tone="muted" asChild>
          <span className="block py-1">{emptyText}</span>
        </Typography>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          <div className={cn("grid items-center gap-3 py-2", gridCols)}>
            <Typography variant="badge" tone="muted" asChild>
              <span>{S.issuedComponents.colPartNumber}</span>
            </Typography>
            <Typography variant="badge" tone="muted" asChild>
              <span>{S.issuedComponents.colSerial}</span>
            </Typography>
            {extraHeaders}
            <span />
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
