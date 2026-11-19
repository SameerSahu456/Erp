import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@/shared/api/notify-mutation-error";
import { fileStepKey, useOnceSteps } from "@shared/hooks";
import { attachmentsListKey, uploadAttachment } from "@modules/attachments";
import { auditTrailKey } from "@modules/audit";

import {
  approvePurchaseOrder,
  extendPurchaseOrder,
  fetchOrderPurchaseOrderDocuments,
  fetchOrderPurchaseOrders,
  fetchPendingPurchaseOrders,
  recordPurchaseOrder,
  recordPurchaseOrderDetails,
  rejectPurchaseOrder,
  type ExtendPurchaseOrderPayload,
  type PoExtensionResult,
  type PurchaseOrderDetailsPayload,
  type RecordPurchaseOrderPayload,
} from "../../api/purchase-orders";
import { PO_DOCUMENT } from "../../constants/billing";
import {
  fetchPoRenewalSettings,
  savePoRenewalSettings,
  type PoRenewalSettingsPayload,
} from "../../api/settings";
import { PURCHASE_ORDER_HOOK_STRINGS as S } from "./purchase-orders-hooks.strings";
import {
  invalidateDevices,
  invalidateInvoices,
  invalidateSalesOrder,
} from "../shared/invalidate";
import { rentalKeys } from "../shared/keys";

const PENDING = rentalKeys.poApprovals;

/** An applied extension moves the end date, can re-rate units and raises
 *  invoices: the order (its POs too), the approval queue, invoices and units. */
function invalidateAfterExtension(qc: QueryClient, salesOrderId: string) {
  void qc.invalidateQueries({ queryKey: PENDING.lists() });
  invalidateInvoices(qc, [salesOrderId]);
  invalidateDevices(qc);
}

export function useOrderPurchaseOrders(
  salesOrderId: string | null | undefined,
) {
  return useQuery({
    queryKey: rentalKeys.salesOrders.purchaseOrders(salesOrderId),
    queryFn: () => fetchOrderPurchaseOrders(salesOrderId as string),
    enabled: !!salesOrderId,
  });
}

/** Every PO paper on the order, for its Attachments section (one call). */
export function useOrderPurchaseOrderDocuments(salesOrderId: string | null | undefined) {
  return useQuery({
    queryKey: rentalKeys.salesOrders.purchaseOrderDocuments(salesOrderId),
    queryFn: () => fetchOrderPurchaseOrderDocuments(salesOrderId as string),
    enabled: !!salesOrderId,
  });
}

/** Refresh every order's PO-papers list after a paper is added or removed.
 *  The PO row does not know which order page is open, so this matches the
 *  key's exact trailing segments rather than one order's key. */
export function useRefreshOrderPurchaseOrderDocuments() {
  const qc = useQueryClient();
  return () =>
    void qc.invalidateQueries({
      predicate: ({ queryKey }) =>
        queryKey[0] === rentalKeys.salesOrders.purchaseOrderDocuments("x")[0] &&
        queryKey.at(-2) === "purchase-orders" &&
        queryKey.at(-1) === "documents",
    });
}

/** A PO request plus the customer's document, which is filed against the PO
 *  row the request creates — so it can only be uploaded second. */
export interface WithPoDocument<P> {
  payload: P;
  file: File | null;
}

type RunStep = ReturnType<typeof useOnceSteps>["run"];

/** Upload the PO document to its row, once per file (§6.8): a retry after a
 *  failed upload never re-records the PO. */
export async function attachPoDocument(
  qc: QueryClient,
  run: RunStep,
  purchaseOrderId: string,
  file: File | null,
): Promise<void> {
  if (!file) return;
  await run(fileStepKey(`po-doc:${purchaseOrderId}`, file), () =>
    uploadAttachment({
      file,
      document_type: PO_DOCUMENT.documentType,
      entity_type: PO_DOCUMENT.entityType,
      entity_id: purchaseOrderId,
    }),
  );
  void qc.invalidateQueries({
    queryKey: attachmentsListKey(PO_DOCUMENT.entityType, purchaseOrderId),
  });
}

/** Record the order's first PO (or that it awaits one), then its document.
 *  Recording can move the order's end date to the PO's, so units refresh too. */
