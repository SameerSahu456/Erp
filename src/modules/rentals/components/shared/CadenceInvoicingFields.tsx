import { Checkbox } from "@/components/ui/checkbox";
import { Typography } from "@/components/ui/typography";

import {
  BILLING_GRACE_MAX,
  BILLING_GRACE_MIN,
  INVOICING_MODES,
  INVOICING_MODE_LABELS,
  PO_INVOICING_LABELS,
  PO_INVOICING_MODES,
} from "../../constants/billing";
import { BILLING_COMMON_STRINGS as S } from "./billing-common.strings";
import { CadenceNumberField, CadenceSelectField } from "./CadenceFieldControls";
import { toNumberOrNull, toNumberOrZero, type CadenceFieldGroupProps } from "./cadence-field-utils";

export interface CadenceInvoicingFieldsProps extends CadenceFieldGroupProps {
  /** Whose terms these are — only picks the help text. The account's mode is
   *  seeded into an order's field rather than offering "Follow account". */
  scope?: "account" | "order";
  /** The order is on a PO (in force, awaited or pending), so PO Required
   *  cannot be cleared — the server refuses it. */
  poRequiredLocked?: boolean;
}

/** HOW a closed period is invoiced: one invoice or many, the credit period,
 *  and the transit grace. Bare fields — the caller supplies the grid. */
export function CadenceInvoicingFields({
  value,
  onChange,
  disabled,
  idPrefix,
  scope = "account",
  poRequiredLocked = false,
}: CadenceInvoicingFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <CadenceSelectField
        id={id("invoicing-mode")}
        label={S.fields.invoicingMode}
        help={scope === "order" ? S.fields.invoicingModeHelpSo : S.fields.invoicingModeHelpAccount}
        placeholder={S.fields.invoicingModePlaceholder}
        labels={INVOICING_MODE_LABELS}
        options={INVOICING_MODES}
        value={value.invoicing_mode}
        onChange={(invoicing_mode) => onChange({ ...value, invoicing_mode })}
        disabled={disabled}
      />
      {/* Order forms only — an account has no PO. */}
      {value.po_required === undefined ? null : (
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={id("po-required")} className="flex items-center gap-2">
            <Checkbox
              id={id("po-required")}
              checked={value.po_required}
              onCheckedChange={(checked) => onChange({ ...value, po_required: checked === true })}
              disabled={disabled || (poRequiredLocked && value.po_required)}
            />
            <Typography variant="body">{S.fields.poRequired}</Typography>
          </label>
          <Typography variant="helper">
            {poRequiredLocked ? S.fields.poRequiredLocked : S.fields.poRequiredHelp}
          </Typography>
        </div>
      )}
      {/* PO Invoicing only matters once the order runs on a PO. */}
      {value.po_invoicing === undefined || value.po_required === false ? null : (
        <CadenceSelectField
          id={id("po-invoicing")}
          label={S.fields.poInvoicing}
          help={S.fields.poInvoicingHelp}
          labels={PO_INVOICING_LABELS}
          options={PO_INVOICING_MODES}
          value={value.po_invoicing}
          onChange={(po_invoicing) => onChange({ ...value, po_invoicing })}
          disabled={disabled}
        />
      )}
      <CadenceNumberField
        id={id("credit-period")}
        label={S.fields.creditPeriod}
        help={S.fields.creditPeriodHelp}
        min={0}
        max={3650}
        value={value.credit_period_days}
        onChange={(raw) => onChange({ ...value, credit_period_days: toNumberOrNull(raw) })}
        disabled={disabled}
      />
      {/* Order forms only — an account has no grace column. Never null: an
          empty box means 0, a real setting. */}
      {value.billing_grace_days === undefined ? null : (
        <CadenceNumberField
          id={id("billing-grace")}
          label={S.grace.label}
          help={S.grace.help}
          min={BILLING_GRACE_MIN}
          max={BILLING_GRACE_MAX}
          value={value.billing_grace_days}
          onChange={(raw) => onChange({ ...value, billing_grace_days: toNumberOrZero(raw) })}
          disabled={disabled}
        />
      )}
      {/* Both forms — a customer's courier time is set on the account and
          inherited by its orders. Never null: empty means 0. */}
      {value.return_grace_days === undefined ? null : (
        <CadenceNumberField
          id={id("return-grace")}
          label={S.returnGrace.label}
          help={S.returnGrace.help}
          min={BILLING_GRACE_MIN}
          max={BILLING_GRACE_MAX}
          value={value.return_grace_days}
          onChange={(raw) => onChange({ ...value, return_grace_days: toNumberOrZero(raw) })}
          disabled={disabled}
        />
      )}
    </>
  );
}
