import { Controller, useFormContext, useWatch } from "react-hook-form";

import { FieldError } from "@/components/common/forms/FieldError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNumberField } from "@/hooks/use-number-field";

import { kindNeedsVariant, type StockAdjustmentForm } from "../../lib/stock-adjustment-form";
import { INTERNAL_SERIAL_MAX, MANUFACTURER_SERIAL_MAX } from "../../lib/stock-adjustment-labels";
import { AdjustmentVariantPicker } from "./AdjustmentVariantPicker";
import { LineSerialPicker } from "./LineSerialPicker";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

type SerialField = "internalSerial" | "manufacturerSerial";
const SERIAL_MAX: Record<SerialField, number> = {
  internalSerial: INTERNAL_SERIAL_MAX,
  manufacturerSerial: MANUFACTURER_SERIAL_MAX,
};

/** One labelled serial input bound to a line field. */
function LineSerialField({ index, field, label, required }: { index: number; field: SerialField; label: string; required: boolean }) {
  const form = useFormContext<StockAdjustmentForm>();
  const id = `sa-line-${index}-${field}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required={required}>{label}</Label>
      <Input
        id={id}
        maxLength={SERIAL_MAX[field]}
        placeholder={S.line.serialPlaceholder}
        {...form.register(`lines.${index}.${field}`)}
      />
      <FieldError message={form.formState.errors.lines?.[index]?.[field]?.message} />
    </div>
  );
}

/** Qty through useNumberField (§3.2); the form keeps the wire string, the schema the ≥1 rule. */
function QuantityInput({ id, value, onChange, onBlur }: { id: string; value: string; onChange: (v: string) => void; onBlur: () => void }) {
  const qty = useNumberField(Number(value) || 0, (n) => onChange(String(n)));
  return (
    <Input
      id={id}
      {...qty}
      placeholder={S.line.quantityPlaceholder}
      onBlur={() => {
        qty.onBlur();
        onBlur();
      }}
    />
  );
}

function LineQuantityField({ index }: { index: number }) {
  const form = useFormContext<StockAdjustmentForm>();
  const id = `sa-line-${index}-quantity`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required>{S.line.quantity}</Label>
      <Controller
        control={form.control}
        name={`lines.${index}.quantity`}
        render={({ field }) => (
          <QuantityInput id={id} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
        )}
      />
      <FieldError message={form.formState.errors.lines?.[index]?.quantity?.message} />
    </div>
  );
}

function LineVariantField({ index }: { index: number }) {
  const form = useFormContext<StockAdjustmentForm>();
  const id = `sa-line-${index}-variant`;
  // Watched so the chip updates after a pick (a getValues read is memoised).
  const variantLabel = useWatch({ control: form.control, name: `lines.${index}.variantLabel` });
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} required>{S.line.variant}</Label>
      <Controller
        control={form.control}
        name={`lines.${index}.variantId`}
        render={({ field }) => (
          <AdjustmentVariantPicker
            id={id}
            value={field.value}
            label={variantLabel}
            onChange={(variantId, label) => {
              form.setValue(`lines.${index}.variantLabel`, label);
              field.onChange(variantId);
            }}
          />
        )}
      />
      <FieldError message={form.formState.errors.lines?.[index]?.variantId?.message} />
    </div>
  );
}

/** What a line points at: a variant + qty, or a serial — depending on its kind (D4). */
export function LineIdentityFields({ index }: { index: number }) {
  const form = useFormContext<StockAdjustmentForm>();
  const [direction, kind] = useWatch({
    control: form.control,
    name: [`lines.${index}.direction`, `lines.${index}.kind`],
  });
  const removeBySerial = direction === "remove" && kind === "by_serial";
  const showInternal = kind === "restore" || removeBySerial;
  return (
    <>
      {kindNeedsVariant(direction, kind) ? <LineVariantField index={index} /> : null}
      {removeBySerial ? <LineSerialPicker index={index} /> : null}
      {kind === "by_count" ? <LineQuantityField index={index} /> : null}
      {showInternal ? (
        <LineSerialField index={index} field="internalSerial" label={S.line.internalSerial} required={kind === "restore"} />
      ) : null}
      {kind === "by_serial" ? (
        <LineSerialField
          index={index}
          field="manufacturerSerial"
          label={S.line.manufacturerSerial}
          required={direction === "add"}
        />
      ) : null}
    </>
  );
}
