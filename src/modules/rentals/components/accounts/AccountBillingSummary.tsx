import type { ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE } from "@/shared/constants";

import type { AccountBillingSettings } from "../../api/settings";
import { BILLING_MODE_LABELS, BILLING_TYPE_LABELS, INVOICING_MODE_LABELS } from "../../constants/billing";
import { isCustomCadence } from "../../lib/cadence";
import { ACCOUNTS_STRINGS as S } from "./accounts.strings";
import { BILLING_COMMON_STRINGS as B } from "../shared/billing-common.strings";

const L = S.account.labels;

/** One label/value pair in the read-only summary. */
function ReadOnly({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt>
        <Typography variant="helper" tone="muted">
          {label}
        </Typography>
      </dt>
      <dd className="mt-0.5">
        <Typography variant="body-strong">{children}</Typography>
      </dd>
    </div>
  );
}

/** A custom cadence shows its interval instead of the day fields — the same
 *  split the editor makes. */
function CycleDays({ settings }: { settings: AccountBillingSettings }) {
  if (isCustomCadence(settings.billing_type)) {
    return (
      <ReadOnly label={L.customDays}>
        {settings.custom_days != null ? S.days(settings.custom_days) : EMPTY_VALUE}
      </ReadOnly>
    );
  }
  return (
    <>
      <ReadOnly label={L.billingDay}>{settings.billing_day ?? EMPTY_VALUE}</ReadOnly>
      <ReadOnly label={L.issueDay}>{settings.bill_issue_day ?? S.account.onBoundary}</ReadOnly>
    </>
  );
}

/** The account's saved billing defaults, read-only. */
export function AccountBillingSummary({ settings }: { settings: AccountBillingSettings }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      <ReadOnly label={L.cycle}>{BILLING_TYPE_LABELS[settings.billing_type] ?? settings.billing_type}</ReadOnly>
      <ReadOnly label={L.mode}>{BILLING_MODE_LABELS[settings.billing_mode] ?? settings.billing_mode}</ReadOnly>
      <CycleDays settings={settings} />
      <ReadOnly label={L.invoicing}>
        {INVOICING_MODE_LABELS[settings.invoicing_mode] ?? settings.invoicing_mode}
      </ReadOnly>
      <ReadOnly label={L.creditDays}>
        {settings.credit_period_days != null
          ? S.days(settings.credit_period_days)
          : B.noDueDate}
      </ReadOnly>
    </dl>
  );
}
