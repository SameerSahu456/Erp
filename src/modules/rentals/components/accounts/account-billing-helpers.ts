import type { AccountBillingSettings, AccountBillingSettingsPayload } from "../../api/settings";
import { RETURN_GRACE_DEFAULT } from "../../constants/billing";
import type { BillingSettings } from "../../lib/cadence";

/** The stored row as the editor's shape. Return grace renders on the account
 *  form too — a customer's courier time belongs to the customer. */
export function toAccountCadence(settings: AccountBillingSettings): BillingSettings {
  return {
    billing_type: settings.billing_type,
    custom_days: settings.custom_days,
    billing_day: settings.billing_day,
    bill_issue_day: settings.bill_issue_day,
    billing_mode: settings.billing_mode,
    invoicing_mode: settings.invoicing_mode,
    credit_period_days: settings.credit_period_days,
    return_grace_days: settings.return_grace_days,
  };
}

export function toAccountPayload(value: BillingSettings): AccountBillingSettingsPayload {
  return {
    billing_type: value.billing_type,
    custom_days: value.custom_days,
    // An account is the BOTTOM of the invoicing-mode chain, so never null.
    invoicing_mode: value.invoicing_mode ?? "per-so",
    billing_day: value.billing_day,
    bill_issue_day: value.bill_issue_day,
    billing_mode: value.billing_mode,
    credit_period_days: value.credit_period_days,
    // Required by the upsert schema; fall back to the backend default.
    return_grace_days: value.return_grace_days ?? RETURN_GRACE_DEFAULT,
  };
}
