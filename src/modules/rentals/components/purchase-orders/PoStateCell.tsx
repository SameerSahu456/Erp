import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";

import type { PoState } from "../../api/purchase-orders";
import { PO_STATE_LABELS, PO_STATE_VARIANT } from "../../constants/billing";
import { shiftDay } from "../../lib/dateRange";
import { formatRentalDay } from "../../lib/format";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

/** The agreements list's PO cell for an order that is due or overdue.
 *  Overdue says how long and what it has left uninvoiced — the badge alone
 *  does not tell anyone that billing has stopped. */
export function PoStateCell({ row }: { row: Record<string, unknown> }) {
  const state = row.po as PoState;
  const days = row._poOverdueDays as number | null;
  const unbilled = row._poUnbilled as string | null;
  const end = row._poEnd as string | null;
  if (state !== "po_overdue" || days === null || !end) {
    return (
      <StatusBadge variant={PO_STATE_VARIANT[state]}>
        {PO_STATE_LABELS[state]}
      </StatusBadge>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <StatusBadge variant={PO_STATE_VARIANT[state]}>
        {S.overdue.badge(days)}
      </StatusBadge>
      <Typography variant="helper" tone="danger" className="whitespace-nowrap">
        {S.overdue.notInvoiced(
          formatRentalDay(shiftDay(end, 1)),
          formatINR(Number(unbilled ?? 0)),
        )}
      </Typography>
    </div>
  );
}
