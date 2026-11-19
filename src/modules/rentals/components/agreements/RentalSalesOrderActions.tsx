import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

import type { RentalSalesOrderActionKind } from "../../api/agreements";
import { ExtendRentalSalesOrderDialog } from "./ExtendRentalSalesOrderDialog";
import { HoldRentalSalesOrderDialog } from "./HoldRentalSalesOrderDialog";
import { TerminateRentalSalesOrderDialog } from "./TerminateRentalSalesOrderDialog";
import { UnholdRentalSalesOrderDialog } from "./UnholdRentalSalesOrderDialog";
import { usePermission } from "@shared/rbac";

import { rentalsActionPermissions } from "../../permissions";
import { useRentalSalesOrderBilling } from "../../hooks/agreements/useAgreement";
import { ApproveAgreementDialog } from "./ApproveAgreementDialog";
import { RejectRentalAgreementDialog } from "./RejectRentalAgreementDialog";
import { FirstInvoiceDialog } from "./FirstInvoiceDialog";
import { ExtendPoDialog } from "../purchase-orders/ExtendPoDialog";
import { RentalSalesOrderActionsMenu } from "./RentalSalesOrderActionsMenu";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const A = S.actions;

export interface RentalSalesOrderActionsProps {
  salesOrderId: string;
  /** The CRM sales order's `sellable_type`. A plain sale has no rental
   *  lifecycle, so the control renders nothing for one. */
  sellableType?: string;
  /**
   * `row` — the bare `⋯` a table cell wants.
   * `header` — a labelled "Actions ⌄" button for a detail page header.
   */
  variant?: "row" | "header";
  /** Shown in the replacement form's order picker, which otherwise has
   *  only the id to label the preselected order with. */
  orderNumber?: string;
}

/**
 * Every lifecycle action an order supports, in one control: approve, reject,
 * the first invoice, amend, extend, Extend PO, hold / unhold, replacement,
 * return and terminate. Each entry is shown only to a user holding the
 * permission its endpoint requires (`rentalsActionPermissions`).
 *
 * This exists so the sales-order LIST and the sales-order DETAIL page do not
 * each carry their own copy of the routing rules and the four dialogs — the
 * list had them inline, and adding the same menu to the detail header would
 * otherwise have duplicated all of it (RULE ZERO).
 *
 * Which entries appear, and which are enabled, is decided by the SERVER
 * (`RentalSalesOrderActionsMenu` reads them from the same functions the action endpoints
 * refuse with), so nothing here re-derives eligibility.
 */
export function RentalSalesOrderActions({
  salesOrderId,
  sellableType,
  variant = "row",
  orderNumber,
}: RentalSalesOrderActionsProps) {
  const navigate = useNavigate();
  // Which action's dialog is open, or null. One value rather than a flag per
  // action: only one can be open, and a single value cannot drift into two.
  const [pending, setPending] = useState<RentalSalesOrderActionKind | null>(null);
  // On a detail page the next step after configuring is approval — offer it
  // as a primary button, not a menu entry beside Hold and Terminate. Only in
  // the header variant (a detail page already loads this); never per row.
  const billing = useRentalSalesOrderBilling(salesOrderId, { enabled: variant === "header" });
  const { canAny } = usePermission();
  const canApprove =
    canAny(rentalsActionPermissions.approve) &&
    !!billing.data?.actions?.some((a) => a.action === "approve" && a.enabled);

  // A plain sale has no rental lifecycle. Guarded here rather than at each
  // call site so neither page has to remember.
  if (sellableType !== undefined && sellableType !== "rental_sales") {
    return null;
  }

  function onSelect(action: RentalSalesOrderActionKind) {
    // Amend opens the Configure PAGE — amending IS re-configuring, with a
    // reason attached, and that page already handles both.
    if (action === "amend") {
      navigate(`/rentals/sales-orders/${salesOrderId}/configure?from=rentals`);
      return;
    }
    // Replacement is raised in WMS, never in rentals — `replacement_requests`
    // is the only path. The form takes `?sales_order_id=` and then lists
    // every one of that order's dispatched units as a source to swap, so
    // the order-level action can open it directly rather than detouring
    // through the tracking list. Same link the unit-level Replace and CRM's
    // SO Replacement Requests tab use.
    if (action === "replacement") {
      const params = new URLSearchParams({ sales_order_id: salesOrderId });
      if (orderNumber) params.set("so_number", orderNumber);
      navigate(`/wms/replacements/new?${params.toString()}`);
      return;
    }
    // Return is raised in WMS too, on the Rental Return Request — the only
    // document that authorizes rented units back in, and what a
    // `rental_return` GRN is received against. Receipt then settles the
    // DEVICE (status -> Returned, billing stops at the receipt date), which
    // no rentals-side dialog could do. Same shape as replacement above:
    // the form takes `?sales_order_id=` and lists that order's dispatched
    // units, so the order-level action opens it directly.
    // `all=1`: returning the ORDER, so the form counts every unit it can
    // still return rather than opening at zero.
    if (action === "return") {
      navigate(`/wms/rental-returns/new?sales_order_id=${salesOrderId}&all=1`);
      return;
    }
    setPending(action);
  }

  const close = () => setPending(null);

  return (
    <>
      {variant === "header" && canApprove ? (
        <Button size="sm" onClick={() => setPending("approve")}>
          {A.approveNow}
        </Button>
      ) : null}
      <RentalSalesOrderActionsMenu
        salesOrderId={salesOrderId}
        onSelect={onSelect}
        trigger={
          variant === "header" ? (
            <Button variant="outline" size="sm">
              {A.trigger}
              <ChevronDown className="size-4" />
            </Button>
          ) : undefined
        }
      />

      {/* Mounted only while open, so each starts from a clean form rather
          than whatever the previously-opened order left behind. */}
      {pending ? (
        <PendingActionDialog action={pending} salesOrderId={salesOrderId} onClose={close} />
      ) : null}
    </>
  );
}

interface DialogProps {
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/** The actions that open a dialog here; the rest navigate (see `onSelect`). */
const ACTION_DIALOGS: Partial<
  Record<RentalSalesOrderActionKind, (props: DialogProps) => ReactNode>
> = {
  approve: (props) => <ApproveAgreementDialog {...props} />,
  reject: (props) => <RejectRentalAgreementDialog {...props} />,
  first_invoice: (props) => <FirstInvoiceDialog {...props} />,
  extend: (props) => <ExtendRentalSalesOrderDialog {...props} />,
  extend_po: (props) => <ExtendPoDialog {...props} />,
  hold: (props) => <HoldRentalSalesOrderDialog {...props} />,
  unhold: (props) => <UnholdRentalSalesOrderDialog {...props} />,
  terminate: (props) => <TerminateRentalSalesOrderDialog {...props} />,
};

function PendingActionDialog({
  action,
  salesOrderId,
  onClose,
}: {
  action: RentalSalesOrderActionKind;
  salesOrderId: string;
  onClose: () => void;
}) {
  const render = ACTION_DIALOGS[action];
  if (!render) return null;
  return render({
    salesOrderId,
    open: true,
    onOpenChange: (next) => !next && onClose(),
    onDone: onClose,
  });
}

export default RentalSalesOrderActions;
