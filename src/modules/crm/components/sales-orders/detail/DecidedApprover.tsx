import { Typography } from "@/components/ui/typography";
import { formatIST_date } from "@shared/lib/date";

import type { SalesOrderItemWire } from "../../../api";
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings";

type DecidedLine = Pick<
  SalesOrderItemWire,
  | "line_status"
  | "line_decided_by_name"
  | "line_auto_decided"
  | "line_decided_at"
>;

function decisionLabel(line: DecidedLine): string {
  const rejected = line.line_status === "Rejected";
  if (line.line_auto_decided && !rejected)
    return S.detail.approver.autoApproved;
  const name = line.line_decided_by_name;
  if (!name)
    return rejected ? S.detail.approver.rejected : S.detail.approver.approved;
  return rejected
    ? S.detail.approver.rejectedBy(name)
    : S.detail.approver.approvedBy(name);
}

// Approver cell once a line is decided (QA RM10): who actually decided it and
// when — "Approved by X on <date>", or "Auto-approved" for a line the system
// approved (no PM approver, or a demo→SO conversion).
export function DecidedApprover({ line }: { line: DecidedLine }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <Typography variant="caption" className="block truncate">
        {decisionLabel(line)}
      </Typography>
      {line.line_decided_at ? (
        <Typography variant="caption" tone="muted" className="block truncate">
          {S.detail.approver.on(formatIST_date(line.line_decided_at))}
        </Typography>
      ) : null}
    </div>
  );
}
