import { Trash2 } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { FieldError } from "@/components/common/forms/FieldError";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import { setLineDirection, type StockAdjustmentForm } from "../../lib/stock-adjustment-form";
import {
  DIRECTION_KINDS,
  REASON_DIRECTIONS,
  STOCK_ADJUSTMENT_DIRECTION_LABEL,
  STOCK_ADJUSTMENT_DIRECTIONS,
  STOCK_ADJUSTMENT_KIND_LABEL,
} from "../../lib/stock-adjustment-labels";
import type { StockAdjustmentDirection } from "../../stock-adjustments.api";
import { EnumSelect } from "../shared/EnumSelect";
import { LineIdentityFields } from "./LineIdentityFields";
import { LinePlacementFields } from "./LinePlacementFields";
import { LineUnitsPreview } from "./LineUnitsPreview";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** One editable line of the adjustment grid. Reads the form from context so
 *  only this row re-renders on its own edits. */
export function AdjustmentLineRow({
  index,
  serverErrors,
  onRemove,
}: {
  index: number;
  serverErrors: string[] | undefined;
  onRemove: () => void;
}) {
  const form = useFormContext<StockAdjustmentForm>();
  const [reason, direction, kind] = useWatch({
    control: form.control,
    name: ["reason", `lines.${index}.direction`, `lines.${index}.kind`],
  });
  const errors = form.formState.errors.lines?.[index];
  const idp = `sa-line-${index}`;
  const allowed = reason ? REASON_DIRECTIONS[reason] : STOCK_ADJUSTMENT_DIRECTIONS;

  const changeDirection = (next: StockAdjustmentDirection) => setLineDirection(form, index, next);

  return (
    // A bordered panel, not a Card — it already sits inside the Lines step card.
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="subsection-title">{S.line.title(index + 1)}</Typography>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={S.line.remove} onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}-direction`} required>{S.line.direction}</Label>
          <EnumSelect
            id={`${idp}-direction`}
            value={direction}
            options={STOCK_ADJUSTMENT_DIRECTIONS}
            labels={STOCK_ADJUSTMENT_DIRECTION_LABEL}
            isDisabled={(d) => !allowed.includes(d)}
            onChange={changeDirection}
          />
          <FieldError message={errors?.direction?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}-kind`} required>{S.line.kind}</Label>
          <Controller
            control={form.control}
            name={`lines.${index}.kind`}
            render={({ field }) => (
              <EnumSelect
                id={`${idp}-kind`}
                value={field.value}
                options={DIRECTION_KINDS[direction]}
                labels={STOCK_ADJUSTMENT_KIND_LABEL}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <LineIdentityFields index={index} />
        <LinePlacementFields index={index} />
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor={`${idp}-notes`}>{S.line.notes}</Label>
          <Textarea
            id={`${idp}-notes`}
            rows={2}
            placeholder={S.line.notesPlaceholder}
            {...form.register(`lines.${index}.notes`)}
          />
          <FieldError message={errors?.notes?.message} />
        </div>
      </div>
      {direction === "remove" && kind === "by_serial" ? (
        <Typography variant="helper" tone="muted">{S.line.removeSerialHint}</Typography>
      ) : null}
      {(serverErrors ?? []).map((message) => (
        <FieldError key={message} message={message} />
      ))}
      {direction === "remove" && kind === "by_count" ? <LineUnitsPreview index={index} /> : null}
    </div>
  );
}
