import { useSalesOrder } from "@modules/crm";

import { useRentalInvoices } from "../invoices/useRentalInvoices";
import { useRentalSalesOrderBilling } from "./useAgreement";

/** Rows the detail page previews per list; the full lists are linked. */
export const AGREEMENT_PREVIEW_ROWS = 5;

/** The agreement page's data: the one billing payload the Overview reads
 *  (shared with the CRM card), the order for its number / status, and the
 *  invoice preview (its total is the tab badge). Units load in their tab. */
export function useRentalAgreementDetail(salesOrderId: string | null) {
  const billing = useRentalSalesOrderBilling(salesOrderId);
  const order = useSalesOrder(salesOrderId);
  const invoices = useRentalInvoices(
    { sales_order_id: salesOrderId ?? undefined, page_size: AGREEMENT_PREVIEW_ROWS },
    { enabled: !!salesOrderId },
  );
  return { billing, order: order.data, invoices };
}
