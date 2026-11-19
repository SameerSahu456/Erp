import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@/shared/api/notify-mutation-error";
import { useOnceSteps } from "@shared/hooks";

import {
  approveAgreement,
  configureSo,
  fetchAgreementSignatures,
  fetchRentalSalesOrderConfigVersions,
  recordAgreementSignature,
  rejectAgreement,
  saveLineCadence,
  type AgreementSignaturePayload,
  type RejectAgreementRequest,
  type RentalAgreementPayload,
  type RentalLineCadencePayload,
} from "../../api/agreements";
import {
  extendSo,
  fetchRentalSalesOrderBilling,
  holdSo,
  terminateSo,
  unholdSo,
  type RentalSalesOrderExtendPayload,
  type RentalSalesOrderHoldPayload,
  type RentalSalesOrderTerminatePayload,
  type RentalSalesOrderUnholdPayload,
} from "../../api/sales-orders";
import {
  recordPurchaseOrder,
  type RecordPurchaseOrderPayload,
} from "../../api/purchase-orders";
import { attachPoDocument, type WithPoDocument } from "../purchase-orders/usePurchaseOrders";
import { AGREEMENTS_HOOKS_STRINGS as S } from "./agreements-hooks.strings";
import { invalidateDevices, invalidateSalesOrder } from "../shared/invalidate";
import { isSalesOrderSubQuery, rentalKeys } from "../shared/keys";

const K = rentalKeys.salesOrders;

/** A sales order's rental billing contract — the Billings card payload. */
export function useRentalSalesOrderBilling(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.billing(salesOrderId),
    queryFn: () => fetchRentalSalesOrderBilling(salesOrderId as string),
    enabled: !!salesOrderId && (options?.enabled ?? true),
  });
}

export function useRentalSalesOrderConfigVersions(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.versions(salesOrderId),
    queryFn: () => fetchRentalSalesOrderConfigVersions(salesOrderId as string),
    enabled: !!salesOrderId && (options?.enabled ?? true),
  });
}

/** What the Configure / Amend page saves: the billing terms, and — when PO
 *  Required is ticked on an order not yet on a PO — that PO (or that it is
 *  awaited) with its document. */
export interface ConfigureSoVars {
  payload: RentalAgreementPayload;
  po: WithPoDocument<RecordPurchaseOrderPayload> | null;
}

/** Configure, then record the PO, then upload its document — three calls, so
 *  retry-safe (§6.8): a retry after a failed upload re-runs neither of the
 *  first two. A step re-runs only if what it would send has changed. */
export function useConfigureSo(salesOrderId: string | null | undefined) {
  const qc = useQueryClient();
  const steps = useOnceSteps();
  return useMutation({
    mutationFn: async ({ payload, po }: ConfigureSoVars) => {
      const id = salesOrderId as string;
      const config = await steps.run(`configure:${JSON.stringify(payload)}`, () =>
        configureSo(id, payload),
      );
      if (po) {
        const recorded = await steps.run(`record-po:${JSON.stringify(po.payload)}`, () =>
          recordPurchaseOrder(id, po.payload),
        );
        await attachPoDocument(qc, steps.run, recorded.id, po.file);
      }
      return config;
    },
    onSuccess: () => {
      steps.reset();
      toast.success(S.configured);
    },
    onSettled: () => {
      invalidateSalesOrder(qc, salesOrderId as string);
      // Recording the PO can move the order's end date onto its units.
      invalidateDevices(qc);
    },
    onError: notifyMutationError,
  });
}

/** Every order-lifecycle action refreshes that order (billing, versions, rate
 *  targets, …) and the list row whose status / menu changed. */
function useSoActionMutation<P>(
  mutationFn: (args: { id: string } & P) => Promise<unknown>,
  successMessage: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, vars) => {
      invalidateSalesOrder(qc, vars.id);
      toast.success(successMessage);
    },
  });
}

/** Approve the agreement — `PendingSignature` -> `Active`. No payload: the
 *  backend stamps who and when. */
export function useApproveAgreement() {
  return useSoActionMutation<unknown>(
    ({ id }) => approveAgreement(id),
    S.approved,
  );
}

/** Reject the agreement — `PendingSignature` -> `Draft`, with a reason.
 *  Same shared mutation as approve, for the same reason: the list's status
 *  column and the dispatch gate both change. */
export function useRejectAgreement() {
  return useSoActionMutation<RejectAgreementRequest>(
    ({ id, ...payload }) => rejectAgreement(id, payload),
    S.rejected,
  );
}

export function useExtendSo() {
  return useSoActionMutation<RentalSalesOrderExtendPayload>(
    ({ id, ...payload }) => extendSo(id, payload),
    S.extended,
  );
}

/** Raise a termination request — it waits for approval (2026-11-14). The
 *  order's pending-request banner and the approvals queue refresh. */
export function useTerminateSo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & RentalSalesOrderTerminatePayload) =>
      terminateSo(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rentalKeys.actionRequests.lists() });
      void qc.invalidateQueries({ queryKey: rentalKeys.earlyExitQueue.lists() });
      toast.success(S.terminationRequested);
    },
  });
}

export function useHoldSo() {
  return useSoActionMutation<RentalSalesOrderHoldPayload>(
    ({ id, ...payload }) => holdSo(id, payload),
    S.held,
  );
}

export function useUnholdSo() {
  return useSoActionMutation<RentalSalesOrderUnholdPayload>(
    ({ id, ...payload }) => unholdSo(id, payload),
    S.unheld,
  );
}

/** Who signed THIS agreement version (keyed by agreement, not order). */
export function useAgreementSignatures(
  agreementId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: rentalKeys.agreements.signatures(agreementId),
    queryFn: () => fetchAgreementSignatures(agreementId as string),
    enabled: !!agreementId && (options?.enabled ?? true),
  });
}

export function useRecordAgreementSignature(agreementId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AgreementSignaturePayload) =>
      recordAgreementSignature(agreementId as string, payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: rentalKeys.agreements.signatures(agreementId),
      });
      // A signature can unblock approval; the agreement's order isn't known here.
      void qc.invalidateQueries({ predicate: isSalesOrderSubQuery("billing") });
      toast.success(S.signatureRecorded);
    },
    onError: notifyMutationError,
  });
}

/** Set or clear ONE line's billing cycle. Clearing is a PUT of all-nulls (the
 *  row keeps `last_billed_date`). Refreshes the order's billing + list row. */
export function useSaveLineCadence(
  agreementId: string | null | undefined,
  salesOrderId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lineId,
      payload,
    }: {
      lineId: string;
      payload: RentalLineCadencePayload;
    }) => saveLineCadence(agreementId as string, lineId, payload),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: K.billing(salesOrderId) });
      void qc.invalidateQueries({ queryKey: K.lists() });
      toast.success(
        saved.is_override
          ? S.lineCadenceSaved
          : S.lineCadenceCleared,
      );
    },
  });
}
