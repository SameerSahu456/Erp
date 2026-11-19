import { useState } from "react";
import { AlertTriangle, CalendarPlus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/currency";
import { usePermission } from "@shared/rbac";

import { useOrderPurchaseOrders } from "../../hooks/purchase-orders/usePurchaseOrders";
import { shiftDay } from "../../lib/dateRange";
import { formatRentalDay } from "../../lib/format";
import { rentalsCan } from "../../permissions";
import { ExtendPoDialog } from "./ExtendPoDialog";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const O = S.overdue;

/** The agreement page's warning that a PO-needed order has lapsed: billing
 *  stopped at the PO end, units are still out, and the rent since then is
 *  piling up uninvoiced. Renders nothing unless the order is PO Overdue. */
export function PoOverdueBanner({ salesOrderId }: { salesOrderId: string }) {
  const query = useOrderPurchaseOrders(salesOrderId);
  const { canAny } = usePermission();
  const [extending, setExtending] = useState(false);
  const data = query.data;
  if (data?.po_state !== "po_overdue" || !data.po_end_date) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle />
      <AlertTitle>
        {O.bannerTitle(formatRentalDay(shiftDay(data.po_end_date, 1)))}
      </AlertTitle>
      <AlertDescription>
        <p>
          {O.bannerBody(
            data.units_out ?? 0,
            formatINR(Number(data.po_unbilled_estimate ?? 0)),
          )}
        </p>
        {canAny(rentalsCan.managePurchaseOrders) ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExtending(true)}
          >
            <CalendarPlus className="size-4" />
            {O.extend}
          </Button>
        ) : null}
      </AlertDescription>
      {extending ? (
        <ExtendPoDialog
          salesOrderId={salesOrderId}
          open
          onOpenChange={(next) => !next && setExtending(false)}
        />
      ) : null}
    </Alert>
  );
}
