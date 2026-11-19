import { Controller, type UseFormReturn } from "react-hook-form";

import { CategoryMultiPicker } from "@/components/common/pickers/CategoryMultiPicker";
import { FieldError } from "@/components/common/forms/FieldError";
import { AsyncMultiSelect } from "@/components/ui/async-multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { IMS_SEARCH_MAX_LEN } from "../../constants";
import { useOEMOptions } from "../../hooks/oems/useOEMs";
import { keysOf } from "../../lib/enum-options";
import {
  EXPORT_CONDITION_LABEL,
  EXPORT_FORMAT_LABEL,
  EXPORT_TYPE_LABEL,
} from "../../lib/export-labels";
import type { NewExportValues } from "../../lib/new-export-form";
import { EnumSelect } from "../shared/EnumSelect";
import { WarehousePicker } from "../shared/WarehousePicker";
import { EXPORTS_STRINGS } from "./exports.strings";

const S = EXPORTS_STRINGS.create;
const dirty = { shouldDirty: true } as const;

/** The "New export" fields — type, format and the optional narrowing filters. */
export function NewExportFields({
  form,
  isStock,
}: {
  form: UseFormReturn<NewExportValues>;
  isStock: boolean;
}) {
  const { control, register, setValue, formState } = form;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="ne-type" required>{S.type}</Label>
        <Controller
          control={control}
          name="exportType"
          render={({ field }) => (
            <EnumSelect id="ne-type" value={field.value} options={keysOf(EXPORT_TYPE_LABEL)} labels={EXPORT_TYPE_LABEL} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ne-format" required>{S.format}</Label>
        <Controller
          control={control}
          name="format"
          render={({ field }) => (
            <EnumSelect id="ne-format" value={field.value} options={keysOf(EXPORT_FORMAT_LABEL)} labels={EXPORT_FORMAT_LABEL} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="min-w-0 space-y-1.5 sm:col-span-2">
        <Label htmlFor="ne-category">{S.category}</Label>
        <Controller
          control={control}
          name="categoryIds"
          render={({ field }) => (
            <CategoryMultiPicker id="ne-category" value={field.value} placeholder={S.categoryPlaceholder} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="min-w-0 space-y-1.5 sm:col-span-2">
        <Label htmlFor="ne-oem">{S.oem}</Label>
        <Controller
          control={control}
          name="oems"
          render={({ field }) => (
            <AsyncMultiSelect id="ne-oem" value={field.value} onValueChange={field.onChange} useOptions={useOEMOptions} toLabel={(o) => o.name} placeholder={S.oemPlaceholder} loadOnOpen />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ne-condition">{S.condition}</Label>
        <Controller
          control={control}
          name="condition"
          render={({ field }) => (
            <EnumSelect
              id="ne-condition"
              value={field.value}
              options={keysOf(EXPORT_CONDITION_LABEL)}
              labels={EXPORT_CONDITION_LABEL}
              placeholder={S.anyCondition}
              clearLabel={S.anyCondition}
              onClear={() => field.onChange("")}
              onChange={field.onChange}
            />
          )}
        />
      </div>
      {isStock ? (
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="ne-warehouse">{S.warehouse}</Label>
          <Controller
            control={control}
            name="warehouse"
            render={({ field }) => (
              <WarehousePicker
                id="ne-warehouse"
                value={field.value.id}
                label={field.value.name}
                placeholder={S.allWarehouses}
                clearable
                onChange={(id, name) => setValue("warehouse", { id, name }, dirty)}
              />
            )}
          />
        </div>
      ) : null}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="ne-search">{S.search}</Label>
        <Input id="ne-search" maxLength={IMS_SEARCH_MAX_LEN} placeholder={S.searchPlaceholder} {...register("search")} />
        <FieldError message={formState.errors.search?.message} />
      </div>
    </div>
  );
}
