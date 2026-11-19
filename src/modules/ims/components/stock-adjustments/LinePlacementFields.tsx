import { Controller, useFormContext, useWatch } from "react-hook-form";

import { FieldError } from "@/components/common/forms/FieldError";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";

import { lineAllowsLocation, type StockAdjustmentForm } from "../../lib/stock-adjustment-form";
import { LineLocationField } from "./LineLocationField";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Where the line's units land: optional rack/bin, or "needs inspection"
 *  which sends them through the pipeline and so forbids a rack (D13). */
export function LinePlacementFields({ index }: { index: number }) {
  const form = useFormContext<StockAdjustmentForm>();
  const [warehouseId, direction, kind, locationId, locationLabel, needsInspection] = useWatch({
    control: form.control,
    name: [
      "warehouseId",
      `lines.${index}.direction`,
      `lines.${index}.kind`,
      `lines.${index}.locationId`,
      `lines.${index}.locationLabel`,
      `lines.${index}.needsInspection`,
    ],
  });
  const allowsLocation = lineAllowsLocation({ direction, kind });
  const canInspect = direction === "add" && kind !== "restore";
  const idp = `sa-line-${index}`;

  const setLocation = (id: string, label: string) => {
    form.setValue(`lines.${index}.locationLabel`, label);
    form.setValue(`lines.${index}.locationId`, id, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <>
      {allowsLocation ? (
        <div className="min-w-0 space-y-1.5 md:col-span-2">
          <LineLocationField
            id={`${idp}-location`}
            warehouseId={warehouseId}
            location={{ id: locationId, label: locationLabel }}
            disabled={needsInspection}
            onChange={setLocation}
          />
          <FieldError message={form.formState.errors.lines?.[index]?.locationId?.message} />
        </div>
      ) : null}
      {canInspect ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3 md:col-span-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Label htmlFor={`${idp}-inspect`} className="cursor-pointer">{S.line.needsInspection}</Label>
            <Typography variant="helper" tone="muted">{S.line.needsInspectionHint}</Typography>
          </div>
          <Controller
            control={form.control}
            name={`lines.${index}.needsInspection`}
            render={({ field }) => (
              <Switch
                id={`${idp}-inspect`}
                className="shrink-0"
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked) setLocation("", "");
                }}
              />
            )}
          />
        </div>
      ) : null}
    </>
  );
}
