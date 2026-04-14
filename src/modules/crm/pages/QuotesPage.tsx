import { Plus } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"

import { quotes } from "@/modules/crm/data/quotes"

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const statusVariant: Record<string, StatusBadgeVariant> = {
  Draft: "neutral",
  Sent: "info",
  Accepted: "success",
  Rejected: "red-cell",
  Expired: "error",
}

const quotesTab: TabConfig = {
  id: "quotes",
  label: "All Quotes",
  columns: [
    { key: "quoteNumber", label: "Quote #", sortable: true },
    { key: "accountName", label: "Account", sortable: true },
    { key: "total", label: "Total", sortable: true, align: "right" },
    { key: "status", label: "Status", sortable: true },
    { key: "validUntil", label: "Valid Until", sortable: true },
  ],
  data: quotes.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    accountName: q.accountName,
    total: q.total,
    status: q.status,
    validUntil: q.validUntil,
  })),
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "quoteNumber" && typeof value === "string") {
    return {
      display: <Link to={`/crm/quotes/${row["id"]}/edit`} className="text-primary hover:underline font-medium">{value}</Link>,
    }
  }
  if (key === "total" && typeof value === "number") {
    return { display: formatCurrency(value) }
  }
  if (key === "status" && typeof value === "string") {
    const variant = statusVariant[value] ?? "neutral"
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  // Row-level styling
  const status = row["status"]
  if (status === "Rejected" || status === "Expired") {
    return { className: "text-destructive" }
  }
  if (status === "Accepted") {
    return { className: "text-status-success-text" }
  }
  return null
}

function QuotesPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Quotes</h2>
        <Button onClick={() => navigate("/crm/quotes/new")}>
          <Plus className="mr-1 size-4" />
          Create Quote
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[quotesTab]}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default QuotesPage
