import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";
import { toISTDateKey } from "@shared/lib/date";

import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { RENTAL_STATUS_LABELS, RENTAL_STATUS_VARIANT } from "../../constants/billing";
import { formatRentalDay } from "../../lib/format";
import { monthlyRateLabel, shownMonthlyRent, tenureTotal } from "../../lib/monthlyRate";
import { Fact } from "../shared/Fact";
import { SectionHeader } from "../shared/SectionHeader";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { rateInputsOf } from "./agreement-detail-helpers";
import { MonthlyRateValue } from "./MonthlyRateValue";

const C = S.configure;

export interface ConfigureOrderFacts {
  salesOrderId: string;
  orderNumber: string | null;
  accountName: string | null;
  /** Stands in for the agreement's order date until one is configured. */
  orderCreatedAt: string | null;
}

function RentalStatus({ status }: { status: RentalSalesOrderBillingDetail["display_status"] }) {
  // No agreement yet — this form is what creates it.
  if (!status) return <StatusBadge variant="warning">{S.list.toConfigure}</StatusBadge>;
  return <StatusBadge variant={RENTAL_STATUS_VARIANT[status]}>{RENTAL_STATUS_LABELS[status]}</StatusBadge>;
}

/** The order's read-only figures — the reason this is a page, not a dialog. */
export function ConfigureOrderFactsCard({ facts, detail }: { facts: ConfigureOrderFacts; detail: RentalSalesOrderBillingDetail }) {
  const config = detail.config;
  const rateInputs = rateInputsOf(detail);
  return (
    <Card>
      <SectionHeader icon={FileText} title={C.orderTitle} subtitle={C.orderSubtitle} />
      <CardContent>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          <Fact
            label={C.orderNumber}
            value={
              facts.orderNumber ? (
                <Link
                  to={`/crm/sales-orders/${facts.salesOrderId}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {facts.orderNumber}
                </Link>
              ) : null
            }
          />
          <Fact label={C.account} value={facts.accountName} />
          <Fact label={S.summary.status} value={<RentalStatus status={detail.display_status} />} />
          <Fact
            label={S.fields.orderDate}
            value={formatRentalDay(config?.order_date ?? toISTDateKey(facts.orderCreatedAt))}
          />
          <Fact
            label={S.summary.period}
            value={S.period(formatRentalDay(config?.start_date), formatRentalDay(config?.end_date))}
          />
          {/* Before any unit ships the live rate is 0; the SO's Σ qty × rate is what was agreed. */}
          <Fact label={monthlyRateLabel()} value={<MonthlyRateValue {...rateInputs} />} />
          <Fact label={S.summary.units} value={C.unitsOf(detail.devices_on_rent, detail.device_count)} />
          <Fact
            label={S.summary.billedThrough}
            value={config?.last_billed_date ? formatRentalDay(config.last_billed_date) : S.summary.notBilledYet}
          />
          <Fact label={S.summary.nextInvoice} value={formatRentalDay(detail.next_invoice_date)} />
          <Fact
            label={S.summary.tenureTotal}
            value={formatINR(tenureTotal(shownMonthlyRent(rateInputs), config?.start_date, config?.end_date))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
