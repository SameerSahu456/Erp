import { Eye, Loader2 } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import { useStockAdjustmentLinePreview } from "../../hooks/stock-adjustments/useStockAdjustmentLinePreview";
import { isPositiveInt, toLineInput, type StockAdjustmentForm } from "../../lib/stock-adjustment-form";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";
import { UnitSerialList } from "./UnitSerialList";
import { WhyDisabled } from "./WhyDisabled";

/** "Preview units" for a remove-by-count line: which serials the system would
 *  take right now (D5). The pick is only pinned at submit. */
export function LineUnitsPreview({ index }: { index: number }) {
  const form = useFormContext<StockAdjustmentForm>();
  const [warehouseId, variantId, quantity] = useWatch({
    control: form.control,
    name: ["warehouseId", `lines.${index}.variantId`, `lines.${index}.quantity`],
  });
  const preview = useStockAdjustmentLinePreview();
  // A result shows only while it answers the inputs on screen — no stale list.
  const asked = preview.variables;
  const current =
    asked?.warehouse_id === warehouseId &&
    asked.line.part_variant_id === variantId &&
    asked.line.quantity === Number(quantity);
  const result = current ? preview.data : undefined;
  let blocker: string | null = null;
  if (!warehouseId) blocker = S.line.pickWarehouseFirst;
  else if (!variantId || !isPositiveInt(quantity)) blocker = S.line.previewNeedsInput;

  return (
    <div className="space-y-2">
      <WhyDisabled reason={blocker}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!blocker || preview.isPending}
          onClick={() =>
            preview.mutate({ warehouse_id: warehouseId, line: toLineInput(form.getValues(`lines.${index}`)) })
          }
        >
          {preview.isPending ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
          ) : (
            <Eye className="mr-1.5 size-3.5" aria-hidden />
          )}
          {S.line.preview}
        </Button>
      </WhyDisabled>
      {result ? (
        <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
          <Typography variant="caption" tone="muted">
            {S.line.previewTitle}
          </Typography>
          {result.issues.map((issue) => (
            <Typography key={`${issue.code}-${issue.message}`} variant="body-sm" tone="danger">
              {issue.message}
            </Typography>
          ))}
          {result.units.length > 0 ? (
            <UnitSerialList units={result.units} />
          ) : (
            <Typography variant="body-sm" tone="muted">
              {S.line.previewEmpty}
            </Typography>
          )}
        </div>
      ) : null}
    </div>
  );
}
