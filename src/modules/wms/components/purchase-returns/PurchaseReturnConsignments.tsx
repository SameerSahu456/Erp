import { AlertTriangle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { EntityRef } from "@/components/common/display/EntityRef";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { formatIST_date } from "@shared/lib/date";

import type { DispatchRequestListItem } from "../../api/dispatch";
import {
  DISPATCH_REQUEST_STATUS_LABELS,
  DISPATCH_REQUEST_STATUS_VARIANT,
} from "../../constants/dispatch-request";
import { useDispatchRequestsList } from "../../hooks/dispatches/useDispatchRequests";
import { CONSIGNMENTS_PAGE_SIZE } from "./return-selection";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

const C = S.consignments;

/**
 * The shipments raised against one purchase return.
 *
 * A return is a list of units owed to a vendor and they need not leave
 * together, so one return can spawn several consignments. Each one is an
 * ordinary WMS dispatch request sourced from `purchase_returns`. The challan
 * detail (AWB, driver, expected delivery) is denormalized onto the dispatch
 * list row (A#3), so the panel renders it straight from the list — no per-row
 * dispatch-detail fetch.
 */
export function PurchaseReturnConsignments({ returnId }: { returnId: string }) {
  const query = useDispatchRequestsList({
    source_entity_type: "purchase_returns",
    source_entity_id: returnId,
    page_size: CONSIGNMENTS_PAGE_SIZE,
  });

  if (query.isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={C.error}
        action={{ label: C.retry, onClick: () => void query.refetch() }}
      />
    );
  }

  const consignments = query.data?.items ?? [];
  if (!query.isLoading && consignments.length === 0) {
    return <EmptyState title={C.empty} />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{C.columns.number}</TableHead>
            <TableHead>{C.columns.status}</TableHead>
            {/* Dates right-align like amounts/quantities (§9). */}
            <TableHead className="text-right">{C.columns.dispatched}</TableHead>
            <TableHead>{C.columns.awb}</TableHead>
            <TableHead>{C.columns.driver}</TableHead>
            <TableHead className="text-right">{C.columns.expectedDelivery}</TableHead>
            <TableHead>{C.columns.returnAddress}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consignments.map((c) => (
            <ConsignmentRow key={c.id} consignment={c} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** One consignment row. The dispatch list row now carries the delivery scalars
 *  (courier tracking / driver / expected date) via the A#3 denorm, so no per-row
 *  dispatch-detail fetch is needed. */
function ConsignmentRow({ consignment: c }: { consignment: DispatchRequestListItem }) {
  return (
    <TableRow>
      <TableCell className="min-w-0">
        <Typography variant="body-strong" asChild>
          <EntityRef kind="dispatch" id={c.id} value={c.dispatch_number} />
        </Typography>
      </TableCell>
      <TableCell>
        <StatusBadge variant={DISPATCH_REQUEST_STATUS_VARIANT[c.status]}>
          {DISPATCH_REQUEST_STATUS_LABELS[c.status]}
        </StatusBadge>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {c.dispatched_at ? formatIST_date(c.dispatched_at) : C.notDispatched}
      </TableCell>
      <TableCell className="font-mono">
        {c.courier_tracking_number || C.notDispatched}
      </TableCell>
      <TableCell>
        <TruncatedText value={c.driver_name || C.notDispatched} className="max-w-[16rem]" />
        {c.driver_phone ? (
          <Typography variant="caption" tone="muted" className="tabular-nums">
            {c.driver_phone}
          </Typography>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {c.expected_delivery_date
          ? formatIST_date(c.expected_delivery_date)
          : C.notDispatched}
      </TableCell>
      <TableCell>
        <TruncatedText
          value={c.return_address || C.notDispatched}
          className="max-w-[16rem]"
        />
      </TableCell>
    </TableRow>
  );
}
