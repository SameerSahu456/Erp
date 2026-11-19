import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { humanizeEnum } from "@/shared/lib/humanize-enum";

import type { PurchaseReturnDisposition, PurchaseReturnItem } from "../../api";
import { getPurchaseReturnItemLabel } from "../../hooks/purchase-returns/usePurchaseReturnDetailView";
import {
  PURCHASE_RETURN_DETAIL_STRINGS as S,
  PURCHASE_RETURN_ITEM_DISPATCH_LABELS,
  PURCHASE_RETURN_ITEM_DISPATCH_VARIANT,
  RETURN_REASON_LABELS,
  SETTLEMENT_MODE_LABELS,
  SETTLEMENT_STATUS_LABELS,
  type PurchaseReturnSettlementStatus,
} from "./purchase-returns.strings";
import {
  dispositionMeta,
  money,
  SETTLEMENT_VARIANT,
} from "./purchase-return-items-helpers";
import { itemRowFlags } from "./purchase-return-item-row-helpers";
import { PurchaseReturnItemActionsCell } from "./PurchaseReturnItemActions";
import { purchaseReturnItemColumns } from "./purchase-return-items.columns";

interface RowProps {
  item: PurchaseReturnItem;
  canSettle: boolean;
  canWrite: boolean;
  isRaised: boolean;
  isDispatched: boolean;
  showActions: boolean;
  selected: boolean;
  pending: boolean;
  error: string | undefined;
  onToggle: (itemId: string, checked: boolean) => void;
  onDecide: (itemId: string, disposition: PurchaseReturnDisposition) => void;
  onSettle: (item: PurchaseReturnItem) => void;
  onWaive: (item: PurchaseReturnItem) => void;
  onReject: (item: PurchaseReturnItem) => void;
  onRemove: (item: PurchaseReturnItem) => void;
}

/** One line item of a purchase return. */
export function PurchaseReturnItemRow({
  item,
  canSettle,
  canWrite,
  isRaised,
  isDispatched,
  showActions,
  selected,
  pending,
  error,
  onToggle,
  onDecide,
  onSettle,
  onWaive,
  onReject,
  onRemove,
}: RowProps) {
  const cancelled = item.status === "cancelled";
  const flags = itemRowFlags(item, { canSettle, canWrite, isRaised, isDispatched });
  const disp = dispositionMeta(item);
  const [reasonOpen, setReasonOpen] = useState(false);

  return (
    <>
      <TableRow className={cancelled ? "opacity-55" : undefined}>
        {canSettle && (
          <TableCell className="w-8 px-2">
            {flags.undecidedRow && (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onToggle(item.id, checked === true)}
                aria-label={S.units.selectUnitAria(
                  item.internal_serial ?? item.stock_item_id,
                )}
              />
            )}
          </TableCell>
        )}
        <TableCell className="font-mono"><TruncatedSerial value={item.internal_serial} mono={false} /></TableCell>
        <TableCell className="max-w-[16rem]">
          <Typography variant="body" truncate className="min-w-0">
            {getPurchaseReturnItemLabel(item)}
          </Typography>
        </TableCell>
        <ReasonCell item={item} open={reasonOpen} onToggle={() => setReasonOpen((o) => !o)} />
        <TableCell>
          <StatusBadge variant={disp.variant}>{disp.label}</StatusBadge>
        </TableCell>
        {/* Which units of a partly-dispatched return are still here — neither
            status field answers it (a replace resolves on ship; a refund stays pending). */}
        <TableCell>
          <StatusBadge
            variant={
              PURCHASE_RETURN_ITEM_DISPATCH_VARIANT[item.dispatch_status] ?? "neutral"
            }
          >
            {PURCHASE_RETURN_ITEM_DISPATCH_LABELS[item.dispatch_status] ??
              humanizeEnum(item.dispatch_status)}
          </StatusBadge>
        </TableCell>
        <SettlementCell item={item} />
        <TableCell className="text-right font-medium tabular-nums">
          {money(item.credit_total)}
        </TableCell>
        {showActions && (
          <PurchaseReturnItemActionsCell
            item={item}
            flags={flags}
            pending={pending}
            error={error}
            handlers={{ onDecide, onSettle, onWaive, onReject, onRemove }}
          />
        )}
      </TableRow>
      {reasonOpen && item.reason_notes ? (
        <ReasonDetailRow
          item={item}
          colSpan={purchaseReturnItemColumns({ canSettle, showActions }).length}
        />
      ) : null}
    </>
  );
}

/** Reason label + a one-line preview of the note that expands the full note below. */
function ReasonCell({
  item,
  open,
  onToggle,
}: {
  item: PurchaseReturnItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <TableCell className="max-w-[14rem]">
      <Typography variant="body" truncate className="min-w-0">
        {RETURN_REASON_LABELS[item.reason_code]}
      </Typography>
      {item.reason_notes ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`pr-reason-${item.id}`}
          aria-label={S.units.toggleReason(open)}
          className="flex w-full min-w-0 items-center gap-1 rounded text-left text-muted-foreground hover:text-foreground"
        >
          <Typography variant="caption" truncate asChild>
            <span className="min-w-0 flex-1">{item.reason_notes}</span>
          </Typography>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      ) : null}
    </TableCell>
  );
}

/** The full reason note, in a row spanning the table under its unit. */
function ReasonDetailRow({ item, colSpan }: { item: PurchaseReturnItem; colSpan: number }) {
  return (
    <TableRow id={`pr-reason-${item.id}`} className="bg-muted/40 hover:bg-muted/40">
      <TableCell colSpan={colSpan} className="py-3">
        <Typography variant="helper" tone="muted">
          {RETURN_REASON_LABELS[item.reason_code]}
        </Typography>
        <Typography variant="body" className="whitespace-pre-wrap break-words">
          {item.reason_notes}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

function SettlementCell({ item }: { item: PurchaseReturnItem }) {
  const settlement = item.settlement_status as PurchaseReturnSettlementStatus | null;
  return (
    <TableCell className="max-w-[16rem]">
      {settlement ? (
        <div className="min-w-0 space-y-1">
          <StatusBadge variant={SETTLEMENT_VARIANT[settlement]}>
            {SETTLEMENT_STATUS_LABELS[settlement]}
          </StatusBadge>
          {/* Settlement particulars — how it was settled + the note
              (settle) or the reason (waive), once the API returns them. */}
          {item.settlement_mode ? (
            <Typography variant="caption" tone="muted" asChild>
              <div>
                {SETTLEMENT_MODE_LABELS[item.settlement_mode] ?? item.settlement_mode}
              </div>
            </Typography>
          ) : null}
          {/* One-line truncate + full text in a hover tooltip. Without
              the cell's max-w + this bound, a long waive reason widened
              the column and blew the table out horizontally. */}
          {item.settlement_notes ? (
            <TruncatedText
              value={item.settlement_notes}
              className="max-w-full"
            />
          ) : null}
        </div>
      ) : (
        <Typography variant="body" tone="muted" asChild>
          <span>{S.units.noAction}</span>
        </Typography>
      )}
    </TableCell>
  );
}
