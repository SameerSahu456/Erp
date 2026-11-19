import { useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { CategoryPicker } from "@/components/common/pickers/CategoryPicker";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import type { CreateChecklistInput } from "@modules/ims";

import { CHECKLIST_TEMPLATES_STRINGS } from "./checklist-templates.strings";
import { ASSIGN_LEVELS } from "./checklist-template-form-helpers";
import { TypeSelect } from "./TypeSelect";
import { PartTargetSelect } from "./PartTargetSelect";

const S = CHECKLIST_TEMPLATES_STRINGS.form;
const DIRTY_VALIDATE = { shouldValidate: true, shouldDirty: true } as const;

interface Props {
  form: UseFormReturn<CreateChecklistInput>;
  isEdit: boolean;
  typesLoading: boolean;
  activeTypes: { code: string; label: string }[];
}

/** "Template details" card — name, type, assign-to level and target. */
export function ChecklistTemplateDetailsCard({ form, isEdit, typesLoading, activeTypes }: Props) {
  const { control, register, setValue, formState } = form;
  const errors = formState.errors;
  const targetType = useWatch({ control, name: "target_type" });
  const targetId = useWatch({ control, name: "target_id" });
  const levelLabel =
    ASSIGN_LEVELS.find((l) => l.value === targetType)?.label ?? S.fields.levelFallback;

  const onLevelChange = (v: string | null) => {
    const next = (v ?? "category") as "category" | "part";
    setValue("target_type", next, DIRTY_VALIDATE);
    // Clear the dependent target_id whenever the level flips so the user
    // can't submit a part id under category, etc.
    setValue("target_id", "", DIRTY_VALIDATE);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.cards.templateDetails}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-name" required>
              {S.fields.nameLabel}
            </Label>
            <Input
              id="tmpl-name"
              placeholder={S.fields.namePlaceholder}
              {...register("name")}
              aria-invalid={errors.name ? "true" : undefined}
              // Name stays editable in both modes, so focus lands here.
              autoFocus
            />
            {errors.name && (
              <Typography variant="helper" tone="danger">
                {errors.name.message}
              </Typography>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tmpl-type" required>
              {S.fields.typeLabel}
            </Label>
            <TypeSelect
              control={control}
              setValue={setValue}
              disabled={typesLoading || isEdit}
              types={activeTypes}
            />
            {errors.type_code && (
              <Typography variant="helper" tone="danger">
                {errors.type_code.message}
              </Typography>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tmpl-level" required>
              {S.fields.levelLabel}
            </Label>
            <Select value={targetType} onValueChange={onLevelChange} disabled={isEdit}>
              <SelectTrigger id="tmpl-level" className="w-full" clearable={false}>
                <TruncatedText value={levelLabel} className="max-w-full" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGN_LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tmpl-target" required>
              {S.fields.targetLabel}
            </Label>
            {targetType === "category" ? (
              <CategoryPicker
                id="tmpl-target"
                value={targetId ?? ""}
                onChange={(v) => setValue("target_id", v ?? "", DIRTY_VALIDATE)}
                placeholder={S.fields.categoryPlaceholder}
                clearable={false}
                disabled={isEdit}
                // A new checklist target should be an active category; edit
                // mode disables the picker (target is immutable).
                isActive
              />
            ) : (
              <PartTargetSelect control={control} setValue={setValue} disabled={isEdit} />
            )}
            {errors.target_id && (
              <Typography variant="helper" tone="danger">
                {errors.target_id.message}
              </Typography>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
