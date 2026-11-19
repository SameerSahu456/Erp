import { Controller } from "react-hook-form";

import { FieldError } from "@/components/common/forms/FieldError";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { SectionCard } from "@modules/wms";

import type { StockAdjustmentFormState } from "../../hooks/stock-adjustments/useStockAdjustmentForm";
import {
  OTHER_REASON_NOTES_MIN,
  STOCK_ADJUSTMENT_REASON_LABEL,
  STOCK_ADJUSTMENT_REASONS,
} from "../../lib/stock-adjustment-labels";
import { WarehousePicker } from "../shared/WarehousePicker";
import { EnumSelect } from "../shared/EnumSelect";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Header: warehouse, reason, notes (D2, D3). */
export function AdjustmentHeaderFields({ state }: { state: StockAdjustmentFormState }) {
  const { form, reason, warehouseId, warehouseName, changeWarehouse, changeReason } = state;
  const errors = form.formState.errors;
  return (
    <SectionCard title={S.form.header} description={S.form.headerDescription}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="sa-warehouse" required>{S.form.warehouse}</Label>
          <WarehousePicker
            id="sa-warehouse"
            value={warehouseId}
            label={warehouseName}
            onChange={changeWarehouse}
          />
          <FieldError message={errors.warehouseId?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sa-reason" required>{S.form.reason}</Label>
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <EnumSelect
                id="sa-reason"
                value={field.value}
                options={STOCK_ADJUSTMENT_REASONS}
                labels={STOCK_ADJUSTMENT_REASON_LABEL}
                placeholder={S.form.reasonPlaceholder}
                // Also moves any line the new reason doesn't allow (D3).
                onChange={changeReason}
              />
            )}
          />
          <FieldError message={errors.reason?.message} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="sa-notes" required>{S.form.notes}</Label>
          <Textarea id="sa-notes" rows={3} placeholder={S.form.notesPlaceholder} {...form.register("notes")} />
          {reason === "other" ? (
            <Typography variant="helper" tone="muted">{S.form.notesOtherHint(OTHER_REASON_NOTES_MIN)}</Typography>
          ) : null}
          <FieldError message={errors.notes?.message} />
        </div>
      </div>
    </SectionCard>
  );
}
