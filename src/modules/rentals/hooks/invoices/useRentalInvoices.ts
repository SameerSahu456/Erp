import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@/shared/api/notify-mutation-error";

import { requestInvoiceDelete } from "../../api/action-requests";
import {
  fetchAutoInvoiceDays,
  fetchInvoiceDocument,
  fetchInvoiceDocuments,
  fetchInvoiceRegisterSummary,
  fetchRentalInvoice,
  fetchRentalInvoices,
  previewAdhocInvoice,
  raiseAdhocInvoice,
  type AdhocInvoiceRequest,
  type FetchInvoicesParams,
  type PageParams,
  type RentalInvoiceDetail,
} from "../../api/invoices";
import { INVOICES_HOOKS_STRINGS as S } from "./invoices-hooks.strings";
import {
  invalidateCreditNotes,
  invalidateDevices,
  invalidateInvoices,
} from "../shared/invalidate";
import { rentalKeys } from "../shared/keys";

const K = rentalKeys.invoices;

/** What raising this invoice WOULD charge. A query, not a mutation: a pure
 *  read cached per input set, so the form needs no re-price effect. */
export function useAdhocInvoicePreview(params: AdhocInvoiceRequest | null) {
  return useQuery({
    queryKey: K.preview(params),
    enabled: !!params,
    queryFn: () => previewAdhocInvoice(params as AdhocInvoiceRequest),
  });
}

export function useRaiseAdhocInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: raiseAdhocInvoice,
    onSuccess: (invoice, payload) => {
      invalidateInvoices(qc, payload.sales_order_ids);
      // Raising advances the units' billing anchors.
      invalidateDevices(qc);
      toast.success(S.raised(invoice.invoice_number));
    },
    onError: notifyMutationError,
  });
}

export function useRentalInvoice(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: K.detail(invoiceId ?? ""),
    queryFn: () => fetchRentalInvoice(invoiceId as string),
    enabled: !!invoiceId,
  });
}

export function useRentalInvoices(
  params: FetchInvoicesParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchRentalInvoices(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** The billing engine's runs, one row per DAY, newest first. */
export function useAutoInvoiceDays(
  params: PageParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.autoDays(params),
    queryFn: () => fetchAutoInvoiceDays(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useInvoiceDocument(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: K.document(invoiceId),
    queryFn: () => fetchInvoiceDocument(invoiceId as string),
    enabled: !!invoiceId,
  });
}

/** Every invoice issued in a window, resolved for printing; runs once both
 *  ends are picked. */
export function useInvoiceDocuments(
  params: { date_from?: string; date_to?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.documents(params),
    queryFn: () =>
      fetchInvoiceDocuments({
        date_from: params.date_from as string,
        date_to: params.date_to as string,
      }),
    enabled:
      (options?.enabled ?? true) && !!params.date_from && !!params.date_to,
  });
}

export function useInvoiceRegisterSummary() {
  return useQuery({
    queryKey: K.summary(),
    queryFn: fetchInvoiceRegisterSummary,
  });
}

/** Ask to delete an invoice — it waits for approval (2026-11-14), so the
 *  invoice stays as it is; only the pending-request queries refresh. */
export function useRequestInvoiceDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      requestInvoiceDelete(invoiceId, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rentalKeys.actionRequests.lists() });
      toast.success(S.invoiceDeleteRequested);
    },
    // The reason dialog stays open on failure and shows nothing itself.
    onError: notifyMutationError,
  });
}

/** After an invoice deletion is APPROVED: the void hands the period back,
 *  so the orders' billing and the units' anchors move, and its credit notes
 *  leave the register. */
export function invalidateDeletedInvoice(qc: QueryClient, invoiceId: string) {
  const invoice = qc.getQueryData<RentalInvoiceDetail>(K.detail(invoiceId));
  void qc.invalidateQueries({ queryKey: K.detail(invoiceId) });
  invalidateInvoices(qc, invoice?.sales_order_ids);
  if (!invoice) {
    void qc.invalidateQueries({ queryKey: rentalKeys.salesOrders.details() });
    void qc.invalidateQueries({ queryKey: rentalKeys.salesOrders.lists() });
  }
  invalidateCreditNotes(qc, invoiceId);
  invalidateDevices(qc);
}
