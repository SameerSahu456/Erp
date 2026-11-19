import {
  CalendarPlus,
  MoreHorizontal,
  PackageCheck,
  PauseCircle,
  PlayCircle,
  Replace,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { DeviceStatus } from "../../api/devices";
import { DEVICE_STRINGS as S } from "./devices.strings";

export interface DeviceActionsMenuProps {
  /** The element that opens the menu. Defaults to the `⋯` a table row wants;
   *  a detail header passes a labelled "Actions" button (RULE ZERO §4 —
   *  extend the shared menu rather than forking a second one). */
  trigger?: React.ReactElement;
  /** The unit's STORED status — what it may do next depends on this, not
   *  on the derived Alert/Overdue display value. An overdue unit is still
   *  on rent and can still be held or extended. */
  status: DeviceStatus;
  /** A unit whose replacement is pending is lifted off hold by confirming
   *  or cancelling that swap, never by a plain un-hold. */
  replacementPending: boolean;
  /** Every handler is optional: an entry whose handler is omitted is not
   *  rendered. The caller omits the ones the user holds no permission for,
   *  so nobody is offered an action whose endpoint would only 403. */
  onHold?: () => void;
  onUnhold?: () => void;
  onRecordDelivery?: () => void;
  /** Why recording a delivery is refused for this unit, or null when it
   *  is allowed. Comes straight from the API, so the item is disabled on
   *  exactly the units the server would reject — and the tooltip says
   *  the same thing the error would have. */
  deliveryBlockedReason: string | null;
  onExtend?: () => void;
  onReplace?: () => void;
  /** Raise a return for this unit. */
  onReturn?: () => void;
}

/** Per-unit actions on the tracking list.
 *
 *  Extend and Replace are live. RETURN is still listed and disabled: the
 *  billing engine already settles a returned unit, but the flow that
 *  raises one is not built. Showing it greyed with a reason is honest
 *  about what exists; hiding it would misrepresent the module's shape,
 *  and wiring it to nothing would be worse.
 *
 *  `settled` stays the first guard on every entry — a `Returned` or
 *  `Billed` unit is off rent, and nothing here applies to it.
 */
/** One menu entry. `reason` non-null means DISABLED, and is shown as the
 *  tooltip — so an entry can never be greyed out without saying why. */
function Item({
  icon: Icon,
  label,
  reason,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  reason: string | null;
  onClick?: () => void;
}) {
  const item = (
    <DropdownMenuItem disabled={reason !== null} onClick={onClick}>
      <Icon className="size-4" />
      {label}
    </DropdownMenuItem>
  );
  if (reason === null) return item;
  // A disabled item takes no pointer events, so the hover target is a wrapper.
  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{item}</TooltipTrigger>
      <TooltipContent side="left">{reason}</TooltipContent>
    </Tooltip>
  );
}

export function DeviceActionsMenu({
  status,
  trigger,
  replacementPending,
  onExtend,
  onReplace,
  onReturn,
  onHold,
  onUnhold,
  onRecordDelivery,
  deliveryBlockedReason,
}: DeviceActionsMenuProps) {
  const isHeld = status === "Hold";
  // Off rent: nothing can act on it any more. Carried as a REASON rather
  // than a branch that hides everything — an operator who opens the menu
  // wants to see which actions exist and why this unit cannot use them,
  // not a single line saying there are none.
  const settled =
    status === "Returned" || status === "Billed"
      ? S.devices.settledNoActions
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={S.devices.actionsLabel}
            >
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
          <DropdownMenuLabel>{S.devices.actionsLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Every action is ALWAYS listed. A disabled entry carries the
            reason as its tooltip, so the menu shows the unit's whole
            vocabulary and says which parts are shut and why. */}
          {onExtend ? (
            <Item
              icon={CalendarPlus}
              label={S.devices.extend}
              reason={settled}
              onClick={onExtend}
            />
          ) : null}
          {onRecordDelivery ? (
            <Item
              icon={PackageCheck}
              label={S.delivered.action}
              reason={settled ?? deliveryBlockedReason}
              onClick={onRecordDelivery}
            />
          ) : null}
          {isHeld ? (
            onUnhold ? (
              <Item
                icon={PlayCircle}
                label={S.devices.unhold}
                reason={
                  settled ??
                  (replacementPending ? S.devices.unholdBlocked : null)
                }
                onClick={onUnhold}
              />
            ) : null
          ) : onHold ? (
            <Item
              icon={PauseCircle}
              label={S.devices.hold}
              reason={settled}
              onClick={onHold}
            />
          ) : null}
          {/* Wired now. It was a permanently disabled placeholder while
              nothing in rentals could settle a returned unit — the
              `on_units_returned` hook the WMS GRN close fires did not
              exist, and the device status it sets is what stops the
              money.

              Still not a rentals FORM: raising the return belongs to the
              warehouse register, which picks the units, records their
              condition and carries the GRN that books the goods back in.
              Same division as `replace`. A unit already off rent has
              nothing to return, so `settled` still disables it. */}
          {onReturn ? (
            <Item
              icon={Undo2}
              label={S.devices.return}
              reason={settled}
              onClick={onReturn}
            />
          ) : null}
          {onReplace ? (
            <Item
              icon={Replace}
              label={S.devices.replace}
              // A unit already mid-swap cannot start a second one; the API
              // refuses it with REPLACEMENT_ALREADY_PENDING, so the menu
              // says so rather than letting the click fail.
              reason={
                settled ??
                (replacementPending ? S.devices.replaceAlreadyPending : null)
              }
              onClick={onReplace}
            />
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
