import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { uploadAttachment } from "@shared/api/attachments";

import {
  createStockAdjustment,
  type StockAdjustment,
  type StockAdjustmentLineInput,
  type StockAdjustmentReason,
} from "../../stock-adjustments.api";
import { invalidateStockAdjustment } from "./invalidateStockAdjustment";
import { notifyAlways } from "./listed-errors";
import { STOCK_ADJUSTMENT_HOOK_STRINGS as S } from "./stock-adjustment-hooks.strings";

export interface CreateFromImportInput {
  file: File;
  warehouseId: string;
  reason: StockAdjustmentReason;
  notes: string;
  lines: StockAdjustmentLineInput[];
}

interface CreateFromImportResult {
  created: StockAdjustment;
  attachFailed: boolean;
}

/** Document type the import file is filed under on the adjustment (spec §3.5). */
const IMPORT_DOCUMENT_TYPE = "import_file";

/** The import file's MIME by extension (both are in the backend's allow-list). */
const IMPORT_FILE_TYPES: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Browsers can report no type (or text/plain) for a .csv / .xlsx — e.g. Windows
 *  without Office — and the attachment API rejects that, so the sheet never got
 *  attached. Re-label it from its extension. */
export function withImportFileType(file: File): File {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = IMPORT_FILE_TYPES[ext];
  return type && file.type !== type ? new File([file], file.name, { type }) : file;
}

async function createAndAttach(input: CreateFromImportInput): Promise<CreateFromImportResult> {
  const created = await createStockAdjustment({
    warehouse_id: input.warehouseId,
    reason: input.reason,
    notes: input.notes,
    source: "import",
    import_filename: input.file.name,
    lines: input.lines,
  });
  try {
    await uploadAttachment({
      file: withImportFileType(input.file),
      entity_type: "ims_stock_adjustment",
      entity_id: created.id,
      document_type: IMPORT_DOCUMENT_TYPE,
    });
    return { created, attachFailed: false };
  } catch {
    return { created, attachFailed: true };
  }
}

/**
 * Create the draft from previewed lines, then keep the uploaded file on it as
 * an attachment (spec §3.5). Two calls, no transaction (§6.8): once the draft
 * exists the operator lands on it whatever happens next, so a failed attach is
 * a warning, never retried into a duplicate draft. Navigation lives here so a
 * dialog closed mid-create can't lose it.
 */
export function useCreateFromImport() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: createAndAttach,
    onSuccess: ({ created, attachFailed }) => {
      if (attachFailed) toast.warning(S.importAttachFailed);
      else toast.success(S.created);
      navigate(`/ims/stock-adjustments/${created.id}`);
    },
    onError: notifyAlways,
    onSettled: (result) =>
      invalidateStockAdjustment(qc, result?.created.id ?? null, { statusChanged: true }),
  });
}
