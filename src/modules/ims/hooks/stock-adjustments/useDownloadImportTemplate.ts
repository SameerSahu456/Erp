import { useMutation } from "@tanstack/react-query";

import { notifyMutationError } from "@shared/api/notify-mutation-error";
import { filenameFromDisposition } from "@shared/lib/filename-from-disposition";
import { saveBlob } from "@shared/lib/saveBlob";

import { downloadStockAdjustmentTemplate } from "../../stock-adjustments.api";
import { STOCK_ADJUSTMENT_HOOK_STRINGS as S } from "./stock-adjustment-hooks.strings";

/** The import template — fetched with auth (the token is a header), saved as a file. */
export function useDownloadImportTemplate() {
  return useMutation({
    mutationFn: downloadStockAdjustmentTemplate,
    onSuccess: ({ blob, headers }) => {
      saveBlob(blob, filenameFromDisposition(headers["content-disposition"]) ?? S.templateFile);
    },
    onError: notifyMutationError,
  });
}
