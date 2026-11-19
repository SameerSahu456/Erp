import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  importAdjustmentSchema,
  importCreateBlocker,
  importInputBlocker,
  type ImportAdjustmentForm,
} from "../../lib/stock-adjustment-import";
import type { StockAdjustmentReason } from "../../stock-adjustments.api";
import { useCreateFromImport } from "./useCreateFromImport";
import { useDownloadImportTemplate } from "./useDownloadImportTemplate";
import { useImportPreview } from "./useImportPreview";

export interface ImportAdjustmentInit {
  initialWarehouse?: { id: string; name: string };
  initialReason?: StockAdjustmentReason | "";
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/** State + actions of the import dialog (D11): template → upload → preview →
 *  create draft. A warehouse / reason / file change drops the preview, so
 *  "Create draft" only sends lines resolved for exactly the inputs on screen. */
export function useImportAdjustment({ initialWarehouse, initialReason }: ImportAdjustmentInit) {
  const template = useDownloadImportTemplate();
  const preview = useImportPreview();
  const create = useCreateFromImport();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const form = useForm<ImportAdjustmentForm>({
    resolver: zodResolver(importAdjustmentSchema),
    mode: "onTouched",
    defaultValues: {
      warehouseId: initialWarehouse?.id ?? "",
      warehouseName: initialWarehouse?.name ?? "",
      reason: initialReason ?? "",
      notes: "",
      file: null,
    },
  });
  const [warehouseId, warehouseName, reason, notes, file] = useWatch({
    control: form.control,
    name: ["warehouseId", "warehouseName", "reason", "notes", "file"],
  });
  const values: ImportAdjustmentForm = { warehouseId, warehouseName, reason, notes, file };

  const setWarehouse = (id: string, name: string) => {
    form.setValue("warehouseName", name);
    form.setValue("warehouseId", id, DIRTY);
    preview.reset();
  };
  const setReason = (next: StockAdjustmentReason) => {
    form.setValue("reason", next, DIRTY);
    preview.reset();
  };
  const setFile = (next: File | null) => {
    form.setValue("file", next, DIRTY);
    preview.reset();
  };

  // Preview sends the same notes as create, so both share the input checks.
  const runPreview = form.handleSubmit((v) => {
    if (!v.file || !v.reason) return;
    preview.mutate({ file: v.file, warehouse_id: v.warehouseId, reason: v.reason, notes: v.notes.trim() });
  });
  const createDraft = form.handleSubmit((v) => {
    const lines = preview.data?.lines;
    if (!lines || !v.file || !v.reason) return;
    create.mutate({ file: v.file, warehouseId: v.warehouseId, reason: v.reason, notes: v.notes.trim(), lines });
  });

  const rows = (preview.data?.rows ?? []).filter((r) => !errorsOnly || r.status === "error");

  return {
    form,
    template,
    values,
    setWarehouse,
    setReason,
    setFile,
    previewBlocker: importInputBlocker(values),
    createBlocker: importCreateBlocker(values, preview.data),
    runPreview,
    previewing: preview.isPending,
    result: preview.data ?? null,
    rows,
    errorsOnly,
    setErrorsOnly,
    createDraft,
    creating: create.isPending,
  };
}

export type ImportAdjustmentState = ReturnType<typeof useImportAdjustment>;
