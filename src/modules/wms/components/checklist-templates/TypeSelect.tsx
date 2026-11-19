import {
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  type CreateChecklistInput,
} from "@modules/ims";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { CHECKLIST_TEMPLATES_STRINGS } from "./checklist-templates.strings";

export function TypeSelect({
  control,
  setValue,
  types,
  disabled,
}: {
  control: Control<CreateChecklistInput>;
  setValue: UseFormSetValue<CreateChecklistInput>;
  types: { code: string; label: string }[];
  disabled?: boolean;
}) {
  const value = useWatch({ control, name: "type_code" });
  return (
    <Select
      value={value || undefined}
      onValueChange={(v) =>
        setValue("type_code", v ?? "", {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
      disabled={disabled}
    >
      {/* Chevron only (no ×): pick another type to change it. */}
      <SelectTrigger id="tmpl-type" className="w-full" clearable={false}>
        {value ? (
          <TruncatedText
            value={types.find((t) => t.code === value)?.label ?? value}
            className="max-w-full"
          />
        ) : (
          <span className="text-muted-foreground">
            {CHECKLIST_TEMPLATES_STRINGS.form.fields.typeSelectPlaceholder}
          </span>
        )}
      </SelectTrigger>
      <SelectContent>
        {types.map((t) => (
          <SelectItem key={t.code} value={t.code}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
