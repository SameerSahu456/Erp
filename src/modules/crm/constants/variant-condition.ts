// Domain label map (Coding-guideline §16.12 bucket 2): how an IMS variant
// `condition` wire value is shown when picking a line item. Part names collide
// across conditions (the same part exists as new / refurbished / new_pull), so
// the CRM demo + sales-order line pickers surface the condition to disambiguate.
export const VARIANT_CONDITION_LABELS: Record<string, string> = {
  new: "New",
  refurbished: "Refurbished",
  new_pull: "New Pull",
}

// Falls back to the raw wire value for any unmapped condition rather than
// hiding it — an unknown condition is still better shown than dropped.
export function variantConditionLabel(condition: string | null | undefined): string {
  if (!condition) return ""
  return VARIANT_CONDITION_LABELS[condition] ?? condition
}
