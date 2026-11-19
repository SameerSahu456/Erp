import { FileText } from "lucide-react"

import { LinkedDocCard } from "./SoDetailPrimitives"
import type { SalesOrderWire } from "../../../api"
import type { SalesOrderDetailController } from "../../../hooks/sales-orders/useSalesOrderDetail"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function SoLinkedDocs({
  so,
  detail,
}: {
  so: SalesOrderWire
  detail: SalesOrderDetailController
}) {
  // Only shows the Quote link card today; Purchase Request / Work Order /
  // Dispatch tiles will slot in here when those backends ship.
  if (!so.sales_quote_id) return null

  const { linkedQuoteQuery } = detail

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <LinkedDocCard
        label={S.detail.linkedDocs.quote}
        value={
          linkedQuoteQuery.data?.quote_number ??
          (linkedQuoteQuery.isLoading ? S.detail.linkedDocs.quoteLoading : S.detail.linkedDocs.openQuote)
        }
        href={`/crm/quotes/${so.sales_quote_id}`}
        icon={<FileText className="size-4 text-muted-foreground" />}
      />
    </div>
  )
}
