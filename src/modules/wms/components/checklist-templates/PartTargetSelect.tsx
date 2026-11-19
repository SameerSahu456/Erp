import { useState } from "react";
import {
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";

import {
  AsyncSelect,
  type AsyncSelectOption,
} from "@/components/ui/async-select";
import {
  usePart,
  usePartsInfinite,
  type CreateChecklistInput, partOptionDescription } from "@modules/ims";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { CHECKLIST_TEMPLATES_STRINGS } from "./checklist-templates.strings";

export function PartTargetSelect({
  control,
  setValue,
  disabled,
}: {
  control: Control<CreateChecklistInput>;
  setValue: UseFormSetValue<CreateChecklistInput>;
  disabled?: boolean;
}) {
  const currentId = useWatch({ control, name: "target_id" });
  const [option, setOption] = useState<AsyncSelectOption | null>(null);

  // In edit mode the form already has the target_id but no label — fetch the
  // part once so the picker trigger shows "part-number · name" instead of a
  // bare placeholder.
  const partQuery = usePart(
    currentId && (!option || option.id !== currentId) ? currentId : "",
  );
  // Sync the picker label from the watched target_id (edit mode carries the id
  // but no label). Render-phase, not an effect (React 19 set-state-in-effect);
  // the `option.id === currentId` guard makes it converge in one extra render.
  if (!currentId) {
    if (option !== null) setOption(null);
  } else if (option?.id !== currentId) {
    setOption(
      partQuery.data
        ? {
            id: partQuery.data.id,
            label: `${partQuery.data.part_number} · ${partQuery.data.name}`,
          }
        : // Stable id-based label while the part is loading.
          { id: currentId, label: currentId.slice(0, 8) },
    );
  }

  return (
    <AsyncSelect
      id="tmpl-target"
      value={option}
      onValueChange={(v) => {
        setOption(v);
        setValue("target_id", v?.id ?? "", {
          shouldValidate: true,
          shouldDirty: true,
        });
      }}
      useOptions={usePartsInfinite}
      toLabel={(p) => `${p.part_number} · ${p.name}`}
      getDescription={partOptionDescription}
      renderValue={(v) => <TruncatedText value={v.label} className="max-w-full" />}
      clearable={false}
      placeholder={CHECKLIST_TEMPLATES_STRINGS.form.fields.partPlaceholder}
      searchPlaceholder={
        CHECKLIST_TEMPLATES_STRINGS.form.fields.partSearchPlaceholder
      }
      disabled={disabled}
    />
  );
}
