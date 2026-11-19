import { useMutation } from "@tanstack/react-query";

import {
  previewStockAdjustmentImport,
  type ImportPreviewParams,
} from "../../stock-adjustments.api";
import { notifyAlways } from "./listed-errors";

/** Parse + check an import file (D11 step 2). Writes nothing. */
export function useImportPreview() {
  return useMutation({
    mutationFn: (params: ImportPreviewParams) => previewStockAdjustmentImport(params),
    onError: notifyAlways,
  });
}
