import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  bringInwardExceptionIntoStock,
  fetchInwardException,
  fetchInwardExceptions,
  linkInwardException,
  markInwardExceptionDelivered,
  returnInwardException,
  voidInwardException,
  type InwardException,
  type InwardExceptionLinkRequest,
  type InwardExceptionListParams,
  type InwardExceptionReturnRequest,
  type InwardExceptionStockRequest,
} from "../../api";
import { inwardErrorMessage } from "../../inwardErrors";
import { INWARD_EXCEPTIONS_STRINGS as S } from "../../components/inward-exceptions/inward-exceptions.strings";
import { wmsKeys } from "../keys";
import { rentalReturnRequestKeys } from "@modules/crm";
import { rentalKeys } from "@modules/rentals";
import { imsKeys } from "@modules/ims";

const K = wmsKeys.inwardExceptions;

export function useInwardExceptions(params: InwardExceptionListParams) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchInwardExceptions(params),
    placeholderData: keepPreviousData,
  });
}

/** Tab badge counts — one slim `page_size: 1` query per bucket. */
export function useInwardExceptionCount(params: InwardExceptionListParams) {
  return useQuery({
    queryKey: K.count(params),
    queryFn: () => fetchInwardExceptions({ ...params, page: 1, page_size: 1 }),
    select: (page) => page.total,
    placeholderData: keepPreviousData,
  });
}

export function useInwardException(id: string | undefined) {
  return useQuery({
    queryKey: K.detail(id ?? ""),
    queryFn: () => fetchInwardException(id as string),
    enabled: !!id,
  });
}

/** One resolution, targeted invalidation (§16.9): this record, the lists
 *  and the counts — a resolution moves it between tabs. */
function useResolution<V>(
  run: (vars: V) => Promise<InwardException>,
  successMessage: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (row) => {
      qc.setQueryData(K.detail(row.id), row);
      void qc.invalidateQueries({ queryKey: K.lists() });
      void qc.invalidateQueries({ queryKey: K.counts() });
      // A link settles a rental unit: its billing, the account's units on
      // rent and the requests that count against them all move.
      void qc.invalidateQueries({ queryKey: rentalReturnRequestKeys.all });
      void qc.invalidateQueries({ queryKey: rentalKeys.devices.all });
      // Linking another customer's unit, or bringing a box into stock,
      // changes the stock counts.
      void qc.invalidateQueries({ queryKey: imsKeys.stock });
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(inwardErrorMessage(e)),
  });
}

export const useLinkInwardException = () =>
  useResolution(
    ({ id, body }: { id: string; body: InwardExceptionLinkRequest }) => linkInwardException(id, body),
    S.toasts.linked,
  );

export const useVoidInwardException = () =>
  useResolution(
    ({ id, notes }: { id: string; notes: string }) => voidInwardException(id, notes),
    S.toasts.voided,
  );

export const useReturnInwardException = () =>
  useResolution(
    ({ id, body }: { id: string; body: InwardExceptionReturnRequest }) => returnInwardException(id, body),
    S.toasts.returning,
  );

export const useBringInwardExceptionIntoStock = () =>
  useResolution(
    ({ id, body }: { id: string; body: InwardExceptionStockRequest }) =>
      bringInwardExceptionIntoStock(id, body),
    S.toasts.stocked,
  );

export const useMarkInwardExceptionDelivered = () =>
  useResolution(
    ({ id, deliveredAt }: { id: string; deliveredAt?: string }) =>
      markInwardExceptionDelivered(id, deliveredAt),
    S.toasts.delivered,
  );
