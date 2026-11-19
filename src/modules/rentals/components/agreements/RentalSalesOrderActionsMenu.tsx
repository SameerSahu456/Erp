import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { usePermission } from "@shared/rbac";

import { rentalsActionPermissions } from "../../permissions";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { useRentalSalesOrderBilling } from "../../hooks/agreements/useAgreement";
import { useCloseOnPageScroll } from "../../hooks/agreements/useCloseOnPageScroll";
import type { RentalSalesOrderActionKind } from "../../api/agreements";

const A = S.actions;

/** One entry. A disabled one shows the server's refusal string as a tooltip;
 *  a disabled item takes no pointer events, so the hover target is a wrapper. */
function ActionItem({ label, reason, enabled, onClick }: {
  label: string;
  reason: string | null | undefined;
  enabled: boolean;
  onClick: () => void;
}) {
  const item = (
    <DropdownMenuItem disabled={!enabled} onClick={onClick}>
      {label}
    </DropdownMenuItem>
  );
  if (enabled || !reason) return item;
  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{item}</TooltipTrigger>
      <TooltipContent side="left">{reason}</TooltipContent>
    </Tooltip>
  );
}

export interface RentalSalesOrderActionsMenuProps {
  salesOrderId: string;
  /** The element that opens the menu. Defaults to the `⋯` ghost button a
   *  table row wants; a page header passes a labelled "Actions" button
   *  instead. Extending the shared menu rather than forking a second one
   *  (RULE ZERO §4). */
  trigger?: React.ReactElement;
  /** Invoked with the chosen action. Only ever fires for an ENABLED one —
   *  the menu disables the rest rather than letting the caller re-decide. */
  onSelect: (action: RentalSalesOrderActionKind) => void;
}

/** The lifecycle menu for one configured order.
 *
 *  The entries — and crucially whether each is enabled — come from the
 *  server, resolved from the very functions the action endpoints refuse
 *  with. That is why nothing here re-derives eligibility from the row: a
 *  second opinion in the UI is how a menu starts offering calls the API
 *  rejects.
 *
 *  Fetched only while the menu is OPEN. Resolving it per row would cost a
 *  devices query and an order lookup for every row on the page; the same
 *  "load it when it is needed" trade the Configure dialog on this page
 *  already makes.
 */
export function RentalSalesOrderActionsMenu({
  salesOrderId,
  trigger,
  onSelect,
}: RentalSalesOrderActionsMenuProps) {
  const [open, setOpen] = useState(false);
  // Not pinned on screen: scrolling the page closes the menu.
  useCloseOnPageScroll(open, () => setOpen(false));
  const billing = useRentalSalesOrderBilling(salesOrderId, { enabled: open });
  const { canAny } = usePermission();
  // Entries the viewer could only be refused on are left out, not greyed:
  // the server's blocked_reason explains order state, not missing grants.
  const actions = billing.data?.actions?.filter((entry) =>
    canAny(rentalsActionPermissions[entry.action]),
  );

  return (
    // Controlled so the menu can drive `enabled` on the query below —
    // resolving availability for every row would cost a devices query and
    // an order lookup per row. The handler is wrapped rather than passing
    // `setOpen` bare: Base UI calls it as `(open, eventDetails)`, and a
    // state setter should not be fed an argument it does not expect.
    // `modal={false}`: Base UI's default modal menu locks page scroll while
    // open, so the order underneath could not be scrolled. Scrolling closes
    // it instead (`useCloseOnPageScroll`).
    <DropdownMenu modal={false} open={open} onOpenChange={(next) => setOpen(next)}>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="sm" aria-label={A.trigger}>
              <MoreHorizontal className="size-4" />
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {/* The label is Base UI's `Menu.GroupLabel`, which THROWS unless a
            `Menu.Group` is above it — it reads the group's context to wire
            `aria-labelledby`. Bare, it takes the whole route's error
            boundary down with it. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{A.trigger}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {billing.isLoading ? (
            <DropdownMenuItem disabled>{A.loading}</DropdownMenuItem>
          ) : billing.isError ? (
            <DropdownMenuItem disabled>{A.failed}</DropdownMenuItem>
          ) : (
            (actions ?? []).map((entry) => (
              <ActionItem
                key={entry.action}
                label={entry.label}
                enabled={entry.enabled}
                reason={entry.blocked_reason}
                onClick={() => onSelect(entry.action)}
              />
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
