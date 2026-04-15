import { Plus } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"

import { salesOrders } from "@/modules/crm/data/sales-orders"

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const statusVariant: Record<string, StatusBadgeVariant> = {
  Draft: "warning",
  Confirmed: "info",
  Engineering: "warning",
  "In Assembly": "warning",
  QC: "info",
  "Ready for Dispatch": "success",
  Shipped: "info",
  Delivered: "success",
  Cancelled: "red-cell",
}

const ordersTab: TabConfig = {
  id: "orders",
  label: "All Orders",
  columns: [
    { key: "orderNumber", label: "Order #", sortable: true },
    { key: "accountName", label: "Account", sortable: true },
    { key: "items", label: "Items", sortable: true, align: "right" },
    { key: "total", label: "Total", sortable: true, align: "right" },
    { key: "status", label: "Status", sortable: true },
    { key: "date", label: "Date", sortable: true },
  ],
  data: salesOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    accountName: o.accountName,
    items: o.items,
    total: o.total,
    status: o.status,
    date: o.date,
  })),
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "orderNumber" && typeof value === "string") {
    return {
      display: <Link to={`/crm/sales-orders/${row["id"]}`} className="text-primary hover:underline font-medium">{value}</Link>,
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
  // Row-level styling for cancelled/delivered
  const status = row["status"]
  if (status === "Cancelled") {
    return { className: "text-destructive" }
  }
  if (status === "Delivered") {
    return { className: "text-status-success-text" }
  }
  if (status === "Draft") {
    return { className: "text-status-warning-text" }
  }
  return null
}

function SalesOrdersPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Sales Orders</h2>
        <Button onClick={() => navigate("/crm/sales-orders/new")}>
          <Plus className="mr-1 size-4" />
          Create Order
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[ordersTab]}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default SalesOrdersPage
