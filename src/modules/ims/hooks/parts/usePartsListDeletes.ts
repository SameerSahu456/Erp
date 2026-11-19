import { useState } from "react";

import { useDeletePart } from "./useParts";
import { useDeleteVariant } from "../variants/useVariants";

export interface PendingPartDelete {
  id: string;
  label: string;
}

export interface PendingVariantDelete {
  partId: string;
  variantId: string;
  label: string;
}

/** Row-level delete state for the Parts listing: which record is pending, plus the mutations. */
export function usePartsListDeletes() {
  const deletePart = useDeletePart();
  const deleteVariant = useDeleteVariant();
  const [pendingPart, setPendingPart] = useState<PendingPartDelete | null>(null);
  const [pendingVariant, setPendingVariant] = useState<PendingVariantDelete | null>(null);

  return {
    deletePart,
    deleteVariant,
    pendingPart,
    pendingVariant,
    requestPartDelete: setPendingPart,
    requestVariantDelete: setPendingVariant,
    closePart: () => setPendingPart(null),
    closeVariant: () => setPendingVariant(null),
    confirmPart: (target: PendingPartDelete) =>
      deletePart.mutate(target.id, { onSuccess: () => setPendingPart(null) }),
    confirmVariant: (target: PendingVariantDelete) =>
      deleteVariant.mutate(target.variantId, { onSuccess: () => setPendingVariant(null) }),
  };
}
