import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { formatIST_date } from "@shared/lib/date"

import { useDemoSalesOrders } from "../../hooks/demo-requests/useDemoRequests"
import type { DemoSalesOrderWire } from "../../api/demo-requests"
import { DocList, type DocRow } from "../shared/detail-docs/DocList"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

const SO_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  Draft: "neutral",
  Submitted: "info",
  PartiallyApproved: "warning",
  Approved: "success",
  Rejected: "error",
  Amend: "warning",
  Cancelled: "error",
}

// Read-only list of the sales orders created from this demo (per-serial
// conversions + the linked SO), each linking to its SO detail page.
export function DemoSalesOrdersTab({ demoId }: { demoId: string }) {
  const query = useDemoSalesOrders(demoId)

  const rows: DocRow[] = (query.data ?? []).map((so: DemoSalesOrderWire) => ({
    id: so.id,
    number: so.order_number,
    status: so.status,
    statusVariant: SO_STATUS_VARIANT[so.status] ?? "neutral",
    units: `${so.items_count} ${S.detail.docTabs.items}`,
    date: formatIST_date(so.created_at),
    href: `/crm/sales-orders/${so.id}`,
  }))

  return (
    <DocList
      rows={rows}
      isLoading={query.isLoading}
      isError={query.isError}
      emptyText={S.detail.docTabs.noSalesOrders}
    />
  )
}
