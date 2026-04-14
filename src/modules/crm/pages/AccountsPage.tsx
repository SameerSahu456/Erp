import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"

import { accounts } from "@/modules/crm/data/accounts"

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const statusVariant: Record<string, StatusBadgeVariant> = {
  Active: "success",
  Inactive: "error",
  Prospect: "info",
}

const accountsTab: TabConfig = {
  id: "accounts",
  label: "All Accounts",
  columns: [
    { key: "name", label: "Name", sortable: true },
    { key: "industry", label: "Industry", sortable: true },
    { key: "type", label: "Type", sortable: true },
    { key: "revenue", label: "Revenue", sortable: true, align: "right" },
    { key: "owner", label: "Owner", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "city", label: "City", sortable: true },
  ],
  data: accounts.map((a) => ({
    name: a.name,
    industry: a.industry,
    type: a.type,
    revenue: a.revenue,
    owner: a.owner,
    status: a.status,
    city: a.city,
  })),
}

const cellFormatter: CellFormatter = (value, key) => {
  if (key === "revenue" && typeof value === "number") {
    return { display: formatCurrency(value) }
  }
  if (key === "status" && typeof value === "string") {
    const variant = statusVariant[value] ?? "neutral"
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  return null
}

function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Accounts</h2>
        <Button>
          <Plus className="mr-1 size-4" />
          Add Account
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[accountsTab]}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default AccountsPage
