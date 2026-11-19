import { useEffect, useRef } from "react";

import {
  BILLING_MODES,
  BILLING_MODE_LABELS,
  BILLING_TYPES,
  BILLING_TYPE_LABELS,
  DAY_OF_MONTH_MAX,
  DAY_OF_MONTH_MIN,
} from "../../constants/billing";
import { applyBillingTypeChange, isCustomCadence, type RentalPeriod } from "../../lib/cadence";
import { BILLING_COMMON_STRINGS as S } from "./billing-common.strings";
import { CadenceNumberField, CadenceSelectField } from "./CadenceFieldControls";
import { toNumberOrNull, type CadenceFieldGroupProps } from "./cadence-field-utils";

/** Focus the interval box on the TRANSITION into custom only — an order
 *  already saved as custom must not steal focus on every load. */
function useFocusOnCustom(custom: boolean) {
  const ref = useRef<HTMLInputElement>(null);
  const wasCustom = useRef(custom);
  useEffect(() => {
    const justTurnedCustom = custom && !wasCustom.current;
    wasCustom.current = custom;
    if (!justTurnedCustom) return;
    // Deferred a frame: the Select restores focus to its trigger as it closes.
    const raf = requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true });
      ref.current?.select();
    });
    return () => cancelAnimationFrame(raf);
  }, [custom]);
  return ref;
}

/** WHEN a period runs: the cycle, the mode, and the days it turns over on.
 *  Bare fields — the caller supplies the grid. `period`, on an order or line
 *  form, lets a switch to custom fill in a short rental's length. */
export function CadenceScheduleFields({
  value,
  onChange,
  disabled,
  idPrefix,
  period,
}: CadenceFieldGroupProps & { period?: RentalPeriod }) {
  const custom = isCustomCadence(value.billing_type);
  const id = (name: string) => `${idPrefix}-${name}`;
  const customDaysRef = useFocusOnCustom(custom);

  return (
    <>
      <CadenceSelectField
        id={id("billing-type")}
        label={S.fields.billingType}
        required
        labels={BILLING_TYPE_LABELS}
        options={BILLING_TYPES}
        value={value.billing_type}
        onChange={(next) => onChange(applyBillingTypeChange(value, next, period))}
        disabled={disabled}
      />
      <CadenceSelectField
        id={id("billing-mode")}
        label={S.fields.billingMode}
        help={S.fields.billingModeHelp}
        required
        labels={BILLING_MODE_LABELS}
        options={BILLING_MODES}
        value={value.billing_mode}
        onChange={(billing_mode) => onChange({ ...value, billing_mode })}
        disabled={disabled}
      />
      {/* No month grid on a custom cadence, and the backend REJECTS the day
          fields there — so they swap rather than sit disabled. */}
      {custom ? (
        <CadenceNumberField
          inputRef={customDaysRef}
          id={id("custom-days")}
          label={S.fields.customDays}
          help={S.fields.customDaysHelp}
          required
          min={1}
          max={3650}
          value={value.custom_days}
          onChange={(raw) => onChange({ ...value, custom_days: toNumberOrNull(raw) })}
          disabled={disabled}
        />
      ) : (
        <>
          <CadenceNumberField
            id={id("billing-day")}
            label={S.fields.billingDay}
            help={S.fields.billingDayHelp}
            required
            min={DAY_OF_MONTH_MIN}
            max={DAY_OF_MONTH_MAX}
            value={value.billing_day}
            onChange={(raw) => onChange({ ...value, billing_day: toNumberOrNull(raw) })}
            disabled={disabled}
          />
          <CadenceNumberField
            id={id("bill-issue-day")}
            label={S.fields.billIssueDay}
            help={S.fields.billIssueDayHelp}
            min={DAY_OF_MONTH_MIN}
            max={DAY_OF_MONTH_MAX}
            value={value.bill_issue_day}
            onChange={(raw) => onChange({ ...value, bill_issue_day: toNumberOrNull(raw) })}
            disabled={disabled}
          />
        </>
      )}
    </>
  );
}
