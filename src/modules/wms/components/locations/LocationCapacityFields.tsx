import { Controller, useFormState, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useNumberField } from "@/hooks/use-number-field";

import { CAPACITY_MODES, type CapacityMode } from "../../constants";
import type { LocationFormValues } from "../../schemas";
import { FormField } from "../shared/FormField";
import { LOCATIONS_STRINGS } from "./locations.strings";

const F = LOCATIONS_STRINGS.form;

/** Capacity input; a component so the number-field hook runs at top level. */
function CapacityInput({
  value,
  onValueChange,
  disabled,
  invalid,
}: {
  value: number | undefined;
  onValueChange: (next: number) => void;
  disabled: boolean;
  invalid: boolean;
}) {
  const capacityField = useNumberField(Number(value) || 0, onValueChange);
  return <Input {...capacityField} id="loc-capacity" disabled={disabled} aria-invalid={invalid || undefined} />;
}

interface Props {
  form: UseFormReturn<LocationFormValues>;
  capacityMode: CapacityMode | undefined;
}

/** Slot mode + capacity — shown for a direct-storage rack or any bin. */
export function LocationCapacityFields({ form, capacityMode }: Props) {
  const { errors } = useFormState({ control: form.control });
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      <FormField label={F.slotModeLabel} required error={errors.capacity_mode?.message}>
        <div role="radiogroup" className="flex h-10 gap-1 rounded-lg border border-input p-1">
          {CAPACITY_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={capacityMode === mode.value}
              onClick={() => form.setValue("capacity_mode", mode.value, { shouldValidate: true })}
              className={cn(
                "min-w-0 flex-1 rounded-md px-2 transition-colors",
                capacityMode === mode.value ? "bg-info/10 text-info" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <Typography variant="body-sm" tone="inherit" truncate asChild>
                <span>{mode.label}</span>
              </Typography>
            </button>
          ))}
        </div>
      </FormField>
      <FormField
        label={F.capacityLabel}
        required
        htmlFor="loc-capacity"
        error={errors.capacity?.message}
        helper={capacityMode === "single" ? F.capacityHelpSingle : undefined}
      >
        <Controller
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <CapacityInput
              value={field.value}
              onValueChange={field.onChange}
              disabled={capacityMode === "single"}
              invalid={!!errors.capacity}
            />
          )}
        />
      </FormField>
    </div>
  );
}
