import { useFormState, useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { CategoryMultiPicker } from "@/components/common/pickers/CategoryMultiPicker";
import { cn } from "@/lib/utils";

import {
  WAREHOUSE_DESCRIPTION_MAX,
  warehouseConditionEnum,
  type WarehouseConditionInput,
  type WarehouseFormInput,
} from "../../schemas";
import { CONDITION_VARIANT, formatCondition } from "../../constants/condition";
import { CountedTextarea } from "../shared/CountedTextarea";
import { WAREHOUSE_FORM_STRINGS } from "./warehouse-form.strings";

// Conditions as flat tree nodes; labels from the shared map (§16.12).
const CONDITION_NODES = warehouseConditionEnum.options.map((code) => ({
  id: code,
  name: formatCondition(code),
  children: [],
}));

const DIRTY_VALIDATE = { shouldValidate: true, shouldDirty: true } as const;
const F = WAREHOUSE_FORM_STRINGS.fields;

interface Props {
  form: UseFormReturn<WarehouseFormInput>;
  isEdit: boolean;
}

/** Name, code and description. */
export function WarehouseIdentityFields({ form, isEdit }: Props) {
  const { register, setValue, control } = form;
  const { errors } = useFormState({ control });
  const description = useWatch({ control, name: "description" });
  const codeHelper = isEdit ? F.code.immutableHelper : F.code.helper;

  return (
    <>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wh-name" required>
            {F.name.label}
          </Label>
          <Input
            id="wh-name"
            {...register("name")}
            placeholder={F.name.placeholder}
            autoFocus
            aria-invalid={errors.name ? "true" : undefined}
          />
          {errors.name ? (
            <Typography variant="helper" tone="danger">{errors.name.message}</Typography>
          ) : (
            <Typography variant="helper">{F.name.helper}</Typography>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-code" required>
            {F.code.label}
          </Label>
          <Input
            id="wh-code"
            {...register("code")}
            placeholder={F.code.placeholder}
            disabled={isEdit}
            className="font-mono"
            aria-invalid={errors.code ? "true" : undefined}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
              setValue("code", e.target.value, DIRTY_VALIDATE);
            }}
          />
          {errors.code ? (
            <Typography variant="helper" tone="danger">{errors.code.message}</Typography>
          ) : (
            <Typography variant="helper">{codeHelper}</Typography>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wh-description">{F.description.label}</Label>
        <CountedTextarea
          id="wh-description"
          {...register("description")}
          value={description ?? ""}
          limit={WAREHOUSE_DESCRIPTION_MAX}
          rows={2}
          placeholder={F.description.placeholder}
          aria-invalid={errors.description ? "true" : undefined}
        />
        {errors.description && (
          <Typography variant="helper" tone="danger">{errors.description.message}</Typography>
        )}
      </div>
    </>
  );
}

/** Categories and stock conditions the warehouse accepts. */
export function WarehouseCapabilityFields({ form }: { form: UseFormReturn<WarehouseFormInput> }) {
  const { setValue, control } = form;
  const { errors } = useFormState({ control });
  const [conditions, categoryIds] = useWatch({ control, name: ["conditions", "category_ids"] });

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wh-categories" required>
            {F.categories.label}
          </Label>
          <CategoryMultiPicker
            id="wh-categories"
            value={categoryIds}
            onChange={(ids) => setValue("category_ids", ids, DIRTY_VALIDATE)}
            placeholder={F.categories.placeholder}
            showChips
            className={cn(errors.category_ids && "border-destructive")}
          />
          {errors.category_ids ? (
            <Typography variant="helper" tone="danger">{errors.category_ids.message}</Typography>
          ) : (
            <Typography variant="helper">{F.categories.helper}</Typography>
          )}
        </div>

        {/* Same tree-style picker as Categories so both look and search identically. */}
        <div className="space-y-1.5">
          <Label htmlFor="wh-conditions" required>
            {F.conditions.label}
          </Label>
          <CategoryMultiPicker
            id="wh-conditions"
            nodes={CONDITION_NODES}
            value={conditions}
            onChange={(codes) =>
              setValue("conditions", codes as WarehouseConditionInput[], DIRTY_VALIDATE)
            }
            nounSingular={F.conditions.nounSingular}
            nounPlural={F.conditions.nounPlural}
            placeholder={F.conditions.placeholder}
            showChips
            className={cn(errors.conditions && "border-destructive")}
            chipVariant={(code) => CONDITION_VARIANT[code] ?? "neutral"}
          />
          {errors.conditions ? (
            <Typography variant="helper" tone="danger">{errors.conditions.message}</Typography>
          ) : (
            <Typography variant="helper">{F.conditions.helper}</Typography>
          )}
        </div>
    </div>
  );
}
