import {
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { Switch } from "@/components/ui/switch";

import { CHECKLISTS_STRINGS } from "./checklists.strings";
import { type ChecklistFormShape } from "./checklist-items-editor-helpers";

export function NumericConfigAndPreview({
  index,
  control,
  setValue,
}: {
  index: number;
  control: Control<ChecklistFormShape>;
  setValue: UseFormSetValue<ChecklistFormShape>;
}) {
  const integerOnly = useWatch({
    control,
    name: `items.${index}.integer_only`,
  });
  return (
    <div className="space-y-1">
      <Typography asChild variant="caption" className="font-[550] uppercase tracking-[0.06em]">
        <Label>{CHECKLISTS_STRINGS.numericConfig.integerOnlyLabel}</Label>
      </Typography>
      <Typography asChild variant="helper" tone="inherit" className="flex h-10 max-w-xs items-center gap-2 rounded-md border bg-background px-3">
      <label>
        <Switch
          checked={!!integerOnly}
          onCheckedChange={(v) =>
            setValue(`items.${index}.integer_only`, Boolean(v), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          aria-label={CHECKLISTS_STRINGS.numericConfig.integerOnlyAriaLabel}
        />
        <span className="text-muted-foreground">
          {integerOnly ? CHECKLISTS_STRINGS.numericConfig.wholeNumbers : CHECKLISTS_STRINGS.numericConfig.decimalsOk}
        </span>
      </label>
      </Typography>
    </div>
  );
}
