import { useMutation } from "@tanstack/react-query";

import {
  previewStockAdjustmentLine,
  type StockAdjustmentLinePreviewRequest,
} from "../../stock-adjustments.api";
import { notifyAlways } from "./listed-errors";

/** On-demand count-pick preview for one draft line (D5). A mutation, not a
 *  query: it runs when the operator clicks "Preview units", never per keystroke. */
export function useStockAdjustmentLinePreview() {
  return useMutation({
    mutationFn: (body: StockAdjustmentLinePreviewRequest) => previewStockAdjustmentLine(body),
    onError: notifyAlways,
  });
}
