import { DatePicker } from "@/components/common/pickers/DatePicker";

import { formatRentalDayLong } from "../../lib/format";
import { PoField } from "./PoDialogShell";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const P = S.poPeriod;

interface PoPeriodFieldsProps {
  validFrom: string;
  validTo: string;
  onChange: (next: { validFrom: string; validTo: string }) => void;
  /** The order's current end (`YYYY-MM-DD`): the PO may not end before it. */
  orderEnd: string | null;
  idPrefix: string;
  disabled?: boolean;
  /** Required on the configure page; optional in the Record PO dialog. */
  required?: boolean;
}

/** The period printed on the customer's PO. On Configure its end becomes the
 *  order's; on a reference PO (`orderEnd` null) it is the PO's alone. */
export function PoPeriodFields({
  validFrom,
  validTo,
  onChange,
  orderEnd,
  idPrefix,
  disabled,
  required = true,
}: PoPeriodFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PoField label={P.validFrom} htmlFor={`${idPrefix}-valid-from`}>
        <DatePicker
          id={`${idPrefix}-valid-from`}
          value={validFrom}
          onChange={(next) => onChange({ validFrom: next, validTo })}
          max={validTo || undefined}
          clearable
          disabled={disabled}
        />
      </PoField>
      <PoField
        label={P.validTo}
        htmlFor={`${idPrefix}-valid-to`}
        required={required}
        help={orderEnd ? P.validToHelp(formatRentalDayLong(orderEnd)) : P.validToHelpOpen}
      >
        <DatePicker
          id={`${idPrefix}-valid-to`}
          value={validTo}
          onChange={(next) => onChange({ validFrom, validTo: next })}
          min={orderEnd ?? undefined}
          clearable={!required}
          disabled={disabled}
        />
      </PoField>
    </div>
  );
}
