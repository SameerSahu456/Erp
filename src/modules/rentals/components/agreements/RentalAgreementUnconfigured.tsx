import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { DetailPageShell } from "@/components/page-shells";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermission } from "@shared/rbac";

import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { rentalsCan } from "../../permissions";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { AGREEMENTS_LIST_HREF } from "./agreement-detail-helpers";
import { RentalAgreementStageStrip } from "./RentalAgreementStageStrip";

const A = S.agreement;

/** A rental order with no agreement row yet. The backend's
 *  `configure_blocked_reason` says WHICH of three causes applies (not a
 *  rental, SO not approved, or simply unconfigured). */
export function RentalAgreementUnconfigured({
  salesOrderId,
  detail,
}: {
  salesOrderId: string;
  detail: RentalSalesOrderBillingDetail;
}) {
  const mayConfigure = usePermission().canAny(rentalsCan.configure);
  return (
    <DetailPageShell title={A.unconfigured} backHref={AGREEMENTS_LIST_HREF}>
      <div className="space-y-4">
        <Card size="sm">
          <CardContent className="py-4">
            <RentalAgreementStageStrip status={null} devicesOut={detail.devices_out} deviceCount={detail.device_count} />
          </CardContent>
        </Card>
        <EmptyState title={A.unconfigured} description={detail.configure_blocked_reason ?? A.unconfiguredHint} />
        {detail.can_configure && mayConfigure ? (
          <div className="flex justify-center">
            <Button render={<Link to={`/rentals/agreements/${salesOrderId}/configure?from=rentals`} />}>
              <Settings2 className="size-4" />
              {A.configureCta}
            </Button>
          </div>
        ) : null}
      </div>
    </DetailPageShell>
  );
}
