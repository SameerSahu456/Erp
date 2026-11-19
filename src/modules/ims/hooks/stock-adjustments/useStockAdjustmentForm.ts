import { useState } from "react";
import { useFieldArray, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { useFormUnsavedGuard } from "@/shared/hooks/useFormUnsavedGuard";

import {
  emptyAdjustmentLine,
  formFromAdjustment,
  setLineDirection,
  stockAdjustmentFormSchema,
  toCreatePayload,
  type StockAdjustmentForm,
} from "../../lib/stock-adjustment-form";
import { sortAdjustmentErrors, type SortedAdjustmentErrors } from "../../lib/stock-adjustment-errors";
import { REASON_DIRECTIONS } from "../../lib/stock-adjustment-labels";
import type { StockAdjustment, StockAdjustmentReason } from "../../stock-adjustments.api";
import { useSaveStockAdjustment } from "./useSaveStockAdjustment";

/** Backend header field → form field. */
const HEADER_FIELDS: Record<string, Path<StockAdjustmentForm>> = {
  warehouse_id: "warehouseId",
  reason: "reason",
  notes: "notes",
};

const NO_ERRORS: SortedAdjustmentErrors = { byLine: {}, byField: {}, general: [] };

/** Create / edit form state for a draft adjustment. */
// The warehouse and reason pickers are buttons RHF can't focus, so its own
// focus would jump to Notes. Focus is ours: first bad field in page order (PAGE-UI §3).
const HEADER_FOCUS_IDS = [
  ["warehouseId", "sa-warehouse"],
  ["reason", "sa-reason"],
  ["notes", "sa-notes"],
] as const;

function firstErrorElement(errors: FieldErrors<StockAdjustmentForm>): HTMLElement | null {
  const header = HEADER_FOCUS_IDS.find(([field]) => errors[field]);
  if (header) return document.getElementById(header[1]);
  const index = (errors.lines ?? []).findIndex?.((line) => line != null) ?? -1;
  const field = index >= 0 ? Object.keys(errors.lines?.[index] ?? {})[0] : undefined;
  if (!field) return null;
  // Line inputs use `sa-line-{i}-{field}` ids (the variant picker drops the "Id"); else the line's first control.
  const slug = field === "variantId" ? "variant" : field;
  return document.getElementById(`sa-line-${index}-${slug}`) ?? document.getElementById(`sa-line-${index}-direction`);
}

function focusFirstError(errors: FieldErrors<StockAdjustmentForm>) {
  const el = firstErrorElement(errors);
  el?.scrollIntoView({ block: "center" });
  el?.focus();
}

export function useStockAdjustmentForm(existing: StockAdjustment | undefined) {
  const navigate = useNavigate();
  const save = useSaveStockAdjustment(existing?.id ?? null);
  const [serverErrors, setServerErrors] = useState<SortedAdjustmentErrors>(NO_ERRORS);

  const form = useForm<StockAdjustmentForm>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: formFromAdjustment(existing),
    shouldFocusError: false, // see focusFirstError
  });
  const guard = useFormUnsavedGuard(form);
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const reason = useWatch({ control: form.control, name: "reason" });
  const warehouseId = useWatch({ control: form.control, name: "warehouseId" });
  // Watched, not read with getValues: the React Compiler memoises a getValues
  // read, so the picker kept showing the first (empty) name after a pick.
  const warehouseName = useWatch({ control: form.control, name: "warehouseName" });

  /** New lines go on top, right under the Add button. Rows renumber, so
   *  row-indexed server errors go stale (as on remove). */
  const addLine = () => {
    const direction = reason ? REASON_DIRECTIONS[reason][0] : "add";
    lines.prepend(emptyAdjustmentLine(direction));
    setServerErrors(NO_ERRORS);
  };

  /** A reason allows only some directions (D3). Lines set before the reason
   *  switch to an allowed one, so the order of choices can't leave a line invalid. */
  const changeReason = (next: StockAdjustmentReason) => {
    form.setValue("reason", next, { shouldDirty: true, shouldValidate: true });
    const allowed = REASON_DIRECTIONS[next];
    form.getValues("lines").forEach((line, i) => {
      if (!allowed.includes(line.direction)) setLineDirection(form, i, allowed[0]);
    });
    if (form.formState.isSubmitted) void form.trigger("lines");
  };

  /** Server line errors are indexed by row, so a removal makes them stale. */
  const removeLine = (index: number) => {
    lines.remove(index);
    setServerErrors(NO_ERRORS);
  };

  /** A new warehouse invalidates every picked rack/bin (D2: same warehouse)
   *  and every unit picked for removal — those were that warehouse's units. */
  const changeWarehouse = (id: string, name: string) => {
    form.setValue("warehouseId", id, { shouldDirty: true, shouldValidate: true });
    form.setValue("warehouseName", name);
    form.getValues("lines").forEach((line, i) => {
      form.setValue(`lines.${i}.locationId`, "");
      form.setValue(`lines.${i}.locationLabel`, "");
      if (line.direction === "remove" && line.kind === "by_serial") {
        form.setValue(`lines.${i}.internalSerial`, "");
        form.setValue(`lines.${i}.manufacturerSerial`, "");
      }
    });
  };

  const submit = form.handleSubmit(async (values) => {
    setServerErrors(NO_ERRORS);
    try {
      const saved = await save.mutateAsync(toCreatePayload(values));
      form.reset(values);
      guard.bypassOnce();
      navigate(`/ims/stock-adjustments/${saved.id}`, { replace: !existing });
    } catch (error) {
      const sorted = sortAdjustmentErrors(error);
      for (const [field, message] of Object.entries(sorted.byField)) {
        const target = HEADER_FIELDS[field];
        if (target) form.setError(target, { type: "server", message });
        else sorted.general.push(message);
      }
      setServerErrors(sorted);
    }
  }, focusFirstError);

  return {
    form,
    guard,
    lines,
    reason,
    warehouseId,
    warehouseName,
    addLine,
    removeLine,
    changeWarehouse,
    changeReason,
    submit,
    saving: save.isPending,
    serverErrors,
  };
}

export type StockAdjustmentFormState = ReturnType<typeof useStockAdjustmentForm>;
