import type { ReactNode } from "react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";
import { toISTDateKey } from "@shared/lib/date";

import type { RentalAgreement } from "../../api/agreements";
import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { RENTAL_STATUS_LABELS, RENTAL_STATUS_VARIANT } from "../../constants/billing";
import { useAccountBillingClerks } from "../../hooks/accounts/useAccountBillingClerks";
import { isCustomCadence } from "../../lib/cadence";
import { describeCadence, formatRentalDayLong } from "../../lib/format";
import { monthlyRateLabel, shownMonthlyRent, tenureTotal } from "../../lib/monthlyRate";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { rateInputsOf } from "./agreement-detail-helpers";
import { MonthlyRateValue } from "./MonthlyRateValue";

const M = S.summary;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <Typography variant="helper">{label}</Typography>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** The order's cycle, plus how many lines state their own — without that
 *  the stat reads as the whole truth. */
function CadenceStat({ config, overrides }: { config: RentalAgreement; overrides: number }) {
  return (
    <Stat label={M.cadence}>
      <Typography variant="body" truncate>
        {describeCadence(config.billing_type, config.billing_mode, config.custom_days)}
      </Typography>
      {overrides > 0 ? (
        <Typography variant="helper" tone="muted" truncate>
          {S.so.lineOverrides(overrides)}
        </Typography>
      ) : null}
    </Stat>
  );
}

/** Billing day + bill issue day, for a fixed cycle only — a custom cycle has
 *  no month grid, and its interval already reads in the Cycle stat. */
function CycleDayStats({ config }: { config: RentalAgreement }) {
  if (isCustomCadence(config.billing_type)) return null;
  return (
    <>
      <Stat label={M.billingDay}>
        <Typography variant="body">{config.billing_day ?? EMPTY_VALUE}</Typography>
      </Stat>
      <Stat label={M.billIssueDay}>
        <Typography variant="body">{config.bill_issue_day ?? M.onBillingDay}</Typography>
      </Stat>
    </>
  );
}

/** The account's billing clerks — they belong to the account, not the order. */
function ClerksStat({ accountId }: { accountId: string }) {
  const query = useAccountBillingClerks(accountId);
  const names = (query.data?.clerks ?? []).map((c) => c.name).join(", ");
  return (
    <Stat label={M.billingClerks}>
      <Typography variant="body" asChild>
        <TruncatedText value={query.isLoading ? null : names} className="max-w-full" />
      </Typography>
    </Stat>
  );
}

/** The Billings card's summary grid — summary only; the agreement page is one click away. */
export function BillingsCardStats({ detail, config }: { detail: RentalSalesOrderBillingDetail; config: RentalAgreement }) {
  const status = detail.display_status;
  const overrides = (detail.line_cadences ?? []).filter((line) => line.is_override).length;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <Stat label={M.status}>
        {status ? (
          <StatusBadge variant={RENTAL_STATUS_VARIANT[status]}>{RENTAL_STATUS_LABELS[status]}</StatusBadge>
        ) : (
          <Typography variant="body">{EMPTY_VALUE}</Typography>
        )}
      </Stat>
      <Stat label={monthlyRateLabel()}>
        <MonthlyRateValue {...rateInputsOf(detail)} variant="body-strong" />
      </Stat>
      <CadenceStat config={config} overrides={overrides} />
      <CycleDayStats config={config} />
      <ClerksStat accountId={config.account_id} />
      <Stat label={M.period}>
        <Typography variant="body" truncate>
          {S.period(formatRentalDayLong(config.start_date), formatRentalDayLong(config.end_date))}
        </Typography>
      </Stat>
      <Stat label={M.billedThrough}>
        <Typography variant="body">
          {config.last_billed_date ? formatRentalDayLong(config.last_billed_date) : M.notBilledYet}
        </Typography>
      </Stat>
      <Stat label={M.nextInvoice}>
        <Typography variant="body">{formatRentalDayLong(detail.next_invoice_date)}</Typography>
      </Stat>
      <Stat label={M.tenureTotal}>
        <Typography variant="body-strong" numeric>
          {formatINR(
            tenureTotal(shownMonthlyRent(rateInputsOf(detail)), config.start_date, config.end_date),
          )}
        </Typography>
      </Stat>
      {/* Units still out of those provisioned — aggregates, so Alert / Overdue count. */}
      <Stat label={M.units}>
        <Typography variant="body" numeric>
          {S.unitsOnRentOf(detail.devices_on_rent, M.unitsOnRent, detail.device_count)}
        </Typography>
      </Stat>
      {/* BOTH transit legs — the customer pays for neither van journey. */}
      <Stat label={M.transit}>
        <Typography variant="body" truncate>
          {S.joined(M.outboundDays(config.billing_grace_days), M.inboundDays(config.return_grace_days))}
        </Typography>
      </Stat>
      <Stat label={M.approved}>
        <Typography variant="body" truncate>
          {config.approved_at ? formatRentalDayLong(toISTDateKey(config.approved_at)) : M.notApproved}
        </Typography>
      </Stat>
    </div>
  );
}
