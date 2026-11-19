import { CHECKLIST_TEMPLATES_STRINGS } from "./checklist-templates.strings";

const L = CHECKLIST_TEMPLATES_STRINGS.list;

export type ChecklistTypeVariant = "success" | "warning" | "info" | "neutral" | "error";

// Badge colour per checklist type_code (lower-cased at lookup).
const TYPE_VARIANT: Record<string, ChecklistTypeVariant> = {
  inward_qc: "info",
  outward_qc: "success",
  inspection: "warning",
  repair: "error",
  paint: "neutral",
};

export function checklistTypeVariant(typeCode: string): ChecklistTypeVariant {
  return TYPE_VARIANT[typeCode.toLowerCase()] ?? "neutral";
}

// Unsorted → newest first, not the backend's name-asc default (§1/§7.3).
export const CHECKLIST_DEFAULT_SORT = "-created_at";

// Only `name` is sortable; item count is derived and the API can't order by it.
export const CHECKLIST_SORT_FIELD_MAP: Readonly<Record<string, string>> = { name: "name" };

// Type is driven by the tab selector. Active = the row switch (deactivate
// instead of delete).
export const CHECKLIST_COLUMNS = [
  { key: "name", label: L.columns.name, sortable: true },
  { key: "type", label: L.columns.type },
  { key: "assignedTo", label: L.columns.assignedTo },
  { key: "itemCount", label: L.columns.items, align: "right" as const },
  { key: "active", label: L.columns.active },
  { key: "actions", label: L.columns.actions, align: "right" as const, width: "120px" },
];
