import { type Control, type UseFormSetValue } from "react-hook-form";

import { Typography } from "@/components/ui/typography";

import { type ChecklistItemInput } from "../../schemas";
import { CHECKLISTS_STRINGS } from "./checklists.strings";
import { NumericConfigAndPreview } from "./NumericConfigAndPreview";
import { ChoiceConfigAndPreview } from "./ChoiceConfigAndPreview";
import {
  type UiKind,
  type ChecklistFormShape,
  type ItemErrorMap,
} from "./checklist-items-editor-helpers";

export function KindConfigAndPreview({
  kind,
  uiKind,
  index,
  control,
  setValue,
  errors,
}: {
  kind: ChecklistItemInput["kind"];
  uiKind: UiKind;
  index: number;
  control: Control<ChecklistFormShape>;
  setValue: UseFormSetValue<ChecklistFormShape>;
  errors: ItemErrorMap;
}) {
  if (kind === "photo") {
    return (
      <Typography asChild variant="helper">
        <p>{CHECKLISTS_STRINGS.itemsEditor.mediaLimits}</p>
      </Typography>
    );
  }
  if (kind === "boolean" || kind === "text") return null;
  if (kind === "numeric") {
    return (
      <NumericConfigAndPreview
        index={index}
        control={control}
        setValue={setValue}
      />
    );
  }
  if (kind === "select" || kind === "multi_select") {
    return (
      <ChoiceConfigAndPreview
        kind={kind}
        uiKind={uiKind}
        index={index}
        control={control}
        setValue={setValue}
        errors={errors}
      />
    );
  }
  return null;
}
