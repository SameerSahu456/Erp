import { ListPlus, Plus } from "lucide-react";

import { FieldError } from "@/components/common/forms/FieldError";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { SectionCard } from "@modules/wms";

import type { StockAdjustmentFormState } from "../../hooks/stock-adjustments/useStockAdjustmentForm";
import { AdjustmentLineRow } from "./AdjustmentLineRow";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** The line grid: one card per line, add / remove. */
export function AdjustmentLinesEditor({
  state,
  importAction,
}: {
  state: StockAdjustmentFormState;
  importAction?: React.ReactNode;
}) {
  const { lines, addLine, removeLine, form, serverErrors } = state;
  const rootError = form.formState.errors.lines?.root?.message ?? form.formState.errors.lines?.message;
  return (
    <SectionCard
      title={S.form.lines}
      description={S.form.linesDescription}
      contentClassName="space-y-3"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {importAction}
          <Button type="button" onClick={addLine}>
            <Plus className="mr-1.5 size-4" />
            {S.form.addLine}
          </Button>
        </div>
      }
    >
      {lines.fields.length === 0 ? (
        <EmptyState icon={ListPlus} title={S.form.noLines} description={S.form.noLinesHelper} />
      ) : null}
      {lines.fields.map((field, index) => (
        <AdjustmentLineRow
          key={field.id}
          index={index}
          serverErrors={serverErrors.byLine[index]}
          onRemove={() => removeLine(index)}
        />
      ))}
      <FieldError message={rootError} />
    </SectionCard>
  );
}
