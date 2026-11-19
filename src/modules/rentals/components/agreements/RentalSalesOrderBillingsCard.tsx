import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { usePermission } from "@shared/rbac";

import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { useRentalSalesOrderBilling } from "../../hooks/agreements/useAgreement";
import { rentalsCan } from "../../permissions";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { BillingsCardConfigureButton } from "./BillingsCardConfigureButton";
import { BillingsCardStats } from "./BillingsCardStats";
import { ListRowsSkeleton } from "./ListRowsSkeleton";
import { RentalAgreementStageStrip } from "./RentalAgreementStageStrip";

export interface RentalSalesOrderBillingsCardProps {
  salesOrderId: string;
  /** The CRM order's `sellable_type`; only a rental order has billing to show. */
  sellableType: string;
}

function CardShell({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.so.cardTitle}</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function BillingsCardBody({ detail }: { detail: RentalSalesOrderBillingDetail }) {
  const config = detail.config;
  return (
    <>
      <RentalAgreementStageStrip
        status={config ? detail.display_status : null}
        devicesOut={detail.devices_out}
        deviceCount={detail.device_count}
      />
      {!detail.is_configured && (
        <Typography variant="body" tone="muted">
          {detail.can_configure ? S.so.notConfigured : S.so.needsApproval}
        </Typography>
      )}
      {detail.is_configured && detail.reconfigure_required && (
        <Typography variant="body" tone="warning">
          {detail.can_configure ? S.so.reconfigureRequired : S.so.reconfigureAfterApproval}
        </Typography>
      )}
      {config && <BillingsCardStats detail={detail} config={config} />}
    </>
  );
}

/** The "Billings" card on the CRM sales-order page, for `rental_sales` only.
 *  Configure activates once the SO is Approved; until then the card says why
 *  in the API's own words. */
export function RentalSalesOrderBillingsCard({ salesOrderId, sellableType }: RentalSalesOrderBillingsCardProps) {
  const { canAny } = usePermission();
  // A CRM user without rentals access sees the sales order without this
  // card, rather than a card that can only report a 403.
  const canView = canAny(rentalsCan.view);
  const mayConfigure = canAny(rentalsCan.configure);
  const isRental = sellableType === "rental_sales";
  const query = useRentalSalesOrderBilling(salesOrderId, { enabled: isRental && canView });

  if (!isRental || !canView) return null;
  if (query.isLoading) {
    return (
      <CardShell>
        <ListRowsSkeleton rows={2} />
      </CardShell>
    );
  }
  if (query.isError || !query.data) {
    return (
      <CardShell>
        <LoadErrorState error={query.error} fallback={S.so.loadError} compact />
      </CardShell>
    );
  }
  return (
    <CardShell
      action={mayConfigure ? <BillingsCardConfigureButton salesOrderId={salesOrderId} detail={query.data} /> : null}
    >
      <BillingsCardBody detail={query.data} />
    </CardShell>
  );
}
