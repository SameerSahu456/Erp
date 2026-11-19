import { Controller, useFormState, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import { INDIA_STATES, WAREHOUSE_COUNTRIES } from "../../constants/india-states";
import { SearchableSelect } from "../shared/SearchableSelect";
import { PINCODE_DIGITS_MESSAGE, type WarehouseFormInput } from "../../schemas";
import { WAREHOUSE_FORM_STRINGS } from "./warehouse-form.strings";

const F = WAREHOUSE_FORM_STRINGS.fields;
const PINCODE_LENGTH = 6;

type TextField = "address_line1" | "address_line2" | "city" | "pincode";
type ChoiceField = "state" | "country";

interface Props {
  form: UseFormReturn<WarehouseFormInput>;
}

function TextInput({
  form,
  name,
  id,
  label,
  placeholder,
  required,
}: Props & {
  name: TextField;
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
}) {
  const error = useFormState({ control: form.control, name }).errors[name];
  const isPincode = name === "pincode";
  const field = form.register(name);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <Input
        id={id}
        {...field}
        onChange={(event) => {
          // PIN takes digits only: drop anything else as it is typed, and say why.
          const hadNonDigit = isPincode && /\D/.test(event.target.value);
          if (hadNonDigit) event.target.value = event.target.value.replace(/\D/g, "");
          void field.onChange(event).then(() => {
            if (hadNonDigit) form.setError(name, { type: "pattern", message: PINCODE_DIGITS_MESSAGE });
          });
        }}
        inputMode={isPincode ? "numeric" : undefined}
        maxLength={isPincode ? PINCODE_LENGTH : undefined}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
      />
      {error && (
        <Typography variant="helper" tone="danger">
          {error.message}
        </Typography>
      )}
    </div>
  );
}

/** A fixed, searchable list. A warehouse saved earlier may hold a value outside
 *  it, which stays selectable so opening the form never changes or loses it. */
function ChoiceInput({
  form,
  name,
  id,
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  choices,
}: Props & {
  name: ChoiceField;
  id: string;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  choices: readonly string[];
}) {
  const error = useFormState({ control: form.control, name }).errors[name];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required>
        {label}
      </Label>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => {
          const options =
            field.value && !choices.includes(field.value) ? [field.value, ...choices] : choices;
          return (
            <SearchableSelect
              id={id}
              invalid={!!error}
              options={options.map((option) => ({ value: option, label: option }))}
              value={field.value}
              onChange={field.onChange}
              placeholder={placeholder}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
            />
          );
        }}
      />
      {error && (
        <Typography variant="helper" tone="danger">
          {error.message}
        </Typography>
      )}
    </div>
  );
}

/** Postal address block of the warehouse form. */
export function WarehouseAddressFields({ form }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <TextInput form={form} name="address_line1" id="wh-addr1" {...F.addressLine1} required />
        <TextInput form={form} name="address_line2" id="wh-addr2" {...F.addressLine2} required={false} />
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput form={form} name="city" id="wh-city" {...F.city} required />
        <ChoiceInput form={form} name="state" id="wh-state" {...F.state} choices={INDIA_STATES} />
        <TextInput form={form} name="pincode" id="wh-pincode" {...F.pincode} required />
        <ChoiceInput form={form} name="country" id="wh-country" {...F.country} choices={WAREHOUSE_COUNTRIES} />
      </div>
    </>
  );
}
