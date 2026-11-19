import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  cancelPurchaseReturn,
  cancelReturnItem,
  createPurchaseReturn,
  shipPurchaseReturn,
  rejectReturnItem,
  rejectReturnItemsBulk,
  setDisposition,
  setDispositionsBulk,
  settleReturnItem,
  waiveReturnItem,
  type PurchaseReturn,
  type PurchaseReturnCreate,
  type ShipPurchaseReturnInput,
  type PurchaseReturnDisposition,
  type PurchaseReturnSettle,
  type PurchaseReturnWaive,
} from "../../api";
import { useUploadAttachment } from "@modules/attachments";
import { purchaseOrderKeys } from "@modules/procurement";
import { wmsKeys } from "../keys";
import { USE_PURCHASE_RETURN_MUTATIONS_STRINGS } from "./use-purchase-return-mutations.strings";

const K = wmsKeys.purchaseReturns;

// §16.9: refresh the return, its lists/counts, and the source PO (keys from its barrel).
function useInvalidatePurchaseReturn() {
  const qc = useQueryClient();
  return (pr: PurchaseReturn) => {
    void qc.invalidateQueries({ queryKey: K.detail(pr.id) });
    void qc.invalidateQueries({ queryKey: K.lists() });
    void qc.invalidateQueries({ queryKey: K.counts() });
    void qc.invalidateQueries({ queryKey: K.statsAll() });
    void qc.invalidateQueries({ queryKey: K.optionsAll() });
    void qc.invalidateQueries({ queryKey: K.returnableUnits(pr.purchase_order_id) });
    void qc.invalidateQueries({ queryKey: purchaseOrderKeys.list });
    void qc.invalidateQueries({ queryKey: purchaseOrderKeys.stats });
    void qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(pr.purchase_order_id) });
  };
}

const onPrError = (err: unknown) =>
  toast.error((err as { message?: string })?.message || USE_PURCHASE_RETURN_MUTATIONS_STRINGS.errorFallback);

/** A file picked in the dispatch dialog, filed on the dispatch once it exists. */
export interface DispatchDocUpload {
  file: File;
  document_type: string;
}

// Ships ONE consignment. A return may need several, so the toast says how
// many units left rather than implying the whole return has gone.
function useShipPurchaseReturn() {
  const qc = useQueryClient();
  const invalidate = useInvalidatePurchaseReturn();
  const upload = useUploadAttachment();
  return useMutation({
    onError: onPrError,
    // Ship first, then file the dialog's documents on the new dispatch. A file
    // that fails doesn't undo the shipment; it can be added on the dispatch page.
    mutationFn: async ({
      pr,
      input,
      documents = [],
    }: {
      pr: PurchaseReturn;
      input: ShipPurchaseReturnInput;
      documents?: DispatchDocUpload[];
    }) => {
      const dispatchId = await shipPurchaseReturn(pr.id, input);
      const results = await Promise.allSettled(
        documents.map((d) =>
          upload.mutateAsync({
            file: d.file,
            document_type: d.document_type,
            entity_type: "dispatch_requests",
            entity_id: dispatchId,
            silent: true,
          }),
        ),
      );
      return results.filter((r) => r.status === "rejected").length;
    },
    // The result is the count of files that failed; the return itself is
    // threaded through the variables to drive the shared invalidation.
    onSuccess: (failedDocs, { pr, input }) => {
      invalidate(pr);
      // Shipping is the one return action that creates a dispatch request, so
      // it is the only one that has to refresh the dispatch queries — the
      // return's own Consignments panel and the WMS dispatch worklist both
      // read from here and would otherwise miss the consignment just raised.
      void qc.invalidateQueries({ queryKey: wmsKeys.dispatches.lists() });
      void qc.invalidateQueries({ queryKey: wmsKeys.dispatches.counts() });
      toast.success(
        USE_PURCHASE_RETURN_MUTATIONS_STRINGS.success.dispatch(
          input.itemIds.length,
        ),
      );
      if (failedDocs > 0) toast.error(USE_PURCHASE_RETURN_MUTATIONS_STRINGS.docsUploadPartial);
    },
  });
}

