import { usePendingActionRequest } from "../../hooks/approvals/useActionRequests"
import { PendingActionBanner } from "./PendingActionBanner"

/** An order's termination request still waiting for approval, if any. */
export function PendingTerminationBanner({ salesOrderId }: { salesOrderId: string | null }) {
  const request = usePendingActionRequest({
    subject: "terminate",
    sales_order_id: salesOrderId ?? undefined,
  })
  return <PendingActionBanner request={request} />
}
