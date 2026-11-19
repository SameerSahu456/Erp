import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";
import { SO_STATUS_LABELS, SO_STATUS_VARIANT, type SOStatus } from "@modules/crm";
import { toISTDateKey } from "@shared/lib/date";

import type { RentalAgreement } from "../../api/agreements";
import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { describeCadence, formatRentalDay } from "../../lib/format";
import { monthlyRateLabel, shownMonthlyRent, tenureTotal } from "../../lib/monthlyRate";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { rateInputsOf } from "./agreement-detail-helpers";
import { MonthlyRateValue } from "./MonthlyRateValue";

const F = S.agreement.facts;

/** A `<dt>/<dd>` fact — kept local: the shared `Fact` is not a definition list. */
function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Typography variant="helper" tone="muted" asChild>
        <dt>{label}</dt>
      </Typography>
      <Typography variant="body" className="min-w-0 truncate" asChild>
        <dd>{value ?? EMPTY_VALUE}</dd>
      </Typography>
    </div>
  );
}

function SoStatusLink({ salesOrderId, status }: { salesOrderId: string; status: string | undefined }) {
  if (!status) return <>{EMPTY_VALUE}</>;
  return (
    <Link to={`/crm/sales-orders/${salesOrderId}`} className="hover:opacity-80">
      <StatusBadge variant={SO_STATUS_VARIANT[status as SOStatus] ?? "neutral"}>
        {SO_STATUS_LABELS[status as SOStatus] ?? status}
      </StatusBadge>
    </Link>
  );
}

interface AgreementOverviewTabProps {
  salesOrderId: string;
  soStatus: string | undefined;
  detail: RentalSalesOrderBillingDetail;
  config: RentalAgreement;
}

/** The agreement's facts, all from the one billing payload. */
export function AgreementOverviewTab({ salesOrderId, soStatus, detail, config }: AgreementOverviewTabProps) {
  const rateInputs = rateInputsOf(detail);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{S.agreement.tabs.overview}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label={F.soStatus} value={<SoStatusLink salesOrderId={salesOrderId} status={soStatus} />} />
          <Fact label={F.version} value={config.version} />
          <Fact
            label={F.period}
            value={S.period(formatRentalDay(config.start_date), formatRentalDay(config.end_date))}
          />
          <Fact label={F.cadence} value={describeCadence(config.billing_type, config.billing_mode, config.custom_days)} />
          <Fact label={monthlyRateLabel()} value={<MonthlyRateValue {...rateInputs} />} />
          <Fact label={F.billedThrough} value={formatRentalDay(config.last_billed_date)} />
          <Fact label={F.nextInvoice} value={formatRentalDay(detail.next_invoice_date)} />
          <Fact
            label={F.tenureTotal}
            value={formatINR(tenureTotal(shownMonthlyRent(rateInputs), config.start_date, config.end_date))}
          />
          <Fact label={F.unitsOut} value={S.unitsOut(detail.devices_on_rent, detail.device_count)} />
          <Fact
            label={F.approvedAt}
            value={config.approved_at ? formatRentalDay(toISTDateKey(config.approved_at)) : EMPTY_VALUE}
          />
          <Fact label={F.approvedBy} value={config.approved_by_name ?? EMPTY_VALUE} />
        </dl>
      </CardContent>
    </Card>
  );
}
