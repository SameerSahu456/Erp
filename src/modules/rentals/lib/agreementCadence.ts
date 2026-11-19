import type { RentalAgreement, RentalAgreementPayload } from "../api/agreements";
import { BILLING_GRACE_DEFAULT, RETURN_GRACE_DEFAULT } from "../constants/billing";
import type { BillingSettings } from "./cadence";

/** What a never-configured order's form starts from. */
export const DEFAULT_AGREEMENT_CADENCE: BillingSettings = {
  billing_type: "monthly",
  custom_days: null,
  billing_day: 1,
  bill_issue_day: null,
  // Pre (in advance) by default since 2026-10-29, matching the backend.
  billing_mode: "pre",
  // NULL is meaningful on an ORDER: follow the account (§5.10).
  invoicing_mode: null,
  credit_period_days: null,
  billing_grace_days: BILLING_GRACE_DEFAULT,
  return_grace_days: RETURN_GRACE_DEFAULT,
  po_invoicing: "multiple",
  po_required: false,
};

/** One agreement version as the editor's shape. */
export function toAgreementCadence(config: RentalAgreement | null): BillingSettings {
  if (!config) return DEFAULT_AGREEMENT_CADENCE;
  return {
    billing_type: config.billing_type,
    custom_days: config.custom_days,
    billing_day: config.billing_day,
    bill_issue_day: config.bill_issue_day,
    billing_mode: config.billing_mode,
    invoicing_mode: config.invoicing_mode,
    credit_period_days: config.credit_period_days,
    billing_grace_days: config.billing_grace_days,
    return_grace_days: config.return_grace_days,
    po_invoicing: config.po_invoicing,
    po_required: config.po_required,
  };
}

/** The configure / amend request. `amendReason` is null for a first configure. */
export function toAgreementPayload(draft: BillingSettings, amendReason: string | null): RentalAgreementPayload {
  return {
    billing_type: draft.billing_type,
    custom_days: draft.custom_days,
    billing_day: draft.billing_day,
    bill_issue_day: draft.bill_issue_day,
    billing_mode: draft.billing_mode,
    invoicing_mode: draft.invoicing_mode,
    credit_period_days: draft.credit_period_days,
    billing_grace_days: draft.billing_grace_days ?? BILLING_GRACE_DEFAULT,
    return_grace_days: draft.return_grace_days ?? RETURN_GRACE_DEFAULT,
    // Always sent: an omitted value defaults to `multiple` and would quietly
    // reset a Single order on amend.
    po_invoicing: draft.po_invoicing ?? "multiple",
    // Omitted leaves the server's value, so a form without the box changes nothing.
    po_required: draft.po_required,
    amend_reason: amendReason,
  };
}
