import { addDays, addMonths, differenceInCalendarDays, parseISO } from "date-fns";

import type { BillingMode, BillingType, InvoicingMode } from "../api/agreements";
import type { PoInvoicing } from "../api/purchase-orders";
import {
  BILLING_GRACE_MAX,
  BILLING_GRACE_MIN,
  DAY_OF_MONTH_MAX,
  DAY_OF_MONTH_MIN,
} from "../constants/billing";
import { CADENCE_VALIDATION_STRINGS as V } from "./cadence.strings";

/** The editable billing settings both forms share — an account's defaults and
 *  one order's contract (the backend validates them with one rule).
 *
 *  The grace / PO fields are OPTIONAL, not nullable: undefined means "this
 *  form has no such setting", never 0 (0 is a real choice). */
export interface BillingSettings {
  billing_type: BillingType;
  custom_days: number | null;
  billing_day: number | null;
  bill_issue_day: number | null;
  billing_mode: BillingMode;
  /** `null` on an ORDER means "follow the account"; an account never carries null. */
  invoicing_mode: InvoicingMode | null;
  credit_period_days: number | null;
  /** Outbound transit days not charged. ORDER-ONLY. */
  billing_grace_days?: number;
  /** Inbound transit days not charged (`pickup_by='customer'`); on both forms. */
  return_grace_days?: number;
  /** One invoice per period or per PO period. ORDER-ONLY. */
  po_invoicing?: PoInvoicing;
  /** The order runs on the customer's PO, so Extend PO is offered. ORDER-ONLY. */
  po_required?: boolean;
}

/** A custom cadence has no month grid, so neither a billing day nor a bill
 *  issue day — the backend 422s the combination, so the form hides both. */
export function isCustomCadence(billingType: BillingType): boolean {
  return billingType === "custom";
}

/** Switching cadence family CLEARS the field that no longer applies — the DB
 *  CHECK refuses a monthly row with a stale `custom_days`. Switching to custom
 *  on a rental shorter than a month fills in its length. */
export function applyBillingTypeChange(
  value: BillingSettings,
  billing_type: BillingType,
  period?: RentalPeriod,
): BillingSettings {
  if (isCustomCadence(billing_type)) {
    const custom_days = value.custom_days ?? shortPeriodDays(period);
    return { ...value, billing_type, custom_days, billing_day: null, bill_issue_day: null };
  }
  // A fixed cadence must name a billing day; seed the 1st.
  return { ...value, billing_type, custom_days: null, billing_day: value.billing_day ?? 1 };
}

const outOfMonth = (day: number) => day < DAY_OF_MONTH_MIN || day > DAY_OF_MONTH_MAX;

const graceInRange = (days: number) =>
  Number.isInteger(days) && days >= BILLING_GRACE_MIN && days <= BILLING_GRACE_MAX;

function graceProblem(value: BillingSettings): string | null {
  // Each is skipped on a form without that setting (the account has no
  // billing grace).
  if (value.billing_grace_days !== undefined && !graceInRange(value.billing_grace_days)) {
    return V.billingGraceRange(BILLING_GRACE_MIN, BILLING_GRACE_MAX);
  }
  if (value.return_grace_days !== undefined && !graceInRange(value.return_grace_days)) {
    return V.returnGraceRange(BILLING_GRACE_MIN, BILLING_GRACE_MAX);
  }
  return null;
}

/** A rental period, `YYYY-MM-DD` both ends; `end` is the INCLUSIVE last day. */
export interface RentalPeriod {
  start: string | null | undefined;
  end: string | null | undefined;
}

/** The rental's length in days when it is shorter than one month (no monthly
 *  cycle fits it); null for a longer rental or when a date is missing. */
export function shortPeriodDays(period?: RentalPeriod): number | null {
  if (!period?.start || !period.end) return null;
  const start = parseISO(period.start);
  const end = parseISO(period.end);
  if (addMonths(start, 1) <= addDays(end, 1)) return null;
  const days = differenceInCalendarDays(end, start) + 1;
  return days >= 1 ? days : null;
}

/** A rental shorter than a month bills as one custom cycle of its own length,
 *  unless it is already on a custom cycle that fits. Longer rentals are left
 *  as they are. */
export function fitCadenceToPeriod(value: BillingSettings, period?: RentalPeriod): BillingSettings {
  const days = shortPeriodDays(period);
  if (days === null) return value;
  if (isCustomCadence(value.billing_type) && value.custom_days && value.custom_days <= days) {
    return value;
  }
  return { ...value, billing_type: "custom", custom_days: days, billing_day: null, bill_issue_day: null };
}

const CYCLE_MONTHS: Partial<Record<BillingType, number>> = {
  monthly: 1,
  quarterly: 3,
  "half-yearly": 6,
  yearly: 12,
};

/** Mirror of the backend's `billing_cycle_exceeds_period_reason`: a cycle may
 *  be no longer than the period — one full cycle from the start may end on
 *  the last rental day, not after it. No dates, nothing to measure. */
export function cycleExceedsPeriod(value: BillingSettings, period?: RentalPeriod): string | null {
  if (!period?.start || !period.end) return null;
  const start = parseISO(period.start);
  const end = parseISO(period.end);
  const periodDays = differenceInCalendarDays(end, start) + 1;
  if (isCustomCadence(value.billing_type)) {
    return value.custom_days && value.custom_days > periodDays ? V.cycleLongerThanPeriod(periodDays) : null;
  }
  const months = CYCLE_MONTHS[value.billing_type];
  if (!months) return null;
  return addMonths(start, months) > addDays(end, 1) ? V.cycleLongerThanPeriod(periodDays) : null;
}

/** Client mirror of the backend's cadence rule: the first problem, or null.
 *  The DB CHECK stays the authority — this is the early, field-level message.
 *  `period`, when given, also refuses a cycle longer than the rental. */
export function validateCadence(value: BillingSettings, period?: RentalPeriod): string | null {
  if (isCustomCadence(value.billing_type)) {
    if (!value.custom_days || value.custom_days < 1) return V.customDaysRequired;
    return cycleExceedsPeriod(value, period);
  }
  if (!value.billing_day) return V.billingDayRequired;
  if (outOfMonth(value.billing_day)) return V.billingDayRange(DAY_OF_MONTH_MIN, DAY_OF_MONTH_MAX);
  if (value.bill_issue_day != null && outOfMonth(value.bill_issue_day)) {
    return V.billIssueDayRange(DAY_OF_MONTH_MIN, DAY_OF_MONTH_MAX);
  }
  return cycleExceedsPeriod(value, period) ?? graceProblem(value);
}
