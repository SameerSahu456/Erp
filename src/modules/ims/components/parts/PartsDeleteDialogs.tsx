import { DeleteWithPreconditionsDialog } from "../shared/DeleteWithPreconditionsDialog";
import { usePart } from "../../hooks/parts/useParts";
import { useVariant } from "../../hooks/variants/useVariants";
import type { PendingPartDelete, PendingVariantDelete } from "../../hooks/parts/usePartsListDeletes";
import { PARTS_STRINGS } from "./parts.strings";

const DV = PARTS_STRINGS.deleteVariant;
const DP = PARTS_STRINGS.deletePart;

interface DialogProps<T> {
  pending: T | null;
  onClose: () => void;
  isPending: boolean;
  onConfirm: (target: T) => void;
}

// Flat rows carry no stock rollup / variant_count, so each dialog lazily
// refetches the full record by id (gated on a truthy id) for its preconditions.

/** Backend guard: `delete_variant()` 409s while any stock is linked. */
export function DeleteVariantDialog({ pending, onClose, isPending, onConfirm }: DialogProps<PendingVariantDelete>) {
  const variantQuery = useVariant(pending?.variantId ?? "");
  const stockQty = Number(variantQuery.data?.available_qty ?? 0);
  return (
    <DeleteWithPreconditionsDialog
      open={pending != null}
      onOpenChange={(o) => !o && onClose()}
      title={DV.title}
      // The variant NAME (from the full record), matching the detail-page delete.
      entityName={variantQuery.data?.name ?? pending?.label ?? ""}
      description={DV.description}
      preconditions={
        pending
          ? [
              {
                satisfied: stockQty === 0,
                loading: variantQuery.isLoading,
                label: DV.preconditionLabel,
                detail: stockQty > 0 ? DV.stockLinkedDetail(stockQty) : undefined,
              },
            ]
          : []
      }
      isPending={isPending}
      confirmLabel={DV.confirmLabel}
      onConfirm={() => {
        if (pending) onConfirm(pending);
      }}
    />
  );
}

/** Backend guards: variant_count ≤ 1, and no stock on the sole default variant. */
export function DeletePartDialog({ pending, onClose, isPending, onConfirm }: DialogProps<PendingPartDelete>) {
  const partQuery = usePart(pending?.id ?? "");
  const variantCount = partQuery.data?.variant_count ?? 0;
  const stockQty = Number(partQuery.data?.available_stock_qty ?? 0);
  return (
    <DeleteWithPreconditionsDialog
      open={pending != null}
      onOpenChange={(o) => !o && onClose()}
      title={DP.title}
      entityName={partQuery.data?.name ?? pending?.label ?? ""}
      description={DP.description}
      preconditions={
        pending
          ? [
              {
                satisfied: variantCount <= 1,
                loading: partQuery.isLoading,
                label: DP.precondition1Label,
                detail: variantCount > 1 ? DP.precondition1Detail(variantCount) : undefined,
              },
              {
                satisfied: stockQty === 0,
                loading: partQuery.isLoading,
                label: DP.precondition2Label,
                detail: stockQty > 0 ? DP.precondition2Detail(stockQty) : undefined,
              },
            ]
          : []
      }
      isPending={isPending}
      confirmLabel={DP.confirmLabel}
      onConfirm={() => {
        if (pending) onConfirm(pending);
      }}
    />
  );
}
