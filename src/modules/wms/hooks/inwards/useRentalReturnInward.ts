import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { rentalReturnRequestKeys } from "@modules/crm";

import {
  createUnannouncedRentalReturn,
  previewRentalScans,
  type ReceiveUnitInput,
  type UnannouncedRentalReturnBatchCreate,
} from "../../api";
import { inwardErrorMessage } from "../../inwardErrors";
import { USE_INWARDS_STRINGS } from "./use-inwards.strings";
import { wmsKeys } from "../keys";

const K = wmsKeys.grnBatches;

/**
 * Classify scans against a rental-return batch. A mutation, not a query:
 * each scan is a one-off question the operator asks, and the answer is kept
 * in the scan list rather than the cache. Writes nothing server-side.
 */
export function useRentalScanPreview() {
  return useMutation({
    mutationFn: ({ batchId, scans }: { batchId: string; scans: ReceiveUnitInput[] }) =>
      previewRentalScans(batchId, scans),
  });
}

/** Open a batch for boxes that arrived with no request (R7). */
export function useCreateUnannouncedRentalReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UnannouncedRentalReturnBatchCreate) =>
      createUnannouncedRentalReturn(body),
    onSuccess: (b) => {
      void qc.invalidateQueries({ queryKey: K.lists() });
      void qc.invalidateQueries({ queryKey: K.counts() });
      // The server opened an approved `unannounced` return request.
      void qc.invalidateQueries({ queryKey: rentalReturnRequestKeys.all });
      toast.success(USE_INWARDS_STRINGS.toasts.created(b.grn_number));
    },
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}
