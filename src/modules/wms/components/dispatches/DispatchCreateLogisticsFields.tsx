import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DispatchCreateLogisticsState } from "../../hooks/dispatches/useDispatchCreateLogistics";
import { FormField } from "../shared/FormField";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";
import { DISPATCH_MODES, FREIGHT_PAID_BY } from "./dispatch-detail.strings";
import type { LogisticsForm } from "./dispatch-create-helpers";

type Logi = DispatchCreateLogisticsState;

function TextInput({
  logistics,
  field,
  placeholder,
}: {
  logistics: Logi;
  field: "courier" | "docket_number";
  placeholder: string;
}) {
  return (
    <Input
      value={logistics.logi[field]}
      onChange={(e) => logistics.setL(field, e.target.value)}
      placeholder={placeholder}
    />
  );
}

/** Enum select showing the option LABEL, not its raw value (PAGE-UI §7.2). */
function LabeledSelect({
  logistics,
  field,
  options,
}: {
  logistics: Logi;
  field: keyof Pick<LogisticsForm, "mode" | "freight_paid_by">;
  options: readonly { value: string; label: string }[];
}) {
  const current = logistics.logi[field];
  return (
    <Select value={current} onValueChange={(v) => logistics.setL(field, v ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={S.selectPlaceholder}>
          {options.find((o) => o.value === current)?.label ?? S.selectPlaceholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DispatchCreateLogisticsFields({ logistics }: { logistics: Logi }) {
  const awbInvalid = logistics.awbTouched && !logistics.awbFilled;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FormField
        label={S.awb}
        required
        error={awbInvalid ? S.validation.awbRequired : undefined}
      >
        <Input
          value={logistics.logi.courier_tracking_number}
          onChange={(e) => logistics.setL("courier_tracking_number", e.target.value)}
          onBlur={logistics.touchAwb}
          placeholder={S.awbPlaceholder}
          aria-invalid={awbInvalid}
        />
      </FormField>
      <FormField label={S.courier}>
        <TextInput logistics={logistics} field="courier" placeholder={S.courierPlaceholder} />
      </FormField>
      <FormField label={S.docket}>
        <TextInput logistics={logistics} field="docket_number" placeholder={S.docketPlaceholder} />
      </FormField>
      <FormField label={S.mode}>
        <LabeledSelect logistics={logistics} field="mode" options={DISPATCH_MODES} />
      </FormField>
      <FormField label={S.packages}>
        {/* Whole packages (§3.2/§9). */}
        <Input {...logistics.packagesField} />
      </FormField>
      <FormField label={S.freightCharges}>
        <Input {...logistics.freightChargesField} />
      </FormField>
      <FormField label={S.invoiceAmount}>
        <Input {...logistics.invoiceAmountField} />
      </FormField>
      <FormField label={S.freightPaidBy}>
        <LabeledSelect logistics={logistics} field="freight_paid_by" options={FREIGHT_PAID_BY} />
      </FormField>
    </div>
  );
}
