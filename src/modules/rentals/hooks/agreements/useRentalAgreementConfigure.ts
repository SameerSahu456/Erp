import { useAccount, useSalesOrder } from "@modules/crm";

import { useRentalSalesOrderBilling } from "./useAgreement";

/** The Configure page's reads: the billing payload, plus the order and its
 *  account for display (`bypassAccess` — see `crm/index.ts`). */
export function useRentalAgreementConfigure(salesOrderId: string | null) {
  const billing = useRentalSalesOrderBilling(salesOrderId);
  const order = useSalesOrder(salesOrderId).data;
  const account = useAccount(order?.account_id, { bypassAccess: true }).data;
  return {
    billing,
    orderNumber: order?.order_number ?? null,
    // The agreement's own account first; the order's until one is configured.
    accountId: billing.data?.config?.account_id ?? order?.account_id ?? null,
    accountName: account?.name ?? null,
    orderCreatedAt: order?.created_at ?? null,
  };
}
