import { Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { formatIST_date } from "@shared/lib/date";
import type { TransferDetailResponse } from "../../api";
import { DetailFact } from "../shared/section-primitives";
import { TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";
import { daysOverdue, TRANSFER_CARRIER_LABELS } from "./transfer-detail-helpers";

type Logistics = NonNullable<TransferDetailResponse["delivery_details"]>;

/** Orange "Overdue by N days" box beside the overview facts. */
function OverdueCallout({ expectedIso }: { expectedIso: string | null }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3.5 text-warning">
      <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <Typography variant="body-strong" tone="inherit">
          {S.overdueBadge}
        </Typography>
        <Typography variant="body-strong" tone="inherit">
          {S.overdueBy(daysOverdue(expectedIso))}
        </Typography>
        <Typography variant="helper" tone="inherit">
          {S.overdueExpected(formatIST_date(expectedIso))}
        </Typography>
      </div>
    </div>
  );
}

export function TransferOverviewCard({
  transfer,
  route,
}: {
  transfer: TransferDetailResponse;
  route: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.sectionOverview}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Three fact columns split by thin grey lines (Figma); stacked on phones. */}
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
            <div className="space-y-4 sm:pr-4">
              <DetailFact label={S.colRoute} value={route} />
              <DetailFact label={S.unitsInTransitLabel} value={transfer.outstanding_count} />
            </div>
            <div className="space-y-4 sm:px-4">
              <DetailFact
                label={S.sentDateLabel}
                value={transfer.dispatched_at ? formatIST_date(transfer.dispatched_at) : "—"}
              />
              <DetailFact label={S.challanLabel} value={transfer.challan_number ?? "—"} />
            </div>
            <div className="space-y-4 sm:pl-4">
              <DetailFact
                label={S.expectedArrivalLabel}
                value={transfer.expected_delivery_date ? formatIST_date(transfer.expected_delivery_date) : "—"}
              />
            </div>
          </div>
          {transfer.is_overdue ? (
            <div className="lg:w-64">
              <OverdueCallout expectedIso={transfer.expected_delivery_date} />
            </div>
          ) : null}
        </div>
        {transfer.notes ? (
          <Typography variant="helper" tone="muted" className="mt-4">
            {transfer.notes}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Consignment logistics — only present once the consignment has been sent. */
export function TransferConsignmentCard({ logistics }: { logistics: Logistics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.sectionConsignment}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <DetailFact
            label={S.carrierLabel}
            value={
              logistics.mode
                ? (TRANSFER_CARRIER_LABELS[logistics.mode] ?? logistics.mode)
                : "—"
            }
          />
          {logistics.mode === "own_vehicle" ? (
            <>
              <DetailFact label={S.vehicleLabel} value={logistics.vehicle_number ?? "—"} />
              <DetailFact label={S.driverLabel} value={logistics.driver_name ?? "—"} />
              <DetailFact label={S.driverPhoneLabel} value={logistics.driver_phone ?? "—"} />
            </>
          ) : (
            <>
              <DetailFact label={S.carrierNameLabel} value={logistics.courier ?? "—"} />
              <DetailFact
                label={S.docketLabel}
                value={logistics.docket_number ?? logistics.courier_tracking_number ?? "—"}
              />
              <DetailFact
                label={S.packagesLabel}
                value={logistics.number_of_packages ?? "—"}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
