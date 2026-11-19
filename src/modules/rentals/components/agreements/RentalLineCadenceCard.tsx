import { useState } from "react";
import { Pencil } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE } from "@/shared/constants";
import { usePermission } from "@shared/rbac/usePermission";

import type { RentalLineCadence } from "../../api/agreements";
import { rentalsPermissions } from "../../permissions";
import { describeCadence, formatRentalDay, rentalDuration } from "../../lib/format";
import { LineCadenceDialog } from "./LineCadenceDialog";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const L = S.agreement.lines;

function Duration({
  start,
  end,
}: {
  // `string | null | undefined`, not `string | null`: the generated
  // `RentalLineCadence` marks both dates OPTIONAL, so an absent key is a
  // third state. `rentalDuration` already treats all three as "no span".
  start: string | null | undefined;
  end: string | null | undefined;
}) {
  const span = rentalDuration(start, end);
  if (!span) {
    return (
      <Typography variant="helper" tone="muted" asChild>
        <span>{EMPTY_VALUE}</span>
      </Typography>
    );
  }
  return (
    <Typography variant="body" asChild>
      <span>
        {"months" in span ? L.months(span.months) : L.days(span.days)}
      </span>
    </Typography>
  );
}

export interface RentalLineCadenceCardProps {
  agreementId: string;
  salesOrderId: string;
  /** Every rental line on the order with its EFFECTIVE cycle, resolved
   *  server-side. A line that has never been touched still appears — the
   *  list is driven from the CRM lines, not from the cadence rows. */
  lines: readonly RentalLineCadence[];
  /** What the ORDER bills on, for the inherited rows' context line. */
  orderCadenceLabel: string;
  /** The ORDER's rental window. A line with no dates of its own bills
   *  across this, so the row shows these dates rather than a blank —
   *  `build_billing_settings` falls the window back independently of the
   *  cadence, and a dash here would read as "not billed".
   *
   *  Nullable AND optional, matching the generated agreement shape: an
   *  agreement can be configured before its dates are known. */
  orderStartDate: string | null | undefined;
  orderEndDate: string | null | undefined;
}

/** Every rental line, its rental period, and the cycle it bills on.
 *
 *  This card is the answer to "I cannot see the billing duration or the
 *  billing cycle line by line". Before it, the agreement showed ONE
 *  cadence and ONE period in the Overview facts, which was correct only
 *  while every line agreed — and said nothing at all once one line billed
 *  quarterly on an otherwise monthly order.
 *
 *  Rental DATES are read-only here on purpose: they live on the CRM sales
 *  order line and are edited there. Only the CYCLE is settable, because
 *  only the cycle has a per-line column on the agreement.
 */
export function RentalLineCadenceCard({
  agreementId,
  salesOrderId,
  lines,
  orderCadenceLabel,
  orderStartDate,
  orderEndDate,
}: RentalLineCadenceCardProps) {
  const { can } = usePermission();
  const canEdit = can(rentalsPermissions.CONFIGURE);
  // Which row's dialog is open, by line id. The dialog is MOUNTED per open
  // row rather than kept mounted and fed a prop, so its seeded state is
  // always the state of the row that was actually clicked.
  const [editing, setEditing] = useState<string | null>(null);
  const active = lines.find((l) => l.sales_order_item_id === editing) ?? null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{L.title}</CardTitle>
        <Typography variant="helper" tone="muted" asChild>
          <p>{L.help}</p>
        </Typography>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <Typography variant="body" tone="muted" asChild>
            <p>{L.empty}</p>
          </Typography>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{L.item}</TableHead>
                <TableHead>{L.period}</TableHead>
                <TableHead>{L.duration}</TableHead>
                <TableHead>{L.cycle}</TableHead>
                <TableHead>{L.billedThrough}</TableHead>
                {canEdit ? <TableHead className="w-10" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                // The line's own window, or the order's when it has none.
                // Resolved HERE rather than shown as a blank, because the
                // engine resolves it the same way and bills the line.
                const ownDates = Boolean(
                  line.rental_start_date && line.rental_end_date,
                );
                const start = ownDates ? line.rental_start_date : orderStartDate;
                const end = ownDates ? line.rental_end_date : orderEndDate;
                return (
                  <TableRow key={line.sales_order_item_id}>
                    <TableCell className="max-w-[18rem]">
                      <Tooltip>
                        <TooltipTrigger render={<span className="block min-w-0 truncate" />}>
                          <Typography variant="body" asChild>
                            <span>{line.item_name}</span>
                          </Typography>
                        </TooltipTrigger>
                        <TooltipContent>{line.item_name}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col gap-1">
                        <Typography variant="body" asChild>
                          <span>{S.period(formatRentalDay(start), formatRentalDay(end))}</span>
                        </Typography>
                        {ownDates ? null : (
                          <Typography
                            variant="helper"
                            tone="muted"
                            title={L.orderPeriodHint}
                          >
                            {L.orderPeriod}
                          </Typography>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Duration start={start} end={end} />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col gap-1">
                        <Typography variant="body" asChild>
                          <span>
                            {describeCadence(
                              line.billing_type,
                              line.billing_mode,
                              line.custom_days,
                            )}
                          </span>
                        </Typography>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            variant={line.is_override ? "info" : "neutral"}
                          >
                            {line.is_override ? L.overridden : L.inherited}
                          </StatusBadge>
                          {line.billing_day ? (
                            <Typography variant="helper" tone="muted" asChild>
                              <span>{L.dayOfMonth(line.billing_day)}</span>
                            </Typography>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body" asChild>
                        <span>{formatRentalDay(line.last_billed_date)}</span>
                      </Typography>
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={L.edit}
                          title={L.edit}
                          onClick={() => setEditing(line.sales_order_item_id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {active ? (
        <LineCadenceDialog
          open
          onOpenChange={(next) => !next && setEditing(null)}
          agreementId={agreementId}
          salesOrderId={salesOrderId}
          line={active}
          orderCadenceLabel={orderCadenceLabel}
          orderStart={orderStartDate}
          orderEnd={orderEndDate}
        />
      ) : null}
    </Card>
  );
}
