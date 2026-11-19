import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { usePermission } from "@shared/rbac";

import type { RentalDevice } from "../../api/devices";
import { rentalsActionPermissions, rentalsCan } from "../../permissions";
import { DeviceActionsMenu } from "./DeviceActionsMenu";
import { ExtendDeviceDialog } from "./ExtendDeviceDialog";
import { HoldDeviceDialog } from "./HoldDeviceDialog";
import { ResumeDeviceDialog } from "./ResumeDeviceDialog";
import { RecordDeliveryDialog } from "./RecordDeliveryDialog";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { istTodayDateParam } from "@shared/lib/date";

export interface DeviceRentalActionsProps {
  device: RentalDevice;
  /**
   * `row` — the bare `⋯` a table cell wants.
   * `header` — a labelled "Actions ⌄" button for a detail page header.
   */
  variant?: "row" | "header";
}

/** The WMS replacement form, prefilled with this unit's order. `so_number`
 *  is what the order picker shows; without it the form falls back to the
 *  raw order id. Same params as the agreement-level action and CRM's tab. */
function replacementLink(device: RentalDevice): string {
  const params = new URLSearchParams({ sales_order_id: device.sales_order_id });
  if (device.sales_order_number)
    params.set("so_number", device.sales_order_number);
  // THIS unit: the form ticks it and shows only its row, rather than asking
  // which unit again (2026-11-16). The device id covers a unit with no serial.
  params.set("device", device.id);
  if (device.serial_number) params.set("serial", device.serial_number);
  return `/wms/replacements/new?${params.toString()}`;
}

/** The WMS return form with THIS unit already counted: its order line's
 *  row for a unit with no dispatch record, else its model's row. */
function returnLink(device: RentalDevice): string {
  const params = new URLSearchParams({
    sales_order_id: device.live_sales_order_id ?? device.sales_order_id,
  });
  // `serial` locks the form to this one unit. Without a serial, `line` ticks
  // its order line's units (the form reads `line`; `unit_line` was ignored).
  if (device.serial_number) params.set("serial", device.serial_number);
  else if (device.sales_order_item_id) params.set("line", device.sales_order_item_id);
  return `/wms/rental-returns/new?${params.toString()}`;
}

/**
 * Every action a rented unit supports — hold, un-hold, record delivery,
 * extend and replacement — in one control.
 *
 * Shared by the tracking LIST and the device DETAIL header. Each dialog owns
 * its own mutation, so a table row creates no mutation observers.
 *
 * `DeviceActionsMenu` decides which entries are usable from the unit's
 * STORED status — an Overdue unit is still on rent, so it can still be held
 * or extended — and shows the server's own refusal string on the rest.
 */
export function DeviceRentalActions({
  device,
  variant = "row",
}: DeviceRentalActionsProps) {
  const navigate = useNavigate();
  const [holding, setHolding] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [extending, setExtending] = useState(false);
  const { canAny } = usePermission();
  // Each entry is offered only to a user holding the code its endpoint is
  // gated on; an omitted handler drops the entry from the menu.
  const canHold = canAny(rentalsCan.hold);
  const canDeliver = canAny(rentalsCan.recordDelivery);
  const canExtend = canAny(rentalsCan.extend);
  // Same bundles as the order's menu: both open forms that also take
  // crm:manage (and wms:outward_manage for replacements).
  const canReplace = canAny(rentalsActionPermissions.replacement);
  const canReturn = canAny(rentalsActionPermissions.return);

  const today = istTodayDateParam();

  if (!(canHold || canDeliver || canExtend || canReplace || canReturn)) {
    return null;
  }

  return (
    <>
      <DeviceActionsMenu
        status={device.status}
        replacementPending={device.replacement_pending === true}
        deliveryBlockedReason={device.delivery_blocked_reason ?? null}
        trigger={
          variant === "header" ? (
            <Button variant="outline" size="sm">
              {S.devices.actionsLabel}
              <ChevronDown className="size-4" />
            </Button>
          ) : undefined
        }
        // Dialogs, not a bare mutate. Both actions took `today` with no
        // way to see or change it, so a hold the customer reported last
        // week could not be recorded and the resume day — which decides
        // what the next invoice credits — was invisible at the moment of
        // acting.
        onHold={canHold ? () => setHolding(true) : undefined}
        onUnhold={canHold ? () => setResuming(true) : undefined}
        onRecordDelivery={canDeliver ? () => setDelivering(true) : undefined}
        onExtend={canExtend ? () => setExtending(true) : undefined}
        // Raising a swap is the WMS replacement-request flow, not a rentals
        // form of its own: it picks the units, the substitute variant and
        // the rate, and carries its own approval.
        onReplace={
          canReplace ? () => navigate(replacementLink(device)) : undefined
        }
        // Returning is the WMS rental-return register, for the same
        // reason a swap is: it picks the units, records their condition
        // and carries the GRN that books the goods physically back in.
        // Rentals only settles the money, when that GRN closes
        // (`on_units_returned`) — and the device status it sets is what
        // stops the billing, at the day the goods reached the warehouse.
        //
        // `live_sales_order_id` FIRST: a revise leaves this unit pinned
        // to a superseded version, and the return has to be raised
        // against the order the warehouse can still act on. Same
        // precedence the tracking list uses for its own links.
        //
        // `serial` makes the form show THIS unit as already chosen, instead
        // of asking for it again (see `returnLink`).
        onReturn={canReturn ? () => navigate(returnLink(device)) : undefined}
      />

      {/* Mounted only while open, so each opens on THIS unit's dates. */}
      {holding ? (
        <HoldDeviceDialog
          open
          onOpenChange={(next) => !next && setHolding(false)}
          deviceId={device.id}
          dispatched={device.dispatched}
          billingStart={device.billing_start_date}
          firstUnbilled={device.previous_billed_date}
          today={today}
        />
      ) : null}

      {resuming ? (
        <ResumeDeviceDialog
          open
          onOpenChange={(next) => !next && setResuming(false)}
          deviceId={device.id}
          holdStarted={device.hold_started ?? null}
          holdUntil={device.hold_until ?? null}
          holdCredit={device.hold_credit ?? null}
          today={today}
        />
      ) : null}

      {delivering ? (
        <RecordDeliveryDialog
          open
          onOpenChange={(next) => !next && setDelivering(false)}
          deviceId={device.id}
          dispatched={device.dispatched}
          deliveredDate={device.delivered_date ?? null}
          today={today}
        />
      ) : null}

      {extending ? (
        <ExtendDeviceDialog
          open
          onOpenChange={(next) => !next && setExtending(false)}
          deviceId={device.id}
          contractEnd={device.contracted_end_date ?? null}
          today={today}
        />
      ) : null}
    </>
  );
}

export default DeviceRentalActions;
