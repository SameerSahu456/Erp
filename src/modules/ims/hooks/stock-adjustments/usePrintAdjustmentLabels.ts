import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@shared/api/notify-mutation-error";

import { printUnitLabels } from "../../stock-adjustments.api";
import { imsKeys } from "../keys";
import { STOCK_ADJUSTMENT_HOOK_STRINGS as S } from "./stock-adjustment-hooks.strings";

export interface AdjustmentLabelPreview {
  url: string;
  count: number;
  filename: string;
}

/**
 * Labels for the units an approved adjustment added. Same delivery as the WMS
 * lot labels: the PDF is fetched with auth and EMBEDDED in a preview dialog
 * (popups / hidden-iframe print / scripted downloads all fail silently). The
 * counts and skipped serials are parsed by WMS `toPrintResult`.
 */
export function usePrintAdjustmentLabels(adjustmentId: string, adjustmentNumber: string) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<AdjustmentLabelPreview | null>(null);
  // A ref, not state: creating/revoking a URL is a side effect.
  const urlRef = useRef<string | null>(null);
  const release = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };
  useEffect(() => release, []);

  const mutation = useMutation({
    mutationFn: printUnitLabels,
    onSuccess: ({ blob, printed, skipped, skippedSerials }) => {
      if (printed === 0) {
        toast.info(S.labelsNothing);
        return;
      }
      release();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setPreview({ url, count: printed, filename: S.labelsFile(adjustmentNumber) });
      toast.success(S.labelsPrinted(printed, skipped), {
        description: skippedSerials.length > 0 ? S.labelsSkippedSerials(skippedSerials) : undefined,
      });
    },
    onError: notifyMutationError,
    // Printing stamps label_printed_at on the units shown in the lines table.
    onSettled: () =>
      void qc.invalidateQueries({ queryKey: imsKeys.stockAdjustments.detail(adjustmentId) }),
  });

  const dismiss = () => {
    release();
    setPreview(null);
  };

  return {
    print: (stockItemIds: string[]) => mutation.mutate(stockItemIds),
    isPrinting: mutation.isPending,
    preview,
    dismiss,
  };
}
