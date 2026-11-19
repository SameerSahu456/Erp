import { BILLING_MODE_LABELS, BILLING_TYPE_LABELS, INVOICING_MODE_LABELS } from "../../constants/billing";
import { isCustomCadence, type BillingSettings } from "../../lib/cadence";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const C = S.configure;

/** The cadence as one line — "Monthly · Post (arrears) · day 1 · 30-day
 *  credit" — for the save bar and each past version. */
export function cadenceSummary(value: BillingSettings): string {
  const custom = isCustomCadence(value.billing_type);
  const parts = [
    custom && value.custom_days ? C.everyDays(value.custom_days) : BILLING_TYPE_LABELS[value.billing_type],
    BILLING_MODE_LABELS[value.billing_mode],
  ];
  if (!custom && value.billing_day) parts.push(C.onDay(value.billing_day));
  if (value.invoicing_mode) parts.push(INVOICING_MODE_LABELS[value.invoicing_mode]);
  if (value.credit_period_days) parts.push(C.creditDays(value.credit_period_days));
  return S.joined(...parts);
}

/** Back to whichever surface was left; a deep link goes to the order's page. */
export function configureBackHref(from: string | null, salesOrderId: string | null): string {
  if (from === "rentals" || !salesOrderId) return "/rentals/sales-orders";
  return `/crm/sales-orders/${salesOrderId}`;
}
