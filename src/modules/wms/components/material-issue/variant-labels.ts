import type { VariantListItem } from "@modules/ims";

import { formatCondition } from "../../constants/condition";

// Shared option-label builders for the Material Issue variant pickers — one
// source of truth for the form rows, the add / pull-out sections and the
// pre-filled demand rows.
//
// The option leads with what the operator picks between — the variant name and
// its condition — so variants of one part are told apart at a glance. The parent
// part goes on the option's second line (`variantPartLine`).

/** "<variant name> · <Condition>" — also the label of a pre-filled row. */
export function variantNameWithCondition(v: {
  name: string;
  condition?: string | null;
}): string {
  const cond = v.condition ? ` · ${formatCondition(v.condition)}` : "";
  return `${v.name}${cond}`;
}

/** Variant option with its live availability — for pickers that ISSUE stock
 *  (the operator needs to see how many units are actually available). */
export function variantAvailLabel(v: VariantListItem): string {
  return `${variantNameWithCondition(v)} · ${v.available_stock_qty} avail`;
}

/** Variant option without availability — for pickers that REGISTER stock
 *  (pull-out), where the available count is meaningless. */
export function variantPlainLabel(v: VariantListItem): string {
  return variantNameWithCondition(v);
}

/** The option's second line: which part the variant belongs to. */
export function variantPartLine(v: VariantListItem): string {
  return `${v.part_number} · ${v.part_name}`;
}