export function useRecordPurchaseOrder(salesOrderId: string) {
  const qc = useQueryClient();
  const steps = useOnceSteps();
  return useMutation({
    mutationFn: async ({ payload, file }: WithPoDocument<RecordPurchaseOrderPayload>) => {
      const po = await steps.run("record-po", () => recordPurchaseOrder(salesOrderId, payload));
      await attachPoDocument(qc, steps.run, po.id, file);
      return po;
    },
    onSuccess: (po) => {
      steps.reset();
      toast.success(po.status === "awaiting" ? S.toasts.awaiting : S.toasts.recorded);
    },
    onSettled: () => {
      // The order is now "PO needed?": its POs, menu (Extend PO) and list badge.
      invalidateSalesOrder(qc, salesOrderId);
      invalidateDevices(qc);
    },
  });
}

function extensionToast(result: PoExtensionResult) {
  if (result.pending_approval) {
    toast.success(S.toasts.sentForApproval);
    return;
  }
  if (result.purchase_order.status === "awaiting") {
    toast.success(S.toasts.extendedAwaiting);
    return;
  }
  toast.success(S.toasts.extended(result.invoice_numbers ?? []));
}

export function useExtendPurchaseOrder(salesOrderId: string) {
  const qc = useQueryClient();
  const steps = useOnceSteps();
  return useMutation({
    mutationFn: async ({ payload, file }: WithPoDocument<ExtendPurchaseOrderPayload>) => {
      const result = await steps.run("extend-po", () =>
        extendPurchaseOrder(salesOrderId, payload),
      );
      await attachPoDocument(qc, steps.run, result.purchase_order.id, file);
      return result;
    },
    onSuccess: (result) => {
      steps.reset();
      extensionToast(result);
    },
    onSettled: () => {
      invalidateSalesOrder(qc, salesOrderId);
      invalidateAfterExtension(qc, salesOrderId);
    },
  });
}

/** The awaited PO has arrived: its number and date, then its document. The
 *  server raises the catch-up for everything held back. */
export function useRecordPurchaseOrderDetails(salesOrderId: string) {
  const qc = useQueryClient();
  const steps = useOnceSteps();
  return useMutation({
    mutationFn: async ({
      purchaseOrderId,
      payload,
      file,
    }: WithPoDocument<PurchaseOrderDetailsPayload> & { purchaseOrderId: string }) => {
      const result = await steps.run("po-details", () =>
        recordPurchaseOrderDetails(purchaseOrderId, payload),
      );
      await attachPoDocument(qc, steps.run, purchaseOrderId, file);
      return result;
    },
    onSuccess: (result) => {
      steps.reset();
      toast.success(S.toasts.detailsRecorded(result.invoice_numbers ?? []));
    },
    onSettled: () => {
      invalidateSalesOrder(qc, salesOrderId);
      invalidateAfterExtension(qc, salesOrderId);
    },
  });
}

export function usePendingPurchaseOrders(
  params: { page: number; page_size: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: PENDING.list(params),
    queryFn: () => fetchPendingPurchaseOrders(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      salesOrderId: string;
      notes: string | null;
    }) => approvePurchaseOrder(vars.id, vars.notes),
    onSuccess: (result, vars) => {
      invalidateAfterExtension(qc, vars.salesOrderId);
      toast.success(S.toasts.approved(result.invoice_numbers ?? []));
    },
  });
}

export function useRejectPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; salesOrderId: string; notes: string }) =>
      rejectPurchaseOrder(vars.id, vars.notes),
    onSuccess: (_po, vars) => {
      void qc.invalidateQueries({ queryKey: PENDING.lists() });
      // Its POs, and the menu offers Extend PO again once nothing is pending.
      void qc.invalidateQueries({ queryKey: rentalKeys.salesOrders.detail(vars.salesOrderId) });
      toast.success(S.toasts.rejected);
    },
  });
}

export function usePoRenewalSettings() {
  return useQuery({
    queryKey: rentalKeys.settings.poRenewal,
    queryFn: fetchPoRenewalSettings,
  });
}

export function useSavePoRenewalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PoRenewalSettingsPayload) =>
      savePoRenewalSettings(payload),
    onSuccess: (saved) => {
      qc.setQueryData(rentalKeys.settings.poRenewal, saved);
      // Audited under the same id as the rest of the settings.
      void qc.invalidateQueries({ queryKey: auditTrailKey("rental_settings") });
      toast.success(S.renewal.saved);
    },
    // A card, not a dialog — the toast is the one error surface.
    onError: notifyMutationError,
  });
}
