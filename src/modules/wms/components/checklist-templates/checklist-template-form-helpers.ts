import {
  generateChecklistKey,
  type ChecklistItem,
  type ChecklistItemInput,
} from "@modules/ims";
import { CHECKLIST_TEMPLATE_FORM_STRINGS } from "./checklist-template-form.strings";

// The Inward / Outward QC type list is owned by IMS (shared with the Parts
// checklist form); re-exported so WMS callers keep their import path.
export { CHECKLIST_QC_TYPE_CODES } from "@modules/ims";

export const ASSIGN_LEVELS: { value: "category" | "part"; label: string }[] = [
  {
    value: "category",
    label: CHECKLIST_TEMPLATE_FORM_STRINGS.levelOptions.category,
  },
  { value: "part", label: CHECKLIST_TEMPLATE_FORM_STRINGS.levelOptions.part },
];

export function makeBlankItem(): ChecklistItemInput {
  return {
    key: generateChecklistKey(),
    label: "",
    kind: "text",
    required: true,
    integer_only: false,
  };
}

export function hydrateItems(items: ChecklistItem[]): ChecklistItemInput[] {
  if (!items || items.length === 0) return [makeBlankItem()];
  return items.map((it) => ({
    key: it.key || generateChecklistKey(),
    label: it.label,
    kind: it.kind,
    required: it.required,
    notes: it.notes ?? undefined,
    integer_only: !!it.integer_only,
    min_length: it.min_length ?? undefined,
    max_length: it.max_length ?? undefined,
    min_value: it.min_value ?? undefined,
    max_value: it.max_value ?? undefined,
    options: it.options ?? undefined,
    min_choices: it.min_choices ?? undefined,
    max_choices: it.max_choices ?? undefined,
    min_photos: it.min_photos ?? undefined,
    max_photos: it.max_photos ?? undefined,
  }));
}
