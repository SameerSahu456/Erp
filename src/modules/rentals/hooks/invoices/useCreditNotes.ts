import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createCreditNote,
  fetchCreditNote,
  fetchCreditNoteRegister,
  fetchCreditNotes,
  type CreditNotePayload,
  type CreditNoteRegisterParams,
} from "../../api/credit-notes";
import { INVOICES_HOOKS_STRINGS as S } from "./invoices-hooks.strings";
import { invalidateCreditNotes } from "../shared/invalidate";
import { rentalKeys } from "../shared/keys";

export function useCreditNotes(
  invoiceId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: rentalKeys.invoices.creditNotes(invoiceId),
    queryFn: () => fetchCreditNotes(invoiceId as string),
    enabled: !!invoiceId && (options?.enabled ?? true),
  });
}

export function useCreateCreditNote(invoiceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreditNotePayload) =>
      createCreditNote(invoiceId as string, payload),
    onSuccess: () => {
      invalidateCreditNotes(qc, invoiceId as string);
      // The invoice stands; the deal's realised value (list column) moves.
      void qc.invalidateQueries({ queryKey: rentalKeys.salesOrders.lists() });
      toast.success(S.creditNoteRecorded);
    },
  });
}

/** One credit note, for its own page. */
export function useCreditNote(creditNoteId: string | null | undefined) {
  return useQuery({
    queryKey: rentalKeys.creditNoteRegister.detail(creditNoteId ?? ""),
    queryFn: () => fetchCreditNote(creditNoteId as string),
    enabled: !!creditNoteId,
  });
}

export function useCreditNoteRegister(
  params: CreditNoteRegisterParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: rentalKeys.creditNoteRegister.list(params),
    queryFn: () => fetchCreditNoteRegister(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
