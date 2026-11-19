import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@/shared/api/notify-mutation-error";

import {
  fetchLineRateTargets,
  fetchRentalSalesOrderExtendBounds,
  fetchRentalSalesOrderFacets,
  fetchRentalSalesOrders,
  generateFirstInvoice,
  type FetchRentalSalesOrdersParams,
} from "../../api/sales-orders";
import { AGREEMENTS_HOOKS_STRINGS as S } from "./agreements-hooks.strings";
import { invalidateDevices, invalidateInvoices } from "../shared/invalidate";
import { rentalKeys } from "../shared/keys";

const K = rentalKeys.salesOrders;

// Server-paginated (§16.7): the page lives in the caller's state.
export function useRentalSalesOrders(
  params: FetchRentalSalesOrdersParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchRentalSalesOrders(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** Filter choices for the list's dropdowns — paging must not refetch them. */
export function useRentalSalesOrderFacets() {
  return useQuery({
    queryKey: rentalKeys.salesOrderFacets,
    queryFn: fetchRentalSalesOrderFacets,
  });
}

/** The units each line would reprice, and what they charge today — only the
 *  server can see past the first page of units. */
export function useRentalSalesOrderLineRateTargets(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.rateTargets(salesOrderId),
    queryFn: () => fetchLineRateTargets(salesOrderId as string),
    enabled: !!salesOrderId && (options?.enabled ?? true),
  });
}

/** Fetched only while the extend dialog is open (no lookup per list row). */
export function useRentalSalesOrderExtendBounds(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.extendBounds(salesOrderId),
    queryFn: () => fetchRentalSalesOrderExtendBounds(salesOrderId as string),
    enabled: Boolean(salesOrderId) && (options?.enabled ?? true),
  });
}

/** "Generate 1st Invoice" — the one-time pro-rata stub. Success reads two
 *  ways: raised, or nothing to bill yet. */
export function useGenerateFirstInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (salesOrderId: string) => generateFirstInvoice(salesOrderId),
    onSuccess: (invoice, salesOrderId) => {
      invalidateInvoices(qc, [salesOrderId]);
      // The units' billing anchors moved.
      invalidateDevices(qc);
      if (invoice) toast.success(S.firstInvoiceRaised(invoice.invoice_number));
      else toast.info(S.firstInvoiceNothing);
    },
    onError: notifyMutationError,
  });
}
