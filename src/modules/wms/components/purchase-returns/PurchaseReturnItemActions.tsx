import { Ban, Loader2, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell } from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";

import type { PurchaseReturnDisposition, PurchaseReturnItem } from "../../api";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";
import { DISPOSITION_OPTIONS } from "./purchase-return-items-helpers";
import type { ItemRowFlags } from "./purchase-return-item-row-helpers";

export interface ItemRowHandlers {
  onDecide: (itemId: string, disposition: PurchaseReturnDisposition) => void;
  onSettle: (item: PurchaseReturnItem) => void;
  onWaive: (item: PurchaseReturnItem) => void;
  onReject: (item: PurchaseReturnItem) => void;
  onRemove: (item: PurchaseReturnItem) => void;
}

interface ActionsCellProps {
  item: PurchaseReturnItem;
  flags: ItemRowFlags;
  pending: boolean;
  error: string | undefined;
  handlers: ItemRowHandlers;
}

/** Primary action stays inline (decide / settle); destructive + secondary
 *  actions collapse into a kebab so the row never wraps (CRM QuoteRowActions). */
export function PurchaseReturnItemActionsCell({
  item,
  flags,
  pending,
  error,
  handlers,
}: ActionsCellProps) {
  const { onDecide, onSettle, onWaive } = handlers;
  return (
    <TableCell className="pl-8">
      <div className="flex items-center gap-1.5">
        {flags.canDecideRow && (
          <Select
            disabled={pending}
            onValueChange={(value) =>
              onDecide(item.id, value as PurchaseReturnDisposition)
            }
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue placeholder={S.units.decide} />
            </SelectTrigger>
            <SelectContent>
              {DISPOSITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {flags.canSettleRow && (
          <>
            {/* Settle + Waive both sit inline for a decided refund awaiting
                settlement — Waive in the kebab buried half the choice. */}
            <Button size="sm" variant="outline" onClick={() => onSettle(item)}>
              {S.units.settle}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onWaive(item)}>
              {S.units.waive}
            </Button>
          </>
        )}
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {flags.showReject || flags.showRemove ? (
          <ItemKebabMenu item={item} flags={flags} pending={pending} handlers={handlers} />
        ) : null}
        {!flags.hasRowAction && !pending && (
          <Typography variant="helper" tone="muted" asChild>
            <span>{S.units.noAction}</span>
          </Typography>
        )}
      </div>
      {error ? (
        <Typography variant="helper" tone="danger">
          {error}
        </Typography>
      ) : null}
    </TableCell>
  );
}

function ItemKebabMenu({
  item,
  flags,
  pending,
  handlers,
}: Omit<ActionsCellProps, "error">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" disabled={pending} />}
        aria-label={S.units.rowActions}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {flags.showReject && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => handlers.onReject(item)}
          >
            <Ban className="mr-2 size-4" />
            {S.units.reject}
          </DropdownMenuItem>
        )}
        {flags.showRemove && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => handlers.onRemove(item)}
          >
            <Trash2 className="mr-2 size-4" />
            {S.units.remove}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
