import { Download, Loader2 } from "lucide-react";

import { FileUpload } from "@/components/common/files/FileUpload";
import { FieldError } from "@/components/common/forms/FieldError";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import type { ImportAdjustmentState } from "../../hooks/stock-adjustments/useImportAdjustment";
import {
  IMPORT_FILE_ACCEPT,
  IMPORT_FILE_MAX_BYTES,
  NOTES_MAX,
  OTHER_REASON_NOTES_MIN,
  STOCK_ADJUSTMENT_REASON_LABEL,
  STOCK_ADJUSTMENT_REASONS,
} from "../../lib/stock-adjustment-labels";
import { EnumSelect } from "../shared/EnumSelect";
import { WarehousePicker } from "../shared/WarehousePicker";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Template link + the inputs an import preview needs. */
export function ImportAdjustmentFields({ state }: { state: ImportAdjustmentState }) {
  const { form, values } = state;
  const errors = form.formState.errors;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="sai-warehouse" required>{S.form.warehouse}</Label>
          <WarehousePicker
            id="sai-warehouse"
            value={values.warehouseId}
            label={values.warehouseName}
            onChange={state.setWarehouse}
          />
          <FieldError message={errors.warehouseId?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sai-reason" required>{S.form.reason}</Label>
          <EnumSelect
            id="sai-reason"
            value={values.reason}
            options={STOCK_ADJUSTMENT_REASONS}
            labels={STOCK_ADJUSTMENT_REASON_LABEL}
            placeholder={S.form.reasonPlaceholder}
            onChange={state.setReason}
          />
          <FieldError message={errors.reason?.message} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="sai-notes" required>{S.import.notes}</Label>
          <Textarea
            id="sai-notes"
            rows={2}
            maxLength={NOTES_MAX}
            placeholder={S.import.notesPlaceholder}
            {...form.register("notes")}
          />
          {values.reason === "other" ? (
            <Typography variant="helper" tone="muted">{S.form.notesOtherHint(OTHER_REASON_NOTES_MIN)}</Typography>
          ) : null}
          <FieldError message={errors.notes?.message} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label required>{S.import.file}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => state.template.mutate()}
              disabled={state.template.isPending}
            >
              {state.template.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-1.5 size-3.5" aria-hidden />
              )}
              {S.import.downloadTemplate}
            </Button>
          </div>
          <FileUpload
            accept={IMPORT_FILE_ACCEPT}
            maxSize={IMPORT_FILE_MAX_BYTES}
            value={values.file ? [values.file] : []}
            onChange={(files) => state.setFile(files[0] ?? null)}
          />
          <Typography variant="helper" tone="muted">{S.import.fileHint}</Typography>
          <FieldError message={errors.file?.message} />
        </div>
      </div>
    </div>
  );
}
