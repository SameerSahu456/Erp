import { Link } from "react-router-dom";
import { Package } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";

import type { DeviceDisplayStatus } from "../../api/devices";
import { DEVICE_STATUS_LABELS, DEVICE_STATUS_VARIANT } from "../../constants/billing";
import { AGREEMENT_PREVIEW_ROWS } from "../../hooks/agreements/useRentalAgreementDetail";
import { useRentalDevices } from "../../hooks/devices/useRentalDevices";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";
import { ListRowsSkeleton } from "./ListRowsSkeleton";

const D = S.agreement.devices;

/** A preview of the order's units. The query lives HERE so it only runs while
 *  this tab is open. */
export function AgreementUnitsTab({ salesOrderId }: { salesOrderId: string }) {
  const devices = useRentalDevices({ sales_order_id: salesOrderId, page_size: AGREEMENT_PREVIEW_ROWS });
  const rows = devices.data?.items ?? [];
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{D.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {devices.isLoading ? (
          <ListRowsSkeleton />
        ) : devices.isError ? (
          <LoadErrorState error={devices.error} fallback={C.loadError} compact />
        ) : rows.length === 0 ? (
          <EmptyState icon={Package} title={D.empty} className="py-6" />
        ) : (
          <ul className="divide-y">
            {rows.map((unit) => {
              const status = (unit.display_status ?? unit.status) as DeviceDisplayStatus;
              return (
                <li key={unit.id} className="flex min-w-0 items-center gap-3 py-2">
                  <Typography variant="body" className="min-w-0 flex-1 truncate" asChild>
                    <Link to={`/rentals/tracking/${unit.id}`} className="hover:underline">
                      {unit.serial_number ?? unit.part_number ?? unit.id}
                    </Link>
                  </Typography>
                  <StatusBadge variant={DEVICE_STATUS_VARIANT[status] ?? "neutral"}>
                    {DEVICE_STATUS_LABELS[status] ?? status}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
        {/* The tracking page scopes on `?so=`. */}
        <Button variant="link" size="sm" className="p-0" render={<Link to={`/rentals/tracking?so=${salesOrderId}`} />}>
          {D.viewAll}
        </Button>
      </CardContent>
    </Card>
  );
}
