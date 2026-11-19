import { Pencil, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIST_date } from "@shared/lib/date";
import { formatINRCompact } from "@/lib/currency";
import { DetailFact } from "../shared/section-primitives";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";
import {
  FREIGHT_LABEL,
  MODE_LABEL,
  type DeliveryDetails,
} from "./dispatch-detail-helpers";

function money(v: string | number | null | undefined): string {
  return v != null && v !== ""
    ? formatINRCompact(v, { decimals: true })
    : S.none;
}

/** Logistics — the SAVED values as plain text, plus the Edit entry point. */
export function DispatchLogisticsCard({
  delivery,
  savedInvoice,
  onEdit,
}: {
  delivery: DeliveryDetails;
  savedInvoice: string | number | null | undefined;
  /** Null hides Edit Logistics (cancelled DR, or a view-only user — §0.9). */
  onEdit: (() => void) | null;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Truck className="size-4 text-primary" />
          {S.logisticsHeading}
        </CardTitle>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4" data-icon="inline-start" />
            {S.editLogistics}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <DetailFact label={S.awb} value={delivery.courier_tracking_number || S.none} />
        <DetailFact label={S.courier} value={delivery.courier || S.none} />
        <DetailFact label={S.docket} value={delivery.docket_number || S.none} />
        <DetailFact
          label={S.mode}
          value={delivery.mode ? (MODE_LABEL[delivery.mode] ?? delivery.mode) : S.none}
        />
        <DetailFact label={S.packages} value={delivery.number_of_packages ?? S.none} />
        <DetailFact label={S.freightCharges} value={money(delivery.freight_charges)} />
        <DetailFact
          label={S.freightPaidBy}
          value={
            delivery.freight_paid_by
              ? (FREIGHT_LABEL[delivery.freight_paid_by] ?? delivery.freight_paid_by)
              : S.none
          }
        />
        <DetailFact
          label={S.deliveryDate}
          value={delivery.delivery_date ? formatIST_date(delivery.delivery_date) : S.none}
        />
        <DetailFact label={S.invoiceAmount} value={money(savedInvoice)} />
      </CardContent>
    </Card>
  );
}