export function usePurchaseReturnMutations() {
  const invalidate = useInvalidatePurchaseReturn();

  const create = useMutation({
    onError: onPrError,
    mutationFn: (body: PurchaseReturnCreate) => createPurchaseReturn(body),
    onSuccess: (pr) => {
      invalidate(pr);
      toast.success(USE_PURCHASE_RETURN_MUTATIONS_STRINGS.success.create);
    },
  });

  const cancel = useMutation({
    onError: onPrError,
    mutationFn: (id: string) => cancelPurchaseReturn(id),
    onSuccess: (pr) => {
      invalidate(pr);
      toast.success(USE_PURCHASE_RETURN_MUTATIONS_STRINGS.success.cancel);
    },
  });

  const dispatch = useShipPurchaseReturn();

  const setDispositionMutation = useMutation({
    onError: onPrError,
    mutationFn: ({
      prId,
      itemId,
      disposition,
    }: {
      prId: string;
      itemId: string;
      disposition: PurchaseReturnDisposition;
      // In a bulk apply the caller passes `silent` and fires ONE summary toast +
      // ONE invalidation after the loop, instead of N of each (§0.13/§11).
      silent?: boolean;
    }) => setDisposition(prId, itemId, disposition),
    onSuccess: (pr, { silent }) => {
      if (silent) return;
      invalidate(pr);
      toast.success(USE_PURCHASE_RETURN_MUTATIONS_STRINGS.success.setDisposition);
    },
  });

  // Bulk disposition: ONE request + ONE transaction for every selected item,
  // replacing the per-item loop that did not scale to a large return (CP-344).
  // The caller fires the single summary toast; this only refreshes on success.
  const setDispositionsBulkMutation = useMutation({
    onError: onPrError,
    mutationFn: ({
      prId,
      itemIds,
      disposition,
    }: {
      prId: string;
      itemIds: string[];
      disposition: PurchaseReturnDisposition;
    }) => setDispositionsBulk(prId, itemIds, disposition),
    onSuccess: (pr) => {
      invalidate(pr);
    },
  });

  const reject = useMutation({
    onError: onPrError,
    mutationFn: ({
      prId,
      itemId,
    }: {
      prId: string;
      itemId: string;
      silent?: boolean;
    }) => rejectReturnItem(prId, itemId),
    onSuccess: (pr, { silent }) => {
      if (silent) return;
      invalidate(pr);
      toast.success(USE_PURCHASE_RETURN_MUTATIONS_STRINGS.success.reject);
    },
  });

  // Bulk reject: ONE request + ONE transaction, replacing the per-item loop
  // (CP-344). The caller fires the single summary toast; this only refreshes.
  const rejectItemsBulkMutation = useMutation({
    onError: onPrError,
    mutationFn: ({ prId, itemIds }: { prId: string; itemIds: string[] }) =>
      rejectReturnItemsBulk(prId, itemIds),
    onSuccess: (pr) => {
      invalidate(pr);
    },
  });

  // Warehouse per-item cancel — removing a mistakenly-added unit. Distinct from
  // `reject` (procurement's remedy decision): same effect on an undecided item,
  // but gated on po_return_write and offered only while the return is raised.
  const cancelItem = useMutation({
    onError: onPrError,
    mutationFn: ({ prId, itemId }: { prId: string; itemId: string }) =>
      cancelReturnItem(prId, itemId),
    onSuccess: (pr) => {
      invalidate(pr);
      toast.success(USE_PURCHASE_RETURN_MUTATIONS_STRINGS.success.cancelItem);
    },
  });

  const settle = useMutation({
    onError: onPrError,
    mutationFn: ({
      prId,
      itemId,
      body,
    }: {
      prId: string;
      itemId: string;
      body: PurchaseReturnSettle;
    }) => settleReturnItem(prId, itemId, body),
    onSuccess: (pr) => {
      invalidate(pr);
      toast.success(USE_PURCHASE_RETURN_MUTATIONS_STRINGS.success.settle);
    },
  });

  const waive = useMutation({
    onError: onPrError,
    mutationFn: ({
      prId,
      itemId,
      body,
    }: {
      prId: string;
      itemId: string;
      body: PurchaseReturnWaive;
    }) => waiveReturnItem(prId, itemId, body),
    onSuccess: (pr) => {
      invalidate(pr);
      toast.success(USE_PURCHASE_RETURN_MUTATIONS_STRINGS.success.waive);
    },
  });

  return {
    create,
    cancel,
    cancelItem,
    dispatch,
    setDisposition: setDispositionMutation,
    setDispositionsBulk: setDispositionsBulkMutation,
    reject,
    rejectItemsBulk: rejectItemsBulkMutation,
    settle,
    waive,
    // Exposed so a bulk loop can invalidate ONCE after suppressing the per-item
    // invalidation via `silent` (§11).
    invalidate,
  };
}
