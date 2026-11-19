import { Link } from "react-router-dom";
import { Monitor } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";

import type { RentalDevice } from "../../api/devices";
import { formatRentalDay } from "../../lib/format";
import { Fact } from "../shared/Fact";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { deviceBillingStart } from "./device-detail-helpers";

const D = S.deviceDetail;
const F = D.fields;

/** The order this unit belongs to, opened on its rental Agreement page (keyed
 *  by the sales order id) at the LIVE head — a revise after dispatch leaves
 *  the pinned version frozen. */
function SalesOrderLink({ device }: { device: RentalDevice }) {
  return (
    <Link
      to={`/rentals/agreements/${device.live_sales_order_id ?? device.sales_order_id}`}
      className="text-primary underline-offset-4 hover:underline"
    >
      {device.sales_order_number}
    </Link>
  );
}

/** Everything about the unit and where it is in its rental. No icons per
 *  fact: the caption carries the meaning. */
export function DeviceFactsCard({ device }: { device: RentalDevice }) {
  const billingStart = deviceBillingStart(device);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="size-[18px] shrink-0 text-muted-foreground" />
          {D.detailsCard}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label={F.partNumber} value={device.part_number} />
          <Fact label={F.category} value={device.category} />
          <Fact label={F.serialNumber} value={device.serial_number} />
          <Fact label={F.manufacturerSerial} value={device.manufacturer_serial} />
          <Fact label={F.account} value={device.account} />
          <Fact label={F.salesOrder} value={device.sales_order_number ? <SalesOrderLink device={device} /> : null} />
          <Fact label={F.rate} value={formatINR(Number(device.monthly_rate))} />
          <Fact label={F.gst} value={S.detail.gst(Number(device.tax))} />
          <Fact label={F.dispatched} value={formatRentalDay(device.dispatched)} />
          <Fact label={F.delivered} value={formatRentalDay(device.delivered_date)} />
          <Fact label={F.billingStart} value={formatRentalDay(billingStart.date)} hint={billingStart.hint} />
          <Fact label={F.contractEnd} value={formatRentalDay(device.contracted_end_date)} />
          {/* The date chosen on the return request; empty while the unit is out. */}
          <Fact label={F.returnDate} value={formatRentalDay(device.return_date)} />
          <Fact label={F.previouslyBilled} value={formatRentalDay(device.previous_billed_date)} />
          {/* Null once off rent — a settled unit would otherwise read as overdue. */}
          <Fact
            label={F.daysRemaining}
            value={device.days_remaining == null ? null : D.days(device.days_remaining)}
          />
          <Fact label={F.lastHeldDate} value={formatRentalDay(device.last_hold_date)} />
          <Fact label={F.totalHeldDays} value={D.days(device.total_held_days)} />
          <Fact label={F.replacedBy} value={device.replaced_by_label} />
        </div>
      </CardContent>
    </Card>
  );
}
