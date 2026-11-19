import { CadenceInvoicingFields, type CadenceInvoicingFieldsProps } from "./CadenceInvoicingFields";
import { CadenceScheduleFields } from "./CadenceScheduleFields";

/** The whole cadence editor in one grid — schedule then invoicing. Used where
 *  the terms are a SECTION of a larger surface (the account Billings tab); the
 *  Configure page renders the halves as separate cards. Purely controlled. */
export function BillingCadenceFields({
  value,
  onChange,
  disabled,
  scope = "account",
  idPrefix,
}: CadenceInvoicingFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CadenceScheduleFields value={value} onChange={onChange} disabled={disabled} idPrefix={idPrefix} />
      <CadenceInvoicingFields
        value={value}
        onChange={onChange}
        disabled={disabled}
        idPrefix={idPrefix}
        scope={scope}
      />
    </div>
  );
}
