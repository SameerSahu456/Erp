import type { GrnBatchResponse } from "../../../api";
import { CONDITION_LABELS } from "../../../constants/condition";

type BatchCategory = NonNullable<GrnBatchResponse["categories"]>[number];

// "Parent > Category" when the category has a parent; bare name for a
// top-level category (CP-261 #11).
export const categoryLabel = (c: BatchCategory) =>
  c.parent_name ? `${c.parent_name} > ${c.name}` : c.name;

const joinOrDash = (values: string[]) => values.join(", ") || "—";

/** Display text for the batch's catalog rollups (category / brand / condition). */
export function batchRollups(batch: GrnBatchResponse) {
  const categories = batch.categories ?? [];
  return {
    categories,
    categoriesText: joinOrDash(categories.map(categoryLabel)),
    brandsText: joinOrDash((batch.brands ?? []).map((b) => b.name)),
    conditionsText: joinOrDash(
      (batch.conditions ?? []).map((c) => CONDITION_LABELS[c] ?? c),
    ),
  };
}

export function warehouseText(batch: GrnBatchResponse): string {
  // Name only — the warehouse code is internal and not shown here.
  return batch.to_warehouse?.name ?? "—";
}

// Draft / cancelled batches have no receiver (set only at finalize) — fall
// back to who created/staged the batch.
export const receivedByText = (batch: GrnBatchResponse): string =>
  batch.received_by_user?.name ?? batch.created_by_user?.name ?? "—";

export const batchDateIso = (batch: GrnBatchResponse) =>
  batch.closed_at ?? batch.received_at ?? batch.created_at;
