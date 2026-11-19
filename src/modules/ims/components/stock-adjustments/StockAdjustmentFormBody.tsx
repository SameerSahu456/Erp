import { useParams } from "react-router-dom";

import { DetailPageShell } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { asUuid } from "@shared/lib/validation";

import { useStockAdjustment } from "../../hooks/stock-adjustments/useStockAdjustments";
import { adjustmentStatusLabel } from "../../lib/stock-adjustment-labels";
import { StockAdjustmentDetailFallback } from "./StockAdjustmentDetailFallback";
import { StockAdjustmentForm } from "./StockAdjustmentForm";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** /new and /:id/edit. Edit is draft-only and creator-only (`can_edit`). */
export function StockAdjustmentFormBody() {
  const { id: rawId } = useParams<{ id: string }>();
  if (rawId === undefined) return <StockAdjustmentForm />;
  return <EditStockAdjustment id={asUuid(rawId) ?? ""} />;
}

function EditStockAdjustment({ id }: { id: string }) {
  const query = useStockAdjustment(id);
  const adjustment = query.data;
  if (!adjustment) return <StockAdjustmentDetailFallback query={query} />;
  if (!adjustment.can_edit) {
    return (
      <DetailPageShell
        title={adjustment.adjustment_number}
        backHref={`/ims/stock-adjustments/${adjustment.id}`}
      >
        <EmptyState
          title={
            adjustment.status === "draft"
              ? S.form.notEditableCreatorOnly
              : S.form.notEditableStatus(adjustmentStatusLabel(adjustment.status))
          }
        />
      </DetailPageShell>
    );
  }
  return <StockAdjustmentForm existing={adjustment} />;
}
