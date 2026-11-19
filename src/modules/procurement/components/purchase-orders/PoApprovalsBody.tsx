import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardCheck } from "lucide-react"

import { BusinessMetricsTable } from "@/components/common/tables/BusinessMetricsTable"
import type { CellFormatter, TabConfig } from "@/components/common/tables/BusinessMetricsTable"
import { StatsRow } from "@/components/common/display/StatsRow"
import { ListPageShell } from "@/components/page-shells"
import { formatINR } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import { PURCHASE_ORDER_PAGE_SIZE } from "../../constants"
import { useMyPoApprovals } from "../../hooks/purchase-orders/usePurchaseOrders"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

const APPR_S = PURCHASE_ORDERS_STRINGS.approvals

export function PoApprovalsBody() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const { data, isError, isFetching, refetch } = useMyPoApprovals({
    page,
    page_size: PURCHASE_ORDER_PAGE_SIZE,
  })
  const total = data?.total ?? 0
  const items = data?.items ?? []

  const tab: TabConfig = {
    id: "po-approvals",
    label: APPR_S.awaitingLabel,
    columns: [
      { key: "po_number", label: APPR_S.columns.poNumber, width: "200px" },
      { key: "supplier", label: APPR_S.columns.supplier, width: "240px" },
      { key: "my_pending_line_count", label: APPR_S.columns.myPendingLines, align: "right" as const },
      { key: "grand_total", label: APPR_S.columns.total, align: "right" as const, width: "160px" },
      { key: "submitted_at", label: APPR_S.columns.submitted, width: "160px" },
    ],
    data: items.map((it) => ({
      id: it.id,
      po_number: it.po_number,
      supplier: it.supplier?.name ?? "—",
      my_pending_line_count: it.my_pending_line_count,
      grand_total: it.grand_total,
      submitted_at: it.submitted_at ?? "—",
    })),
  }

  const cellFormatter: CellFormatter = (value, key) => {
    if (key === "grand_total" && typeof value === "string") {
      return { display: formatINR(Number(value)) }
    }
    if (key === "submitted_at" && typeof value === "string" && value && value !== "—") {
      return {
        display: <span className="text-muted-foreground">{formatIST_date(value)}</span>,
      }
    }
    return null
  }

  return (
    <ListPageShell
      title={APPR_S.title}
      subtitle={APPR_S.subtitle}
      stats={
        <StatsRow
          stats={[
            {
              label: APPR_S.awaitingLabel,
              value: total,
              icon: ClipboardCheck,
              accent: "warning" as const,
            },
          ]}
        />
      }
    >
      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
        pageSize={PURCHASE_ORDER_PAGE_SIZE}
        searchable={false}
        persistKey="procurement-po-approvals"
        onRowClick={(row) => navigate(`/procurement/po/approvals/${row.id}`)}
        serverPagination={{
          page,
          pageSize: PURCHASE_ORDER_PAGE_SIZE,
          total,
          isFetching,
          onPageChange: setPage,
        }}
        // Loading is handled by BMT via serverPagination.isFetching. A first-load
        // failure surfaces as the table's own error slot (title + Retry).
        error={
          isError
            ? {
                title: PURCHASE_ORDERS_STRINGS.approvals.error.title,
                description: PURCHASE_ORDERS_STRINGS.approvals.error.description,
                onRetry: () => void refetch(),
              }
            : undefined
        }
        emptyState={{
          title: APPR_S.empty.title,
          description: APPR_S.empty.description,
        }}
      />
    </ListPageShell>
  )
}
